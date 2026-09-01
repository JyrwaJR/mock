/**
 * A canned EIS RPC payload. Mirrors the shape the real backend transmits in
 * its encrypted `response` envelope: an optional HTTP status code, message,
 * arbitrary data, and a success flag.
 */
export type RpcResponse = {
  /** HTTP status mirrored from the upstream EIS backend. */
  status_code?: "200" | "400" | "401" | "403" | "404" | "429" | "500";
  /** Human-readable message for the outcome. */
  message?: string;
  /** Arbitrary payload of the response (object or array of objects). */
  data?: Record<string, unknown> | Record<string, unknown>[];
  /** Success indicator. */
  success_flag?: boolean;
};

/**
 * Every EIS RPC function name the mock server can serve. Each member maps to
 * a catalogue of {@link RpcResponse} variants in `api/responses/`.
 */
export type RpcMethod =
  | "employee_login"
  | "get_employee_details"
  | "get_leave_type"
  | "get_leave_reason"
  | "get_employee_leaves"
  | "get_employee_leave_details"
  | "get_announcements"
  | "insert_update_leave"
  | "get_salary_statement"
  | "get_epay_slip_data"
  | "get_epay_slip_details"
  | "get_employee_tax_list"
  | "get_employee_tax_detail";
