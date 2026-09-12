/**
 * Photo/DLC approval codes ('00'=approved, '01'=pending, '02'/'12'=rejected,
 * '03'=never submitted) — mirrors views/login.py + views/verification_status.py.
 */
export type ApprovalStatus = "00" | "01" | "02" | "12" | "03";

/**
 * DLC validity codes ('01'=valid, '02'=rejected, '03'=pending, '00'=approved)
 * as emitted by the Life Certificate endpoints.
 */
export type DlcValidity = "00" | "01" | "02" | "03";

/**
 * Generic Django error body — most PensionersApp failures return only
 * `{ msg }`, with leading/trailing spaces preserved verbatim.
 */
export type MsgError = { msg: string };

/**
 * Success payload of POST PensionersApp/v1/login (views/login.py:78-222).
 * `token`/`renew_token` carry fixed mock strings, not real JWTs.
 */
export interface LoginSuccess {
  /** Session access token (mock string in this mock server). */
  token: string;
  /** Base64 of the PPO number, as sent by the real API. */
  username: string;
  /** Base64 of the internal uid. */
  uid: string;
  /** Drawer name of the pensioner. */
  name: string;
  /** Photo approval status when a registration photo exists. */
  approval?: ApprovalStatus;
  /** DLC presence/validity flag ('00' has valid DLC, '01' none). */
  has_dlc?: DlcValidity;
  /** Renewal credential used by POST api/validate_token (mock string). */
  renew_token: string;
}

/**
 * Success payload of get_registration_status.
 * `bank_account_no` is a SHA-256 hex digest of the account number.
 */
export interface RegistrationStatusSuccess {
  /** Single space, mirroring the real response quirk. */
  msg: string;
  /** Date of birth formatted dd-mm-yyyy. */
  dob: string;
  /** SHA-256 hex of the bank account number. */
  bank_account_no: string;
  /** Fixed status code meaning "registered". */
  status: "02";
}

/**
 * Success payload of verification_status
 * (all string fields, mirrors DRF serialisation).
 */
export interface VerificationStatusSuccess {
  /** Human-readable verification status text (multi-line). */
  ver_status: string;
  /** Last verification date, dd-mm-yyyy. */
  ver_date: string;
  /** Last verification time, HH:mm:ss. */
  ver_time: string;
  /** Place of last verification ('-' when self-verified only). */
  ver_place: string;
  /** Non-employment certificate declaration ('-' when absent). */
  ver_nec: string;
  /** Non-marriage certificate declaration ('N/A' when absent). */
  ver_nmc: string;
  /** DLC validity code for the current record. */
  is_valid: DlcValidity;
}

/** Success payload of api/lc (Life Certificate / DLC submission). */
export interface LcSuccess {
  /** Success confirmation message from views/lc.py. */
  msg: string;
  /** Fixed '00' on successful submission. */
  self_ver_code: "00";
}

/**
 * Success payload of api/verification. `self_ver_code` is the pension class
 * code, or '22' when face match failed (views/verification.py:230).
 */
export interface VerificationSuccess {
  /** Empty string on match; explanatory text on failure. */
  msg: string;
  /** Pension class code as string, or '22' for face-match failure. */
  self_ver_code: string;
}

/** Success payload of api/validate_token (views/validate_token.py:36-38). */
export interface ValidateTokenSuccess {
  /** Fixed success sentinel emitted by the real view. */
  status: "VALTOK1001";
  /** Fresh session token (mock string here). */
  token: string;
}

/**
 * Admin summary counts. NOTE: spaced key is intentional — the real API emits
 * `' dlc_not_approved '` (views/summary.py:57).
 */
export interface SummarySuccess {
  /** Total registered pensioner users. */
  registered: number;
  /** Photos awaiting approval. */
  photo_not_approved: number;
  /** Approved photos. */
  photo_approved: number;
  /** Rejected photos. */
  photo_rejected: number;
  /** DLCs awaiting approval — key contains spaces by upstream bug/design. */
  " dlc_not_approved ": number;
  /** Approved DLCs. */
  dlc_approved: number;
  /** Rejected DLCs. */
  dlc_rejected: number;
}

/** Success payload of admin summary_ppo endpoint. */
export interface SummaryPpoSuccess {
  /** Fixed 'Registered' marker for an existing PPO user. */
  registered: "Registered";
  /** Latest photo approval code or a human fallback message. */
  photo_status: string;
  /** Photo remarks when a photo exists. */
  photo_remarks?: string;
  /** Latest DLC validity code or a human fallback message. */
  dlc_status: string;
  /** DLC remarks when a DLC exists. */
  dlc_remarks?: string;
}

/** One period-based pension payment statement row from the pension-statements endpoint. */
export interface PensionStatementRow {
  /** Period start, 'Mon-YY' e.g. 'Jul-22'. */
  date_frm: string;
  /** Period end, 'Mon-YY'; always equals date_frm (period-based row). */
  date_to: string;
  /** Number of months covered, '1' normally. */
  no_of_months: string;
  /** Basic pay for the period. */
  bp: string;
  /** Dearness pay. */
  dp: string;
  /** Dearness allowance. */
  da: string;
  /** Medical allowance. */
  ma: string;
  /** Age bonus. */
  age_bonus: string;
  /** Washing allowance. */
  wa: string;
  /** Dearness relief arrears. */
  dra: string;
  /** Other allowances. */
  oth: string;
  /** Arrears gross amount. */
  arr_gross: string;
  /** Gratuity gross amount. */
  gra_gross: string;
  /** Commutation gross amount. */
  comm_gross: string;
  /** Deductions for the period. */
  deduction: string;
  /** Net amount payable. */
  net_amt: string;
  /** DDO bill date, 'd/m/yy' e.g. '6/24/26'. */
  ddo_bill_date: string;
}

/**
 * Success payload of POST PensionersApp/v1/pension-statements.
 * `base64` carries a placeholder base64-encoded PDF; `data` holds the full
 * per-period payment statement array.
 */
export interface PensionStatementsSuccess {
  /** Base64-encoded mock pension statement PDF (placeholder). */
  base64: string;
  /** Period-based payment statement rows (all string-valued). */
  data: PensionStatementRow[];
}
