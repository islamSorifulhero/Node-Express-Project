import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { queryMany, queryOne, query } from '../../utils/db';
import { sendSuccess, sendSuccessNoData, sendError } from '../../utils/response';
import { validateCreateIssue, validateUpdateIssue } from '../../utils/validation';

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------
interface IssueRow {
  id: number;
  title: string;
  description: string;
  type: 'bug' | 'feature_request';
  status: 'open' | 'in_progress' | 'resolved';
  reporter_id: number;
  created_at: string;
  updated_at: string;
}

interface ReporterRow {
  id: number;
  name: string;
  role: 'contributor' | 'maintainer';
}

interface IssueWithReporter extends Omit<IssueRow, 'reporter_id'> {
  reporter: ReporterRow;
}

// ---------------------------------------------------------------------------
// Helper — fetch reporter details for one or many issues (no JOINs per spec)
// Uses a single WHERE id IN (...) batch query to minimise round-trips.
// ---------------------------------------------------------------------------
async function attachReporters(issues: IssueRow[]): Promise<IssueWithReporter[]> {
  if (issues.length === 0) return [];

  // Collect distinct reporter IDs
  const reporterIds = [...new Set(issues.map((i) => i.reporter_id))];

  // Build parameterised IN clause: ($1, $2, ...)
  const placeholders = reporterIds.map((_, idx) => `$${idx + 1}`).join(', ');
  const reporters = await queryMany<ReporterRow>(
    `SELECT id, name, role FROM users WHERE id IN (${placeholders})`,
    reporterIds,
  );

  // Map reporter id → reporter object for O(1) lookup
  const reporterMap = new Map<number, ReporterRow>(reporters.map((r) => [r.id, r]));

  return issues.map(({ reporter_id, ...rest }) => ({
    ...rest,
    reporter: reporterMap.get(reporter_id) ?? { id: reporter_id, name: 'Unknown', role: 'contributor' },
  }));
}

// ---------------------------------------------------------------------------
// POST /api/issues
// ---------------------------------------------------------------------------
export async function createIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;

    const errors = validateCreateIssue(body);
    if (errors.length > 0) {
      sendError(res, 'Validation failed', StatusCodes.BAD_REQUEST, errors);
      return;
    }

    const { title, description, type } = body as {
      title: string;
      description: string;
      type: string;
    };

    // reporter_id extracted from decoded JWT — never from request body
    const reporterId = (req as Request & { user: { id: number; role: string; name: string } }).user.id;

    const issue = await queryOne<IssueRow>(
      `INSERT INTO issues (title, description, type, reporter_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, type, status, reporter_id, created_at, updated_at`,
      [title.trim(), description.trim(), type, reporterId],
    );

    sendSuccess(res, issue, 'Issue created successfully', StatusCodes.CREATED);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/issues
// Supports: ?sort=newest|oldest  ?type=bug|feature_request  ?status=open|...
// ---------------------------------------------------------------------------
export async function getAllIssues(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sort = 'newest', type, status } = req.query as Record<string, string | undefined>;

    // Build WHERE conditions dynamically without an ORM
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (type) {
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = sort === 'oldest' ? 'ORDER BY created_at ASC' : 'ORDER BY created_at DESC';

    const issues = await queryMany<IssueRow>(
      `SELECT id, title, description, type, status, reporter_id, created_at, updated_at
       FROM issues
       ${whereClause}
       ${orderClause}`,
      params,
    );

    const issuesWithReporters = await attachReporters(issues);
    sendSuccess(res, issuesWithReporters, 'Issues retrieved successfully');
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/issues/:id
// ---------------------------------------------------------------------------
export async function getIssueById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const issue = await queryOne<IssueRow>(
      'SELECT id, title, description, type, status, reporter_id, created_at, updated_at FROM issues WHERE id = $1',
      [id],
    );

    if (!issue) {
      sendError(res, 'Issue not found', StatusCodes.NOT_FOUND);
      return;
    }

    const [issueWithReporter] = await attachReporters([issue]);
    sendSuccess(res, issueWithReporter, 'Issue retrieved successfully');
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/issues/:id
// Access: Maintainer (any issue) OR Contributor (own issue, only if status is open)
// ---------------------------------------------------------------------------
export async function updateIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const user = (req as Request & { user: { id: number; role: 'contributor' | 'maintainer'; name: string } }).user;

    const errors = validateUpdateIssue(body);
    if (errors.length > 0) {
      sendError(res, 'Validation failed', StatusCodes.BAD_REQUEST, errors);
      return;
    }

    // Fetch existing issue first (no JOINs per spec)
    const existing = await queryOne<IssueRow>(
      'SELECT id, title, description, type, status, reporter_id, created_at, updated_at FROM issues WHERE id = $1',
      [id],
    );

    if (!existing) {
      sendError(res, 'Issue not found', StatusCodes.NOT_FOUND);
      return;
    }

    // Role-based access checks
    if (user.role === 'contributor') {
      // Contributors may only edit their own issues
      if (existing.reporter_id !== user.id) {
        sendError(res, 'Forbidden. You can only edit your own issues.', StatusCodes.FORBIDDEN);
        return;
      }
      // Contributors cannot edit issues that are no longer open
      if (existing.status !== 'open') {
        sendError(
          res,
          'Conflict. Contributors can only edit issues with status "open".',
          StatusCodes.CONFLICT,
        );
        return;
      }
    }
    // Maintainers can update any issue field without restriction

    // Build dynamic SET clause — only update provided fields
    const updates: string[] = [];
    const params: unknown[] = [];

    const { title, description, type } = body as {
      title?: string;
      description?: string;
      type?: string;
    };

    if (title !== undefined) {
      params.push(title.trim());
      updates.push(`title = $${params.length}`);
    }
    if (description !== undefined) {
      params.push(description.trim());
      updates.push(`description = $${params.length}`);
    }
    if (type !== undefined) {
      params.push(type);
      updates.push(`type = $${params.length}`);
    }

    // Always refresh updated_at
    updates.push(`updated_at = NOW()`);

    params.push(id);
    const updated = await queryOne<IssueRow>(
      `UPDATE issues SET ${updates.join(', ')} WHERE id = $${params.length}
       RETURNING id, title, description, type, status, reporter_id, created_at, updated_at`,
      params,
    );

    sendSuccess(res, updated, 'Issue updated successfully');
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/issues/:id   — Maintainer only
// ---------------------------------------------------------------------------
export async function deleteIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM issues WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      sendError(res, 'Issue not found', StatusCodes.NOT_FOUND);
      return;
    }

    sendSuccessNoData(res, 'Issue deleted successfully');
  } catch (err) {
    next(err);
  }
}
