"use client";

import { useMemo, useState } from "react";
import type { EndpointDescriptor, ParameterObject } from "../types";
import { JsonViewer } from "./json-viewer";

const METHOD_BADGE: Record<string, string> = {
  get: "bg-blue-100 text-blue-800",
  post: "bg-green-100 text-green-800",
  put: "bg-amber-100 text-amber-800",
  patch: "bg-orange-100 text-orange-800",
  delete: "bg-red-100 text-red-800",
  head: "bg-zinc-100 text-zinc-800",
  options: "bg-zinc-100 text-zinc-800",
};

/** Shape of the proxy route's envelope response. */
interface ProxyResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
  error?: string;
}

/** Resolves the editable pre-fill for a parameter from the spec. */
function defaultValue(param: ParameterObject): string {
  const value =
    param.schema?.default ?? param.default ?? param.schema?.example ?? param.example ?? "";
  if (typeof value === "string") return value;
  return value === undefined ? "" : JSON.stringify(value);
}

/**
 * Renders a single endpoint's detail panel: parameter inputs, a JSON request
 * body editor, and a "Try it out" button that fires through the proxy route
 * and displays the normalized response envelope.
 */
export function EndpointDetail({
  endpoint,
  baseUrl,
}: {
  endpoint: EndpointDescriptor;
  baseUrl: string | null;
}) {
  const {
    method,
    path,
    operation,
    pathParameters,
    queryParameters,
    headerParameters,
  } = endpoint;

  const [paramValues, setParamValues] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {};
      for (const param of [
        ...pathParameters,
        ...queryParameters,
        ...headerParameters,
      ]) {
        initial[`${param.in}:${param.name}`] = defaultValue(param);
      }
      return initial;
    },
  );

  const [bodyText, setBodyText] = useState<string>(() => {
    const content = operation.requestBody?.content;
    const json = content?.["application/json"];
    const example = json?.example ?? json?.schema?.example;
    if (example === undefined) return "";
    return typeof example === "string"
      ? example
      : JSON.stringify(example, null, 2);
  });

  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasBody = useMemo(
    () => method === "post" || method === "put" || method === "patch",
    [method],
  );

  async function handleTryIt() {
    setCalling(true);
    setError(null);
    setResponse(null);
    try {
      for (const param of pathParameters) {
        const raw = paramValues[`path:${param.name}`] ?? "";
        if (raw.includes("/")) {
          throw new Error(
            `Path parameter "${param.name}" cannot contain "/".`,
          );
        }
      }

      let resolvedPath = path;
      for (const param of pathParameters) {
        const raw = paramValues[`path:${param.name}`] ?? "";
        resolvedPath = resolvedPath.replace(
          `{${param.name}}`,
          encodeURIComponent(raw),
        );
      }

      const query = new URLSearchParams();
      for (const param of queryParameters) {
        const raw = paramValues[`query:${param.name}`] ?? "";
        if (raw) query.set(param.name, raw);
      }
      const search = query.toString();
      const target = `/api/swagger/proxy/${resolvedPath.replace(/^\/+/, "")}${search ? `?${search}` : ""}`;

      const res = await fetch(target, {
        method: method.toUpperCase(),
        headers:
          hasBody && bodyText ? { "content-type": "application/json" } : undefined,
        body: hasBody && bodyText ? bodyText : undefined,
      });
      const data = (await res.json()) as ProxyResponse;
      setResponse(data);
      if (!res.ok && data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCalling(false);
    }
  }

  const allParameters = [
    ...pathParameters,
    ...queryParameters,
    ...headerParameters,
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
            METHOD_BADGE[method] ?? "bg-zinc-100 text-zinc-800"
          }`}
        >
          {method}
        </span>
        <code className="text-sm font-medium text-zinc-900">{path}</code>
      </div>
      {operation.summary && (
        <p className="text-sm text-zinc-600">{operation.summary}</p>
      )}
      {operation.description && (
        <p className="text-sm text-zinc-500">{operation.description}</p>
      )}
      {baseUrl && (
        <p className="text-xs text-zinc-400">Target: {baseUrl}</p>
      )}

      {allParameters.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Parameters
          </h3>
          {allParameters.map((param) => (
            <label
              key={`${param.in}:${param.name}`}
              className="flex flex-col gap-1 text-xs text-zinc-600"
            >
              <span>
                <code className="font-medium text-zinc-800">{param.name}</code>{" "}
                <span className="text-zinc-400">({param.in})</span>
                {param.required && (
                  <span className="text-red-500"> required</span>
                )}
              </span>
              {param.description && (
                <span className="text-zinc-400">{param.description}</span>
              )}
              <input
                className="rounded-md border border-zinc-300 px-3 py-1.5 font-mono text-sm text-zinc-900 outline-none focus:border-blue-500"
                value={paramValues[`${param.in}:${param.name}`] ?? ""}
                onChange={(event) =>
                  setParamValues((prev) => ({
                    ...prev,
                    [`${param.in}:${param.name}`]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
        </div>
      )}

      {hasBody && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Request body
          </h3>
          <textarea
            className="min-h-28 rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs text-zinc-900 outline-none focus:border-blue-500"
            placeholder='{ "key": "value" }'
            value={bodyText}
            onChange={(event) => setBodyText(event.target.value)}
          />
        </div>
      )}

      <button
        type="button"
        disabled={calling}
        onClick={handleTryIt}
        className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {calling ? "Sending…" : "Try it out"}
      </button>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {response && !error && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Response
          </h3>
          <p className="text-sm font-medium text-zinc-800">
            Status: {response.status ?? "unknown"}
          </p>
          {response.headers && (
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-medium text-zinc-500">Headers</h4>
              <JsonViewer value={response.headers} />
            </div>
          )}
          {response.body !== undefined && (
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-medium text-zinc-500">Body</h4>
              <JsonViewer value={response.body} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}