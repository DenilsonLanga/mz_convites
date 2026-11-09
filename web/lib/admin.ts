import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getChatGPTUser, chatGPTSignInPath } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { adminIdentity } from "@/db/schema";
import { canAccessAdmin } from "./invitations";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireAdmin() {
  const user = await getChatGPTUser();
  if (!user) throw new HttpError(401, "Inicie sessão para continuar.");
  const db = getDb();
  const [bound] = await db
    .select()
    .from(adminIdentity)
    .where(eq(adminIdentity.id, "owner"));
  if (
    !canAccessAdmin(
      user,
      env.ADMIN_EMAIL,
      bound?.userId ?? null,
      import.meta.env.DEV,
    )
  ) {
    throw new HttpError(
      403,
      "Este painel é reservado ao proprietário do MZ Convites.",
    );
  }
  // The verified owner email bootstraps a durable, site-scoped identity. No public first-user claim.
  if (!bound && !(import.meta.env.DEV && user.userId === "local_seedy")) {
    await db
      .insert(adminIdentity)
      .values({ id: "owner", userId: user.userId })
      .onConflictDoNothing();
    const [saved] = await db
      .select()
      .from(adminIdentity)
      .where(eq(adminIdentity.id, "owner"));
    if (saved.userId !== user.userId)
      throw new HttpError(403, "Acesso reservado ao proprietário.");
  }
  return user;
}
export { chatGPTSignInPath };

export function assertSameOrigin(request: Request) {
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new HttpError(403, "Pedido não autorizado.");
  }
}
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  console.error(
    JSON.stringify({
      event: "admin_request_failed",
      message: error instanceof Error ? error.message : "Unknown error",
    }),
  );
  return Response.json(
    { error: "Não foi possível concluir. Tente novamente." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
