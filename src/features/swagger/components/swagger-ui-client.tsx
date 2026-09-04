"use client";

import SwaggerUI, {
  type SwaggerUIRequest,
} from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { rewriteUrlToProxy, shouldProxyUrl } from "@/src/features/swagger/services/request-builder";

/**
 * Intercepts every swagger-ui request and rewrites operation URLs to the
 * same-origin proxy route (`/api/swagger/proxy/**`) so Try-it-out traffic
 * flows through the server-side proxy — preserving `SWAGGER_API_KEY`
 * injection, header allowlisting, and avoiding browser CORS against the
 * upstream API. Same-origin Next.js API routes (e.g. the spec fetch at
 * `/api/swagger/spec`) pass through unchanged.
 *
 * @param request - The request swagger-ui is about to send.
 * @returns The same request, with upstream URLs rewritten through the proxy.
 */
function requestInterceptor(request: SwaggerUIRequest): SwaggerUIRequest {
  if (!shouldProxyUrl(request.url)) return request;
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