import { withValidation } from "@/src/shared/utils/with-validation/with-validation";
import { NextResponse } from "next/server";
import z from "zod";
import { encrypt, decrypt } from "../[[...]]/encryption";

const RequestBodySchema = z.object({
  functionName: z.string(),
  emp_code: z.string(),
  password: z.string(),
  app_id: z.string(),
});

export const POST = withValidation(
  { body: RequestBodySchema },
  async (_req, _ctx, { body }) => {
    const data = {
      functionName: body?.functionName ?? "",
      emp_code: body?.emp_code ?? "",
      password: body?.password ?? "",
    };

    const encryptedData = encrypt(JSON.stringify(data));

    const payload = {
      request_data: encryptedData,
      app_id: body?.app_id,
    };

    const res = await fetch(
      "http://10.179.35.36/eisdatafetcher/service_ext.php",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    const json = await res.json();

    const decrypted = JSON.parse(decrypt(json.request_data));

    return NextResponse.json({
      data: decrypted,
    });
  },
);
