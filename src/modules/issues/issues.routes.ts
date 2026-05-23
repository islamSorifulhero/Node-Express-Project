import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
} from './issues.controller';

const router = Router();

// GET /api/issues — public
router.get('/', getAllIssues);

// GET /api/issues/:id — public
router.get('/:id', getIssueById);

// POST /api/issues — authenticated (contributor or maintainer)
router.post('/', authenticate, createIssue);

// PATCH /api/issues/:id — authenticated; role check happens inside controller
// because logic depends on ownership, not just role
router.patch('/:id', authenticate, updateIssue);

// DELETE /api/issues/:id — maintainer only
router.delete('/:id', authenticate, requireRole('maintainer'), deleteIssue);

export default router;
