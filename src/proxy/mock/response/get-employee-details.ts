import { RpcResponse } from "./type";

export const GET_EMPLOYEE_DETAIL: RpcResponse[] = [
  {
    success_flag: true,
    message: "Login successfully",
    data: {
      emp_cd: "2026200215R",
      emp_fname: "John",
      emp_mname: "Middle",
      emp_lname: "Doe",
      emp_birth_dt: "test",
      emp_sex: "M",
    },
  },
  {
    success_flag: false,
    message: "Employee Not Found",
    status_code: "404",
  },
  {
    success_flag: false,
    message: "Unauthorized",
    status_code: "401",
  },
];
