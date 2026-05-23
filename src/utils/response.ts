import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

// ---------------------------------------------------------------------------
// Typed response shapes
// ---------------------------------------------------------------------------

interface SuccessPayload<T> {
  success: true;
  message: string;
  data: T;
}

interface SuccessNoData {
  success: true;
  message: string;
}

interface ErrorPayload {
  success: false;
  message: string;
  errors?: unknown;
}

// ---------------------------------------------------------------------------
// Helpers — keep controllers concise and consistent
// ---------------------------------------------------------------------------

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode: number = StatusCodes.OK,
): void {
  const body: SuccessPayload<T> = { success: true, message, data };
  res.status(statusCode).json(body);
}

export function sendSuccessNoData(
  res: Response,
  message = 'Success',
  statusCode: number = StatusCodes.OK,
): void {
  const body: SuccessNoData = { success: true, message };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
  errors?: unknown,
): void {
  const body: ErrorPayload = { success: false, message };
  if (errors !== undefined) body.errors = errors;
  res.status(statusCode).json(body);
}
