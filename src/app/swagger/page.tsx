import { SwaggerUiClient } from "@/src/features/swagger/components/swagger-ui-client";

export const metadata = {
  title: "Swagger API Explorer",
};

/**
 * Swagger API explorer page. Renders the official swagger-ui in
 * {@link SwaggerUiClient}, which loads the OpenAPI spec from
 * `/api/swagger/spec` and routes Try-it-out requests through
 * `/api/swagger/proxy/**`.
 */
export default function SwaggerPage() {
  return <SwaggerUiClient />;
}