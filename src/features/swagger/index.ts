/**
 * Swagger feature public API.
 *
 * NOTE: client components should import `SpecExplorer` directly from
 * `@/src/features/swagger/components/spec-explorer` — importing this barrel
 * from a client component would pull the server-only fetcher/validator
 * modules into the client bundle.
 */
export { SpecExplorer } from "./components/spec-explorer";
export { EndpointDetail } from "./components/endpoint-detail";
export { JsonViewer } from "./components/json-viewer";
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