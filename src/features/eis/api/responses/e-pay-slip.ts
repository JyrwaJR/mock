import { RpcResponse } from "../../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single pay slip list item returned by `get_epay_slip_data`. */
export type EPayslipListItem = {
  /** Employee designation / job title. */
  designation: string;
  /** Government employee number. */
  ge_number: string;
  /** Full name of the employee. */
  name: string;
  /** Date the pay slip was signed. */
  sign_date: string;
  /** Unique pay slip number. */
  payslip_no: string;
};

/** Full pay slip detail returned by `get_epay_slip_details`. */
export type EPayslip = EPayslipListItem & {
  /** Base64-encoded file content of the pay slip PDF. */
  file_data: string;
  /** Unique file identifier. */
  file_id: string;
  /** Date the pay slip was generated. */
  payslip_date: string;
  /** Start date of the pay period. */
  valid_from: string;
  /** End date of the pay period (`null` if current/active slip). */
  valid_to: string | null;
  /** Base64-encoded PDF document (full page). */
  pdf: string;
}

// ---------------------------------------------------------------------------
// Mock data — pay slip list
// ---------------------------------------------------------------------------

const MOCK_PAYSLIPS: EPayslipListItem[] = [
  {
    designation: "Senior Software Engineer",
    ge_number: "GE/ENG/2024-0042",
    name: "Rajesh Kumar",
    sign_date: "01-08-2026",
    payslip_no: "PS-2026-08-00042",
  },
  {
    designation: "Product Manager",
    ge_number: "GE/PM/2023-0107",
    name: "Priya Sharma",
    sign_date: "01-08-2026",
    payslip_no: "PS-2026-08-00107",
  },
  {
    designation: "DevOps Engineer",
    ge_number: "GE/OPS/2024-0089",
    name: "Amit Patel",
    sign_date: "01-08-2026",
    payslip_no: "PS-2026-08-00089",
  },
  {
    designation: "Frontend Developer",
    ge_number: "GE/ENG/2025-0015",
    name: "Sneha Reddy",
    sign_date: "01-08-2026",
    payslip_no: "PS-2026-08-00015",
  },
  {
    designation: "Backend Developer",
    ge_number: "GE/ENG/2024-0056",
    name: "Vikram Singh",
    sign_date: "01-08-2026",
    payslip_no: "PS-2026-08-00056",
  },
];

// ---------------------------------------------------------------------------
// Mock data — pay slip detail (Rajesh Kumar)
// ---------------------------------------------------------------------------

/** Short base64 placeholder — the real payload would be a full PDF. */
const PLACEHOLDER_PDF =
  "JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5vYmoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzMgMCBSCV0KL0NvdW50IDEKPj4KZW5vYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCj4+CmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNAovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKMTc2CiUlJUVORg==";

const MOCK_PAYSLIP_DETAIL: EPayslip = {
  designation: "Senior Software Engineer",
  ge_number: "GE/ENG/2024-0042",
  name: "Rajesh Kumar",
  sign_date: "01-08-2026",
  payslip_no: "PS-2026-08-00042",
  file_data: PLACEHOLDER_PDF,
  file_id: "FILE-2026-08-00042-PDF",
  payslip_date: "31-07-2026",
  valid_from: "01-07-2026",
  valid_to: "31-07-2026",
  pdf: PLACEHOLDER_PDF,
};

// ---------------------------------------------------------------------------
// Exported mock responses
// ---------------------------------------------------------------------------

/**
 * Mock response for `get_epay_slip_data`.
 * Returns an array of pay slip list items for all employees.
 */
export const GET_EPAY_SLIP_DATA: RpcResponse[] = [
  {
    success_flag: true,
    status_code: "200",
    message: "Pay slip data fetched successfully",
    data: MOCK_PAYSLIPS,
  },
];

/**
 * Mock response for `get_epay_slip_details`.
 * Returns the full pay slip detail for a specific employee.
 * The mock responds with Rajesh Kumar's pay slip by default.
 */
export const GET_EPAY_SLIP_DETAILS: RpcResponse[] = [
  {
    success_flag: true,
    status_code: "200",
    message: "Pay slip detail fetched successfully",
    data: MOCK_PAYSLIP_DETAIL,
  },
];
