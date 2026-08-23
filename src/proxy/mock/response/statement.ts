import { RpcResponse } from "./type";

export const mockSalaryStatement = {
  gpf_desc: "General Provident Fund",
  gpf_no: "GPF/MEG/123456",
  bank_no: "1234567890123456",
  voucher_no: "VCH-2026-000789",
  voucher_date: "31/07/2026",

  s_data: [
    {
      pname: "Basic Pay",
      amount: "52000",
    },
    {
      pname: "Dearness Allowance (DA)",
      amount: "10920",
    },
    {
      pname: "House Rent Allowance (HRA)",
      amount: "5200",
    },
    {
      pname: "Medical Allowance",
      amount: "1000",
    },
    {
      pname: "Transport Allowance",
      amount: "1800",
    },
    {
      pname: "Special Pay",
      amount: "1500",
    },
    {
      pname: "GPF Deduction",
      amount: "-5000",
    },
    {
      pname: "Professional Tax",
      amount: "-200",
    },
    {
      pname: "Income Tax (TDS)",
      amount: "-3500",
    },
    {
      pname: "GIS",
      amount: "-500",
    },
  ],

  totalEmolument: 72420,
  totalPayItem: 9200,
  totalng: 63220,

  grade_pay: "7600",
  pay_in_pb: "52000",

  net_pay: 63220,
  net_pay_in_word: "Sixty Three Thousand Two Hundred Twenty Only",
};
export const GET_EMPLOYEE_SALARY_STATEMENTS: RpcResponse[] = [
  {
    status_code: "200",
    message: "Success",
    data: mockSalaryStatement,
  },
];
