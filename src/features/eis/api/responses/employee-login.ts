import { RpcResponse } from "../../types";

export const EMPLOYEE_LOGIN: RpcResponse[] = [
  {
    success_flag: true,
    status_code: "200",
    message: "Login successfully",
  },
  {
    status_code: "400",
    message: "Invalid credentials",
  },
  {
    status_code: "400",
    message: "Validation failed",
  },
  {
    status_code: "401",
    message: "User not found",
  },
  {
    status_code: "403",
    message: "Account disabled",
  },
  {
    status_code: "403",
    message: "Account locked",
  },
  {
    status_code: "401",
    message: "Session expired",
  },
  {
    status_code: "401",
    message: "Unauthorized",
  },
  {
    status_code: "403",
    message: "Forbidden",
  },
  {
    status_code: "401",
    message: "Resource not found",
  },
  {
    status_code: "403",
    message: "Duplicate record",
  },
  {
    status_code: "429",
    message: "Rate limit exceeded",
  },
  {
    status_code: "500",
    message: "Database error",
  },
  {
    status_code: "500",
    message: "Server error",
  },
  {
    status_code: "404",
    message: "Service unavailable",
  },
];
