import { MOCK_ACCESS_TOKEN, MOCK_RENEW_TOKEN } from "@feature/cssp/utils/constants/tokens";
import { MockVariant } from "../respond";
import { LoginSuccess, MsgError } from "../../types";

/** Base64 of the fixed mock pensioner uid used across variants. */
const UID_B64 = Buffer.from("7800000100000001").toString("base64");

/** All response shapes of POST PensionersApp/v1/login (views/login.py). */
export const LOGIN_VARIANTS = {
  /** Photo approved + valid DLC — full happy path. */
  success: {
    status: 200,
    body: {
      token: MOCK_ACCESS_TOKEN,
      username: Buffer.from("12345678").toString("base64"),
      uid: UID_B64,
      name: "KARTHIK KUMAR R",
      approval: "00",
      has_dlc: "00",
      renew_token: MOCK_RENEW_TOKEN,
    },
  },
  /** No registration photo yet (approval '03', no DLC). */
  success_no_photo: {
    status: 200,
    body: {
      token: MOCK_ACCESS_TOKEN,
      username: Buffer.from("12345678").toString("base64"),
      uid: UID_B64,
      name: "KARTHIK KUMAR R",
      approval: "03",
      has_dlc: "01",
      renew_token: MOCK_RENEW_TOKEN,
    },
  },
  /** Session already active on another device. */
  session_active: {
    status: 400,
    body: { msg: "Your current session is active. Please make sure to logout from all devices and try again." },
  },
  /** Fernet decryption of credentials failed (login.py:53). */
  invalid_credentials: { status: 400, body: { msg: "Error Login: Invalid username or password" } },
  /** App version != '24' (login.py:44). */
  update_required: { status: 400, body: { msg: "Please update your app from Play Store/App Store" } },
  /** Generic upstream maintenance failure (login.py:66). */
  maintenance: { status: 400, body: { msg: "Error: Unable to process. Server under maintenance" } },
  /** AuthBackend returned falsy user (login.py:234). */
  unable_to_login: { status: 400, body: { msg: "Unable to login" } },
  /** DRF Throttled override (login.py:32-34). */
  throttled: { status: 429, body: { msg: "Request limit exceeded. Available in 60 seconds" } },
} satisfies Record<string, MockVariant<LoginSuccess | MsgError>>;

/** Selectable variant names for the login endpoint. */
export type LoginVariantName = keyof typeof LOGIN_VARIANTS;
