import { RpcResponse } from "../../types";

/**
 * Tax regime options under Indian income tax.
 * - `NEW`: New tax regime (lower rates, fewer exemptions)
 * - `OLD`: Old tax regime (higher rates, more exemptions/deductions)
 */
export type TaxRegime = "NEW" | "OLD";

/**
 * Filing status for an employee's tax return.
 * - `NOT_FILED`: Return has not been filed yet
 * - `FILED`: Return has been submitted
 * - `PROCESSED`: Return has been processed by the IT department
 */
export type FilingStatus = "NOT_FILED" | "FILED" | "PROCESSED";

/**
 * Breakdown of taxable income across a specific income-tax slab.
 * Each slab has a min/max income range, a rate, the portion of income
 * falling in that slab, and the resulting tax at that slab rate.
 */
export type TaxSlabBreakdown = {
  /** Human-readable label for the slab (e.g., "Up to ₹3,00,000"). */
  label: string;
  /** Lower bound of the slab (inclusive). */
  minIncome: number;
  /** Upper bound of the slab (exclusive) — `null` for the top-most slab. */
  maxIncome: number | null;
  /** Tax rate applicable for this slab (as a percentage, e.g., 5 for 5%). */
  rate: number;
  /** Amount of income taxable within this slab. */
  taxableAmount: number;
  /** Tax computed for this slab. */
  taxAtSlab: number;
};

/**
 * Full tax detail record for a single employee in a financial year.
 * Includes gross income, deductions, slab-wise breakdown, and final
 * tax liability after rebate, surcharge, and cess.
 */
export type EmployeeTaxDetail = {
  /** Unique identifier for this tax record. */
  id: string;
  /** Employee identifier (e.g., "EMP001"). */
  employeeId: string;
  /** Financial year string (e.g., "2025-2026"). */
  financialYear: string;
  /** Full name of the employee. */
  employeeName: string;
  /** Designation / job title. */
  designation: string;
  /** Permanent Account Number (PAN). */
  panNumber: string;
  /** Department the employee belongs to. */
  department: string;
  /** Gross annual income before any deductions. */
  grossAnnualIncome: number;
  /** Standard deduction amount (typically ₹50,000). */
  standardDeduction: number;
  /** Taxable income after all deductions and exemptions. */
  taxableIncome: number;
  /** Tax regime selected — `NEW` or `OLD`. */
  regime: TaxRegime;
  /** Slab-wise breakdown of how taxable income maps to tax. */
  slabBreakdown: TaxSlabBreakdown[];
  /** Base tax computed from slab rates (before rebate/surcharge/cess). */
  baseTax: number;
  /** Rebate under Section 87A (if applicable). */
  rebate87A: number;
  /** Surcharge on base tax (if applicable). */
  surcharge: number;
  /** Health & education cess (4% of base tax + surcharge). */
  cess: number;
  /** Total tax liability after rebate, surcharge, and cess. */
  totalTax: number;
  /** Effective tax rate as a percentage of gross income. */
  effectiveTaxRate: number;
  /** TDS already deducted during the year. */
  tdsDeducted: number;
  /** Tax already paid (advance tax / self-assessment). */
  taxPaid: number;
  /** Remaining tax payable (totalTax - taxPaid). */
  taxPayable: number;
  /** Deductions under Section 80C (PPF, ELSS, life insurance, etc.). */
  deductions80C: number;
  /** Deductions under Section 80D (health insurance premiums). */
  deductions80D: number;
  /** HRA exemption claimed. */
  hraExemption: number;
  /** LTA exemption claimed. */
  ltaExemption: number;
  /** Home loan interest deduction under Section 24(b). */
  homeLoanInterest: number;
  /** NPS contribution under Section 80CCD(1B). */
  npsContribution: number;
  /** Current filing status. */
  filingStatus: FilingStatus;
  /** Date the return was filed (`null` if not yet filed). */
  filedDate: string | null;
  /** Timestamp when this record was created. */
  createdAt: string;
  /** Timestamp when this record was last updated. */
  updatedAt: string;
};

/**
 * Summary view of an employee's tax data, used in list endpoints.
 * Contains the most important fields for quick scanning.
 */
export type EmployeeTaxSummary = {
  /** Employee identifier. */
  employeeId: string;
  /** Full name of the employee. */
  employeeName: string;
  /** Designation / job title. */
  designation: string;
  /** Permanent Account Number (PAN). */
  panNumber: string;
  /** Gross annual income before deductions. */
  grossAnnualIncome: number;
  /** Total tax liability for the year. */
  totalTax: number;
  /** Financial year string (e.g., "2025-2026"). */
  financialYear: string;
  /** Tax regime selected. */
  regime: TaxRegime;
  /** Current filing status. */
  filingStatus: FilingStatus;
};

/**
 * Payload for updating an employee's tax declaration.
 * Allows the employee to choose a regime and provide deduction/exemption values.
 */
export type UpdateTaxPayload = {
  /** Tax regime to apply — `NEW` or `OLD`. */
  regime: TaxRegime;
  /** Deductions under Section 80C (PPF, ELSS, life insurance, etc.). */
  deductions80C: number;
  /** Deductions under Section 80D (health insurance premiums). */
  deductions80D: number;
  /** HRA exemption claimed. */
  hraExemption: number;
  /** LTA exemption claimed. */
  ltaExemption: number;
  /** Home loan interest deduction under Section 24(b). */
  homeLoanInterest: number;
  /** NPS contribution under Section 80CCD(1B). */
  npsContribution: number;
};

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

