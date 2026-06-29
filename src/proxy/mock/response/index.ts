import { EMPLOYEE_LOGIN } from "./employee-login";
import {
  GET_EMPLOYEE_LEAVE_DETAILS,
  GET_EMPLOYEE_LEAVE_DETAILS_DETAILS,
  GET_LEAVES_REASON,
  GET_LEAVES_TYPE,
} from "./leaves";
import { GET_EMPLOYEE_DETAIL } from "./get-employee-details";
import { RpcMethod, RpcResponse } from "./type";
import {
  GET_EMPLOYEE_SALARY_STATEMENTS,
  GET_EMPLOYEE_SALARY_STATEMENTS_DETAILS,
} from "./statement";

export const MOCK_RESPONSES: Record<RpcMethod, RpcResponse[]> = {
  employee_login: EMPLOYEE_LOGIN,
  get_employee_details: GET_EMPLOYEE_DETAIL,
  get_leave_type: GET_LEAVES_TYPE,
  get_leave_reason: GET_LEAVES_REASON,
  get_employee_leaves: GET_EMPLOYEE_LEAVE_DETAILS,
  get_employee_leave_details: GET_EMPLOYEE_LEAVE_DETAILS_DETAILS,
  get_employee_salary_statements: GET_EMPLOYEE_SALARY_STATEMENTS,
  get_employee_salary_statements_details:
    GET_EMPLOYEE_SALARY_STATEMENTS_DETAILS,
};
