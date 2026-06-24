/**
 * @file Pagination metadata builder.
 *
 * Computes pagination metadata (total pages, has more) from a total count
 * and current page, using an optional or default page size.
 */

import { PAGE_SIZE } from '@/src/shared/utils/constants/common';
import type { PaginationMeta } from '@/src/shared/types/pagination-meta';

/**
 * Builds pagination metadata from a total count and current page.
 *
 * Calculates `totalPages` and `hasMore` based on the total records and
 * the page size (defaults to the project-wide `PAGE_SIZE` constant).
 *
 * @param total    - Total number of records.
 * @param page     - Current page number (1-indexed).
 * @param pageSize - Records per page (defaults to `PAGE_SIZE`).
 * @returns Pagination metadata object.
 *
 * @example
 * ```ts
 * buildPagination(50, 1, 20)
 * // { page: 1, pageSize: 20, total: 50, totalPages: 3, hasMore: true }
 * ```
 */
export const buildPagination = (total: number, page: number, pageSize?: number): PaginationMeta => {
  const size = pageSize || PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / size));

  return {
    page,
    pageSize: size,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
};
