import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { queryOne } from '../../utils/db';
import { sendSuccess, sendError } from '../../utils/response';
import { signToken } from '../../utils/jwt';
import { validateSignup, validateLogin } from '../../utils/validation';

// Row shapes returned from raw SQL queries
interface UserRow {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'contributor' | 'maintainer';
  created_at: string;
  updated_at: string;
}

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10);

// POST /api/auth/signup
export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;

    // Validate input
    const errors = validateSignup(body);
    if (errors.length > 0) {
      sendError(res, 'Validation failed', StatusCodes.BAD_REQUEST, errors);
      return;
    }

    const { name, email, password, role = 'contributor' } = body as {
      name: string;
      email: string;
      password: string;
      role?: string;
    };

    // Check for duplicate email
    const existing = await queryOne<UserRow>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()],
    );
    if (existing) {
      sendError(res, 'Email already registered', StatusCodes.BAD_REQUEST);
      return;
    }

    // Hash password — salt rounds between 8 and 12 per spec
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert and return new user (excluding password)
    const user = await queryOne<Omit<UserRow, 'password'>>(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at, updated_at`,
      [name.trim(), email.toLowerCase(), hashed, role],
    );

    sendSuccess(res, user, 'User registered successfully', StatusCodes.CREATED);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;

    const errors = validateLogin(body);
    if (errors.length > 0) {
      sendError(res, 'Validation failed', StatusCodes.BAD_REQUEST, errors);
      return;
    }

    const { email, password } = body as { email: string; password: string };

    // Fetch user including hashed password for comparison
    const user = await queryOne<UserRow>(
      'SELECT id, name, email, password, role, created_at, updated_at FROM users WHERE email = $1',
      [email.toLowerCase()],
    );

    if (!user) {
      sendError(res, 'Invalid email or password', StatusCodes.UNAUTHORIZED);
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      sendError(res, 'Invalid email or password', StatusCodes.UNAUTHORIZED);
      return;
    }

    // Sign JWT — embed id, name, role so middleware can authorise without DB hit
    const token = signToken({ id: user.id, name: user.name, role: user.role });

    // Never expose the password field in responses
    const { password: _omit, ...safeUser } = user;

    sendSuccess(res, { token, user: safeUser }, 'Login successful');
  } catch (err) {
    next(err);
  }
}
