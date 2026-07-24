import { RpcResponse } from "./type";

export const GET_EMPLOYEE_SALARY_STATEMENTS: RpcResponse[] = [
  {
    success_flag: true,
    status_code: "200",
    data: {
      gpf_desc: "MEG/GA",
      gpf_no: "7476",
      bank_no: "20003796554",
      voucher_no: "609",
      voucher_date: "01/02/2025",
      s_data: [
        {
          pName: "Basic",
          amount: "36600",
        },
        {
          pName: "Dearness Allowance",
          amount: "18300",
        },
        {
          pName: "House Rent Allowance",
          amount: "7200",
        },
        {
          pName: "Medical Allowance",
          amount: "1000",
        },
        {
          pName: "GPF_STATE",
          amount: "7500",
        },
        {
          pName: "Professional Tax",
          amount: "200",
        },
        {
          pName: "Income Tax",
          amount: "1500",
        },
        {
          pName: "GIS",
          amount: "500",
        },
      ],
      totalEmolument: 63100,
      totalPayItem: 9200,
      totalng: 53900,
    },
  },
];
