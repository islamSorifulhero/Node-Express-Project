import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Typed payload stored inside the JWT
// ---------------------------------------------------------------------------
export interface TokenPayload {
  id: number;
  name: string;
  role: 'contributor' | 'maintainer';
}

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

/** Sign a new token with the user's id, name, and role. */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/** Verify and decode a token; throws if invalid or expired. */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
