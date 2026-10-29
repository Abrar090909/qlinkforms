import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { exportResponses } from "@/server/responses";

// CSV download. Verifies the user (route handlers are public endpoints) and
// membership via the service; cells are formula-injection safe (src/lib/csv.ts).
export async function GET(
  _request: Request,
  { params }: RouteContext<"/forms/[formId]/responses/export">,
) {
  const user = await getSessionUser();
  if (!user) return new Response("unauthorised", { status: 401 });
  const { formId } = await params;
  if (!z.uuid().safeParse(formId).success)
    return new Response("not found", { status: 404 });
  const result = await exportResponses(user, formId);
  if (!result) return new Response("not found", { status: 404 });
  const name =
    result.title
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60)
      .toLowerCase() || "responses";
  return new Response(toCsv(result.rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-responses.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
