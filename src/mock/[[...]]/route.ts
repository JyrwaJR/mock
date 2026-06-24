import { NextResponse } from "next/server";
import { encrypt, decrypt } from "./encryption";
import { withValidation } from "@/src/shared/utils/with-validation/with-validation";
import z from "zod";
import { NotFoundError } from "@/src/shared/errors/http-errors";
import { MOCK_RESPONSES } from "./response";

const RpcBodySchema = z.object({
  app_id: z.string(),
  request_data: z.string(),
});

type DecryptedBody = {
  functionName: string;
};

export const POST = withValidation(
  { body: RpcBodySchema, query: z.object({}).strict() },
  async (_request, _ctx, { body }) => {
    const appId = body?.app_id;
    const requestData = body?.request_data;
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

    const method = decrypted.functionName;

    const CURRENT_MOCK: Record<string, number> = {
      employee_login: 1,
    };

    const response = MOCK_RESPONSES[method]?.[CURRENT_MOCK[method] ?? 0];

    return NextResponse.json(
      {
        response: decrypt(
          "VjN0OTBOMzh6YUdEWlRwaGxrQ3dVbG1HWDBpdG5BdGxrZzlPQTMrRkkrSndsMzJSWmhlb0laMW5KMGJ1ZzlLSQ==",
        ),
        request_data: decrypted,
        unencrypted_respond_data: response,
      },
      {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      },
    );
  },
);
