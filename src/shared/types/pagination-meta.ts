/**
 * @file Project-wide shared TypeScript types and interfaces.
 *
 * These types are referenced by multiple utility modules. Consumers may
 * extend this file with additional project-specific types.
 */

/** Metadata returned alongside paginated query results. */
export interface PaginationMeta {
  /** Current page number (1-indexed). */
  page: number;
  /** Number of records per page. */
  pageSize: number;
  /** Total number of records across all pages. */
  total: number;
  /** Total number of pages. */
  totalPages: number;
  /** Whether there are more records beyond the current page. */
  hasMore: boolean;
}
