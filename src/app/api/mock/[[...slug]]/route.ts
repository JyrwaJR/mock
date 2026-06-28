import { NextResponse } from "next/server";
import { decrypt, encrypt } from "@/src/proxy/mock/encryption";
import { withValidation } from "@/src/shared/utils/with-validation/with-validation";
import z from "zod";
import { NotFoundError } from "@/src/shared/errors/http-errors";
import { MOCK_RESPONSES } from "@/src/proxy/mock/response/index";
import { verifyAccessToken } from "@/src/shared/utils/jwt-utils";
import { RpcResponse } from "@/src/proxy/mock/response/type";

const RpcBodySchema = z.object({
  app_id: z.string(),
  request_data: z.string(),
});

type DecryptedBody = {
  functionName: string;
};

const encryptAndReturn = (data: RpcResponse) => {
  const encrypted = encrypt(JSON.stringify(data));
  return NextResponse.json(
    { response: encrypted },
    {
      status: 200,
      headers: {
        "Content-Type": "plain/text",
      },
    },
  );
};

export const POST = withValidation(
  { body: RpcBodySchema, query: z.object({}).strict() },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (request, _ctx: any, { body }) => {
    try {
      const appId = body?.app_id;
      const requestData = body?.request_data;
      const header = request.headers.get("authorization");
      const bearerToken = header?.split(" ")[1];

      if (!bearerToken) {
        return encryptAndReturn({
          message: "Unauthorized: Token Missing",
          status_code: "401",
        });
      }

      try {
        await verifyAccessToken(bearerToken);
      } catch {
        return encryptAndReturn({
          message: "Unauthorized: Token Expire",
          status_code: "401",
        });
      }

      if (appId !== appId) {
        throw new NotFoundError("App Id not found");
      }

      if (!requestData) {
        throw new NotFoundError("Request Data not found");
      }

      const decrypted = decrypt<DecryptedBody>(requestData);

      if (!decrypted.functionName) {
        throw new NotFoundError("Method not found");
      }

      const method = decrypted.functionName as RpcMethod;

      type RpcMethod = keyof typeof MOCK_RESPONSES;

      const CURRENT_MOCK: Record<RpcMethod, number> = {
        employee_login: 0,
        get_employee_details: 0,
        get_employee_leave_details: 0,
        get_employee_leave_details_details: 0,
        get_employee_salary_statements: 0,
        get_employee_salary_statements_details: 0,
      };

      const response = MOCK_RESPONSES[method]?.[CURRENT_MOCK[method] ?? 0];

      if (!response) {
        return encryptAndReturn({
          message: "Method not found",
          status_code: "404",
        });
      }

      return encryptAndReturn(response);
    } catch (error) {
      console.log("error", error);
      return encryptAndReturn({
        message: "Internal server error",
        status_code: "500",
        data: {},
      });
    }
  },
);