/** Creates a slab breakdown for the old tax regime. */
const OLD_REGIME_SLABS: TaxSlabBreakdown[] = [
  {
    label: "Up to ₹2,50,000",
    minIncome: 0,
    maxIncome: 250000,
    rate: 0,
    taxableAmount: 250000,
    taxAtSlab: 0,
  },
  {
    label: "₹2,50,001 – ₹5,00,000",
    minIncome: 250001,
    maxIncome: 500000,
    rate: 5,
    taxableAmount: 250000,
    taxAtSlab: 12500,
  },
  {
    label: "₹5,00,001 – ₹10,00,000",
    minIncome: 500001,
    maxIncome: 1000000,
    rate: 20,
    taxableAmount: 500000,
    taxAtSlab: 100000,
  },
  {
    label: "Above ₹10,00,000",
    minIncome: 1000001,
    maxIncome: null,
    rate: 30,
    taxableAmount: 142500,
    taxAtSlab: 42750,
  },
];

// ---------------------------------------------------------------------------
// Mock data — list of all employees' tax summaries
// ---------------------------------------------------------------------------

const MOCK_TAX_SUMMARIES: EmployeeTaxSummary[] = [
  {
    employeeId: "EMP001",
    employeeName: "Rajesh Kumar",
    designation: "Senior Software Engineer",
    panNumber: "ABCDE1234F",
    grossAnnualIncome: 1282500,
    totalTax: 145620,
    financialYear: "2025-2026",
    regime: "OLD",
    filingStatus: "FILED",
  },
  {
    employeeId: "EMP002",
    employeeName: "Priya Sharma",
    designation: "Product Manager",
    panNumber: "FGHIJ5678K",
    grossAnnualIncome: 1800000,
    totalTax: 289400,
    financialYear: "2025-2026",
    regime: "NEW",
    filingStatus: "PROCESSED",
  },
  {
    employeeId: "EMP003",
    employeeName: "Amit Patel",
    designation: "DevOps Engineer",
    panNumber: "KLMNO9012P",
    grossAnnualIncome: 960000,
    totalTax: 78000,
    financialYear: "2025-2026",
    regime: "NEW",
    filingStatus: "NOT_FILED",
  },
  {
    employeeId: "EMP004",
    employeeName: "Sneha Reddy",
    designation: "Frontend Developer",
    panNumber: "PQRST3456U",
    grossAnnualIncome: 720000,
    totalTax: 41600,
    financialYear: "2025-2026",
    regime: "OLD",
    filingStatus: "FILED",
  },
  {
    employeeId: "EMP005",
    employeeName: "Vikram Singh",
    designation: "Backend Developer",
    panNumber: "UVWXY7890Z",
    grossAnnualIncome: 1100000,
    totalTax: 101400,
    financialYear: "2025-2026",
    regime: "NEW",
    filingStatus: "NOT_FILED",
  },
];

// ---------------------------------------------------------------------------
// Mock data — full detail for employee EMP001 (old regime)
// ---------------------------------------------------------------------------

const MOCK_TAX_DETAIL_OLD: EmployeeTaxDetail = {
  id: "tax_emp001_fy2526",
  employeeId: "EMP001",
  financialYear: "2025-2026",
  employeeName: "Rajesh Kumar",
  designation: "Senior Software Engineer",
  panNumber: "ABCDE1234F",
  department: "Engineering",
  grossAnnualIncome: 1282500,
  standardDeduction: 50000,
  taxableIncome: 1142500,
  regime: "OLD",
  slabBreakdown: OLD_REGIME_SLABS,
  baseTax: 155250,
  rebate87A: 0,
  surcharge: 0,
  cess: 6210,
  totalTax: 161460,
  effectiveTaxRate: 12.59,
  tdsDeducted: 130000,
  taxPaid: 15000,
  taxPayable: 16460,
  deductions80C: 150000,
  deductions80D: 25000,
  hraExemption: 72000,
  ltaExemption: 30000,
  homeLoanInterest: 200000,
  npsContribution: 50000,
  filingStatus: "FILED",
  filedDate: "2026-07-15",
  createdAt: "2026-04-01T10:00:00Z",
  updatedAt: "2026-07-15T14:30:00Z",
};

// ---------------------------------------------------------------------------
// Exported mock responses
// ---------------------------------------------------------------------------

/**
 * Mock response for `get_employee_tax_list`.
 * Returns an array of tax summaries for all employees.
 */
export const GET_EMP_TAX_LIST: RpcResponse[] = [
  {
    success_flag: true,
    status_code: "200",
    message: "Tax records fetched successfully",
    data: MOCK_TAX_SUMMARIES,
  },
];

/**
 * Mock response for `get_employee_tax_detail`.
 * Returns full tax detail for a specific employee.
 * The mock responds with Rajesh Kumar's detail (old regime) by default.
 */
export const GET_EMP_TAX_DETAIL: RpcResponse[] = [
  {
    success_flag: true,
    status_code: "200",
    message: "Tax detail fetched successfully",
    data: MOCK_TAX_DETAIL_OLD,
  },
];
