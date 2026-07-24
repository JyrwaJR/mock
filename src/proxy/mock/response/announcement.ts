import { RpcResponse } from "./type";

export const mockAnnouncements = [
  {
    title: "Office Closed for Independence Day",
    description:
      "The office will remain closed on Friday in observance of Independence Day. Regular operations will resume on Monday.",
    category: "GENERAL",
    priority: "HIGH",
    isRead: false,
    createdAt: "2026-07-03T09:00:00.000Z",
    metadata: {
      department: "Administration",
      author: "HR",
    },
  },
  {
    title: "Payroll Processed",
    description:
      "Salary for the month has been successfully processed and credited to employee accounts.",
    category: "HR",
    priority: "MEDIUM",
    isRead: true,
    createdAt: "2026-07-02T10:30:00.000Z",
    metadata: {
      payrollMonth: "June 2026",
      author: "Finance",
    },
  },
  {
    title: "Scheduled System Maintenance",
    description:
      "The employee management portal will be unavailable from 11:00 PM to 1:00 AM due to scheduled maintenance.",
    category: "IT",
    priority: "HIGH",
    isRead: false,
    createdAt: "2026-07-01T16:15:00.000Z",
    metadata: {
      environment: "Production",
      maintenanceId: "MW-20260701",
    },
  },
  {
    title: "Fire Safety Drill",
    description:
      "A mandatory fire safety drill will be conducted on Wednesday at 3:00 PM. All employees are required to participate.",
    category: "SAFETY",
    priority: "MEDIUM",
    isRead: false,
    createdAt: "2026-06-30T08:00:00.000Z",
    metadata: {
      location: "Head Office",
      coordinator: "Safety Team",
    },
  },
  {
    title: "New Leave Policy",
    description:
      "The updated leave policy has been published. Employees are encouraged to review the latest guidelines.",
    category: "HR",
    priority: "LOW",
    isRead: true,
    createdAt: "2026-06-28T11:45:00.000Z",
    metadata: {
      version: "2.1",
      effectiveFrom: "2026-07-15",
    },
  },
  {
    title: "Network Upgrade Complete",
    description:
      "The network infrastructure upgrade has been completed successfully with improved connectivity across all offices.",
    category: "IT",
    priority: "LOW",
    isRead: true,
    createdAt: "2026-06-27T14:20:00.000Z",
    metadata: {
      region: "North East",
      status: "Completed",
    },
  },
  {
    title: "Quarterly Performance Reviews",
    description:
      "Managers are requested to complete employee performance reviews before the end of the month.",
    category: "HR",
    priority: "HIGH",
    isRead: false,
    createdAt: "2026-06-25T07:30:00.000Z",
    metadata: {
      quarter: "Q2 2026",
      deadline: "2026-06-30",
    },
  },
  {
    title: "Cafeteria Menu Updated",
    description:
      "The cafeteria has introduced a new weekly menu with additional vegetarian and vegan options.",
    category: "GENERAL",
    priority: "LOW",
    isRead: true,
    createdAt: "2026-06-24T12:00:00.000Z",
  },
];

export const GET_ANNOUNCEMENTS: RpcResponse[] = [
  {
    success_flag: true,
    status_code: "200",
    message: "Success",
    data: mockAnnouncements,
  },
];
