"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildEndpointDescriptors,
  type EndpointDescriptor,
  type OpenApiSpec,
} from "../types";
import { EndpointDetail } from "./endpoint-detail";

const METHOD_BADGE: Record<string, string> = {
  get: "bg-blue-100 text-blue-800",
  post: "bg-green-100 text-green-800",
  put: "bg-amber-100 text-amber-800",
  patch: "bg-orange-100 text-orange-800",
  delete: "bg-red-100 text-red-800",
};

/**
 * Main Swagger explorer: loads the spec from `/api/swagger/spec`, renders a
 * method-colored endpoint nav alongside the selected endpoint's detail panel,
 * and shows a setup banner when the spec is unavailable.
 */
export function SpecExplorer() {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSpec() {
      try {
        const res = await fetch("/api/swagger/spec");
        const data = (await res.json()) as {
          spec?: OpenApiSpec;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.spec) {
          setError(
            data.error ??
              "Unable to load the OpenAPI spec. Set SWAGGER_API_URL in .env.",
          );
          setLoading(false);
          return;
        }
        setSpec(data.spec);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Unable to reach the spec endpoint.");
          setLoading(false);
        }
      }
    }
    void loadSpec();
    return () => {
      cancelled = true;
    };
  }, []);

  const endpoints = useMemo(
    () => (spec ? buildEndpointDescriptors(spec) : []),
    [spec],
  );

  const selected: EndpointDescriptor | null =
    endpoints.find((entry) => entry.path === selectedPath) ?? endpoints[0] ?? null;

  const baseUrl = useMemo(() => {
    const fromServers = spec?.servers?.[0]?.url;
    if (fromServers) return fromServers;
    if (spec?.schemes?.[0] && spec?.host) {
      return `${spec.schemes[0]}://${spec.host}${spec.basePath ?? ""}`;
    }
    return null;
  }, [spec]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {spec?.info?.title ?? "Swagger API Explorer"}
        </h1>
        {baseUrl && (
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
            {baseUrl}
          </span>
        )}
      </header>

      {loading && (
        <p className="text-sm text-zinc-500">Loading OpenAPI spec…</p>
      )}

      {error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Spec unavailable</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && spec && (
        <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
          <nav className="max-h-[70vh] overflow-auto rounded-lg border border-zinc-200 p-2">
            {endpoints.length === 0 && (
              <p className="p-3 text-sm text-zinc-500">
                No paths found in this spec.
              </p>
            )}
            {endpoints.map((entry) => (
              <button
                key={`${entry.method}:${entry.path}`}
                type="button"
                onClick={() => setSelectedPath(entry.path)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                  selected?.path === entry.path
                    ? "bg-blue-50"
                    : "hover:bg-zinc-50"
                }`}
              >
                <span
                  className={`w-14 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-semibold uppercase ${
                    METHOD_BADGE[entry.method] ?? "bg-zinc-100 text-zinc-800"
                  }`}
                >
                  {entry.method}
                </span>
                <code className="truncate text-xs text-zinc-700">
                  {entry.path}
                </code>
              </button>
            ))}
          </nav>

          <section className="min-w-0">
            {selected ? (
              <EndpointDetail endpoint={selected} baseUrl={baseUrl} />
            ) : (
              <p className="text-sm text-zinc-500">Select an endpoint.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}