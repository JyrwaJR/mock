/**
 * @file Pagination parameter builder for database queries.
 *
 * Computes `skip` and `take` values for Prisma / TypeORM paginated queries
 * based on the current page and the project-wide `PAGE_SIZE` constant.
 */

import { PAGE_SIZE } from '@/src/shared/utils/constants/common';

/** Parameters for a paginated database query. */
export interface PaginationParams {
  /** Number of records to skip (for `OFFSET` / `skip`). */
  skip: number;
  /** Number of records to take (for `LIMIT` / `take`). */
  take: number;
  /** Current page number (1-indexed). */
  page: number;
  /** Number of records per page. */
  pageSize: number;
}

/**
 * Builds pagination parameters for a database query.
 *
 * Clamps the page number to a minimum of 1 and uses the project-wide
 * `PAGE_SIZE` constant for the page size.
 *
 * @param page - Current page number (default `1`).
 * @returns Pagination parameters with `skip`, `take`, `page`, and `pageSize`.
 *
 * @example
 * ```ts
 * buildPaginationParams(3)
 * // { skip: 40, take: 20, page: 3, pageSize: 20 }
 * ```
 */
export function buildPaginationParams(page = 1): PaginationParams {
  const p = Math.max(1, page);
  const pageSize = PAGE_SIZE;
  return {
    skip: (p - 1) * pageSize,
    take: pageSize,
    page: p,
    pageSize,
  };
}
