"use client";

import SwaggerUI, {
  type SwaggerUIRequest,
} from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { rewriteUrlToProxy } from "@/src/features/swagger/services/request-builder";

/**
 * Intercepts every swagger-ui Try-it-out request and rewrites its URL to the
 * same-origin proxy route (`/api/swagger/proxy/**`) so requests flow through
 * the server-side proxy — preserving `SWAGGER_API_KEY` injection, header
 * allowlisting, and avoiding browser CORS against the upstream API.
 *
 * @param request - The request swagger-ui is about to send.
 * @returns The same request with its URL rewritten through the proxy.
 */
function requestInterceptor(request: SwaggerUIRequest): SwaggerUIRequest {
  return { ...request, url: rewriteUrlToProxy(request.url) };
}

/**
 * Client-side Swagger UI shell for the `/swagger` page.
 *
 * Loads the raw OpenAPI spec from `/api/swagger/spec` and renders the official
 * swagger-ui explorer. All Try-it-out traffic is routed through the swagger
 * live proxy via {@link requestInterceptor}.
 */
export function SwaggerUiClient() {
  return (
    <div className="p-4">
      <SwaggerUI
        url="/api/swagger/spec"
        requestInterceptor={requestInterceptor}
        docExpansion="list"
        tryItOutEnabled
      />
    </div>
  );
}