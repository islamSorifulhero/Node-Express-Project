import { QueryResult, QueryResultRow } from 'pg';
import pool from '../config/database';

// Generic typed wrappers around pool.query() — avoids repeating try/catch
// boilerplate in every module and keeps raw SQL as the only data access layer.

/**
 * Run a parameterised query and return the full QueryResult.
 * Callers can destructure .rows, .rowCount, etc. as needed.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(sql, params);
}

/**
 * Run a query and return the first row, or null if no rows matched.
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T | null> {
  const result = await pool.query<T>(sql, params);
  return result.rows[0] ?? null;
}

/**
 * Run a query and return all rows as an array.
 */
export async function queryMany<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await pool.query<T>(sql, params);
  return result.rows;
}
