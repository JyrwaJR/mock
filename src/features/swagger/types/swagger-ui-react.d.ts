/**
 * Ambient type declaration for `swagger-ui-react`, which ships no bundled
 * TypeScript types. Declares only the props the swagger feature uses; the
 * `requestInterceptor` type deliberately stays permissive to tolerate the
 * runtime request object shape.
 */
declare module "swagger-ui-react" {
  import type { ComponentType } from "react";

  /** Request object swagger-ui hands to the request interceptor. */
  export interface SwaggerUIRequest {
    /** Absolute or relative URL swagger-ui resolved for the operation. */
    url: string;
    /** HTTP method uppercased, e.g. `GET`. */
    method: string;
    /** Request headers to send. */
    headers: Record<string, string>;
    /** Optional request body. */
    body?: unknown;
    [key: string]: unknown;
  }

  /** Props accepted by the SwaggerUI component (subset used by this app). */
  export interface SwaggerUIProps {
    /** URL of a raw OpenAPI document fetched client-side. */
    url?: string;
    /** Inline OpenAPI document (alternative to `url`). */
    spec?: object;
    /** Called for every Try-it-out request; may modify and must return it. */
    requestInterceptor?: (request: SwaggerUIRequest) => SwaggerUIRequest;
    /** How deeply operations are expanded on load. */
    docExpansion?: "list" | "full" | "none";
    /** Persist the Authorize dialog credentials across reloads. */
    persistAuthorization?: boolean;
    /** Enable Try-it-out by default. */
    tryItOutEnabled?: boolean;
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}