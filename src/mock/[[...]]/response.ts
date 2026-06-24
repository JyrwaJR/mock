type RpcResponse = {
  error_code?: string;
  error_msg?: string;
  message?: string;
  data?: Record<string, unknown>;
  status?: number;
};

export const MOCK_RESPONSES: Record<string, RpcResponse[]> = {
  employee_login: [
    {
      status: 200,
      message: "Login successfully",
      data: {
        user_id: 1,
        name: "John Doe",
        refresh_token: "test",
        access_token: "test",
      },
    },
    {
      error_code: "-1",
      error_msg: "Invalid credentials",
    },
    {
      error_code: "02",
      error_msg: "Validation failed",
    },
    {
      error_code: "03",
      error_msg: "User not found",
    },
    {
      error_code: "04",
      error_msg: "Account disabled",
    },
    {
      error_code: "05",
      error_msg: "Account locked",
    },
    {
      error_code: "06",
      error_msg: "Session expired",
    },
    {
      error_code: "07",
      error_msg: "Unauthorized",
    },
    {
      error_code: "08",
      error_msg: "Forbidden",
    },
    {
      error_code: "09",
      error_msg: "Resource not found",
    },
    {
      error_code: "10",
      error_msg: "Duplicate record",
    },
    {
      error_code: "11",
      error_msg: "Rate limit exceeded",
    },
    {
      error_code: "12",
      error_msg: "Database error",
    },
    {
      error_code: "13",
      error_msg: "Server error",
    },
    {
      error_code: "14",
      error_msg: "Service unavailable",
    },
  ],
};
