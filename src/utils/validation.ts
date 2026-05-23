// ---------------------------------------------------------------------------
// Lightweight validation helpers — avoids pulling in heavy libs while keeping
// validation logic DRY and testable in isolation.
// ---------------------------------------------------------------------------

export interface ValidationError {
  field: string;
  message: string;
}

/** Email format check using a standard RFC-5322-ish pattern. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate signup request body; returns array of errors (empty = valid). */
export function validateSignup(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  if (!body.email || typeof body.email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!isValidEmail(body.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (!body.password || typeof body.password !== 'string' || body.password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
  }

  const validRoles = ['contributor', 'maintainer'];
  if (body.role !== undefined && !validRoles.includes(body.role as string)) {
    errors.push({ field: 'role', message: 'Role must be contributor or maintainer' });
  }

  return errors;
}

/** Validate login request body. */
export function validateLogin(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!body.email || typeof body.email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required' });
  }

  if (!body.password || typeof body.password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  return errors;
}

/** Validate issue creation body. */
export function validateCreateIssue(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (body.title.trim().length > 150) {
    errors.push({ field: 'title', message: 'Title must not exceed 150 characters' });
  }

  if (!body.description || typeof body.description !== 'string') {
    errors.push({ field: 'description', message: 'Description is required' });
  } else if (body.description.trim().length < 20) {
    errors.push({ field: 'description', message: 'Description must be at least 20 characters' });
  }

  const validTypes = ['bug', 'feature_request'];
  if (!body.type || !validTypes.includes(body.type as string)) {
    errors.push({ field: 'type', message: 'Type must be bug or feature_request' });
  }

  return errors;
}

/** Validate issue update body (at least one updatable field required). */
export function validateUpdateIssue(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title cannot be empty' });
    } else if (body.title.trim().length > 150) {
      errors.push({ field: 'title', message: 'Title must not exceed 150 characters' });
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.trim().length < 20) {
      errors.push({ field: 'description', message: 'Description must be at least 20 characters' });
    }
  }

  const validTypes = ['bug', 'feature_request'];
  if (body.type !== undefined && !validTypes.includes(body.type as string)) {
    errors.push({ field: 'type', message: 'Type must be bug or feature_request' });
  }

  // Ensure at least one field was provided
  const updatableFields = ['title', 'description', 'type'];
  const provided = updatableFields.filter((f) => body[f] !== undefined);
  if (provided.length === 0) {
    errors.push({ field: 'body', message: 'At least one field (title, description, type) must be provided' });
  }

  return errors;
}
