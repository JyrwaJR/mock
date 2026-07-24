export type RpcResponse = {
  status_code?: "200" | "400" | "401" | "403" | "404" | "429" | "500";
  message?: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  success_flag?: boolean;
};

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
  | "get_employee_tax_list"
  | "get_employee_tax_detail";
