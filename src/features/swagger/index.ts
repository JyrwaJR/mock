/**
 * Swagger feature public API (server-safe modules only).
 *
 * The swagger-ui client wrapper and its ambient type declaration are imported
 * directly from `@/src/features/swagger/components/swagger-ui-client` and
 * `@/src/features/swagger/types/swagger-ui-react` — the barrel deliberately
 * excludes client-only bindings so it can be imported from server code
 * without pulling the swagger-ui bundle into the server graph.
 */
export {
  getSwaggerEnv,
  swaggerEnvSchema,
} from "./validators";
export type { SwaggerEnv } from "./validators";
export { getOpenApiSpec, SpecUnavailableError } from "./services/spec-fetcher";
export {
  API_KEY_HEADER,
  buildProxyHeaders,
  buildTargetUrl,
  rewriteUrlToProxy,
  sanitizePathSegments,
} from "./services/request-builder";
export { callTarget } from "./services/proxy-caller";
export type {
  EndpointDescriptor,
  HttpMethod,
  MediaTypeObject,
  OpenApiSpec,
  OperationObject,
  ParameterLocation,
  ParameterObject,
  PathItemObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
  ServerObject,
} from "./types";
export { buildEndpointDescriptors } from "./types";