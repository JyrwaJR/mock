import { describe, expect, it } from "vitest";
import { getSwaggerEnv, swaggerEnvSchema } from "../index";

describe("swaggerEnvSchema", () => {
  it("accepts a valid absolute spec URL", () => {
    const result = swaggerEnvSchema.safeParse({
      SWAGGER_API_URL: "https://api.example.com/swagger.json",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing SWAGGER_API_URL", () => {
    const result = swaggerEnvSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) => issue.path.join(".") === "SWAGGER_API_URL",
      ),
    ).toBe(true);
  });

  it("rejects a relative spec URL", () => {
    const result = swaggerEnvSchema.safeParse({
      SWAGGER_API_URL: "/doc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects URLs with embedded credentials", () => {
    const result = swaggerEnvSchema.safeParse({
      SWAGGER_API_URL: "https://user:pass@api.example.com/swagger.json",
    });
    expect(result.success).toBe(false);
  });

  it("leaves SWAGGER_BASE_URL undefined when omitted", () => {
    const result = swaggerEnvSchema.safeParse({
      SWAGGER_API_URL: "https://api.example.com/swagger.json",
    });
    expect(result.success).toBe(true);
    expect(result.data?.SWAGGER_BASE_URL).toBeUndefined();
  });
});

describe("getSwaggerEnv", () => {
  it("reports the offending var name", () => {
    expect(() => getSwaggerEnv({ SWAGGER_API_URL: "/doc" })).toThrow(
      /SWAGGER_API_URL/,
    );
  });

  it("returns the parsed env on success", () => {
    const env = getSwaggerEnv({
      SWAGGER_API_URL: "https://api.example.com/swagger.json",
      SWAGGER_BASE_URL: "https://api.example.com",
    });
    expect(env.SWAGGER_API_URL).toBe("https://api.example.com/swagger.json");
    expect(env.SWAGGER_BASE_URL).toBe("https://api.example.com");
  });
});