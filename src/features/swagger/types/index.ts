/**
 * Pragmatic OpenAPI (Swagger 2.0 / 3.x) type definitions used by the Swagger
 * explorer feature. These deliberately model only the parts of the spec the
 * feature introspects: paths, operations, parameters, request bodies, and
 * schema defaults/examples. They do NOT attempt to cover the full spec.
 */

/** HTTP methods supported by OpenAPI path items. */
export type HttpMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "head"
  | "options";

/** Where a parameter is carried in the request. */
export type ParameterLocation = "path" | "query" | "header" | "cookie";

/** Loose schema shape — the feature reads defaults/examples, never validates. */
export interface SchemaObject {
  type?: string;
  format?: string;
  enum?: unknown[];
  default?: unknown;
  example?: unknown;
  items?: SchemaObject;
  properties?: Record<string, SchemaObject>;
  $ref?: string;
  nullable?: boolean;
  description?: string;
}

/** A single OpenAPI parameter object. */
export interface ParameterObject {
  name: string;
  in: ParameterLocation;
  required?: boolean;
  description?: string;
  schema?: SchemaObject;
  example?: unknown;
  default?: unknown;
}

/** Media type entry inside a request/response `content` map. */
export interface MediaTypeObject {
  schema?: SchemaObject;
  example?: unknown;
}

/** OpenAPI requestBody object. */
export interface RequestBodyObject {
  description?: string;
  required?: boolean;
  content?: Record<string, MediaTypeObject>;
}

/** OpenAPI response object. */
export interface ResponseObject {
  description?: string;
  content?: Record<string, MediaTypeObject>;
}

/** A single path operation (e.g. `get` inside a path item). */
export interface OperationObject {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses?: Record<string, ResponseObject>;
  security?: Array<Record<string, string[]>>;
}

/** OpenAPI path item — may carry shared parameters plus one op per method. */
export interface PathItemObject {
  summary?: string;
  description?: string;
  parameters?: ParameterObject[];
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  patch?: OperationObject;
  delete?: OperationObject;
  head?: OperationObject;
  options?: OperationObject;
}

/** OpenAPI server entry (3.x) / host info (2.0). */
export interface ServerObject {
  url: string;
  description?: string;
}

/** Top-level OpenAPI document shape (subset). */
export interface OpenApiSpec {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; version?: string; description?: string };
  servers?: ServerObject[];
  host?: string;
  basePath?: string;
  schemes?: string[];
  paths?: Record<string, PathItemObject>;
}

/** A flattened spec entry: one row per `path × method` with typed params. */
export interface EndpointDescriptor {
  path: string;
  method: HttpMethod;
  operation: OperationObject;
  pathParameters: ParameterObject[];
  queryParameters: ParameterObject[];
  headerParameters: ParameterObject[];
}

const OPERATION_METHODS: HttpMethod[] = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
];

/**
 * Flattens an OpenAPI spec into a sorted list of endpoint descriptors, one
 * per `path × HTTP method`. Operation-level parameters override/augment the
 * path-item shared parameters (shared first, operation second).
 *
 * @param spec - The fetched OpenAPI document.
 * @returns A sorted array of {@link EndpointDescriptor} entries.
 */
export function buildEndpointDescriptors(
  spec: OpenApiSpec,
): EndpointDescriptor[] {
  const endpoints: EndpointDescriptor[] = [];
  const paths = spec.paths ?? {};
  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;
    const sharedParams = pathItem.parameters ?? [];
    for (const method of OPERATION_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      const parameters = [...sharedParams, ...(operation.parameters ?? [])];
      endpoints.push({
        path,
        method,
        operation,
        pathParameters: parameters.filter((p) => p.in === "path"),
        queryParameters: parameters.filter((p) => p.in === "query"),
        headerParameters: parameters.filter((p) => p.in === "header"),
      });
    }
  }
  return endpoints.sort(
    (a, b) =>
      a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
  );
}