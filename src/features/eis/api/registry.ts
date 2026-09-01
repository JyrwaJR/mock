import { MOCK_RESPONSES } from "@/src/features/eis/api/responses";
import { RpcMethod, RpcResponse } from "@/src/features/eis/types";

/**
 * Currently-selected catalogue index per EIS RPC method. Each method's
 * {@link MockResponse} catalogue is an array of canned payloads; editing the
 * index here swaps which response the RPC endpoint serves — the "switchboard"
 * pattern shared by the CPPS mock.
 */
export const CURRENT_MOCK: Record<RpcMethod, number> = {
  employee_login: 0,
  get_employee_details: 0,
  get_employee_leaves: 0,
  get_employee_leave_details: 0,
  get_salary_statement: 0,
  get_leave_reason: 0,
  get_leave_type: 0,
  insert_update_leave: 0,
  get_announcements: 0,
  get_employee_tax_list: 0,
  get_employee_tax_detail: 0,
};

/**
 * Resolves the currently-selected mock response for an EIS RPC method.
 *
 * @param method - The decrypted `functionName` of the incoming RPC call.
 * @returns The selected {@link RpcResponse}, or `undefined` when the method is
 *   not registered or its catalogue index points past the array.
 *
 * @example
 * ```ts
 * const response = resolveVariant("get_employee_details");
 * ```
 */
export function resolveVariant(method: RpcMethod): RpcResponse | undefined {
  return MOCK_RESPONSES[method]?.[CURRENT_MOCK[method] ?? 0];
}
