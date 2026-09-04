import { SpecExplorer } from "@/src/features/swagger/components/spec-explorer";

export const metadata = {
  title: "Swagger API Explorer",
};

/**
 * Swagger API explorer page. Renders the client-side {@link SpecExplorer},
 * which loads the OpenAPI spec from `/api/swagger/spec` and lets the user
 * browse endpoints and fire test requests through `/api/swagger/proxy/**`.
 */
export default function SwaggerPage() {
  return <SpecExplorer />;
}