import { handleErrors } from "@/src/shared/errors/handle-errors";
import { lookup } from "@/src/features/echo/services/echo";

/** Route context for the catch-all: slug segments from the request path. */
type EchoCatchAllContext = { params: Promise<{ slug: string[] }> };

const lookupHandler = handleErrors<EchoCatchAllContext>(
  async (_request, context) => {
    const { slug } = await context.params;
    return lookup(slug);
  },
);

/**
 * Returns the registered mock for the requested path.
 *
 * Every HTTP method performs the same exact-match lookup: the slug path is
 * normalized (e.g. `/articles/1`) and resolved against the persisted registry.
 * On a hit the response carries the entry's `data` with its `status_code`
 * (default `200`); on a miss the handler returns `404 No mock registered`.
 */
export const GET = lookupHandler;
export const POST = lookupHandler;
export const PUT = lookupHandler;
export const PATCH = lookupHandler;
export const DELETE = lookupHandler;