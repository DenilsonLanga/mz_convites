import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { weddings, recipients } from "@/db/schema";
import { expirySchema, isExpired, maputoDay, wasPublished } from "@/lib/expiry";
import {
  contentSchema,
  draftSchema,
  newContent,
  validationMessage,
} from "@/lib/invitations";
import {
  apiError,
  assertSameOrigin,
  HttpError,
  requireAdmin,
} from "@/lib/admin";

export const dynamic = "force-dynamic";
const json = (data: unknown) =>
  Response.json(data, { headers: { "Cache-Control": "no-store" } });
const envelope = z.object({
  action: z.string(),
  id: z.string().uuid().optional(),
  data: z.unknown().optional(),
  recipientId: z.string().uuid().optional(),
  expiresOn: expirySchema.nullable().optional(),
});
const recipientNames = z
  .array(z.string().trim().min(1).max(180))
  .min(1)
  .max(500);

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const db = getDb();
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      const [wedding] = await db
        .select()
        .from(weddings)
        .where(eq(weddings.id, id));
      if (!wedding) throw new HttpError(404, "Casamento não encontrado.");
      const guests = await db
        .select()
        .from(recipients)
        .where(eq(recipients.weddingId, id))
        .orderBy(recipients.createdAt, recipients.name);
      return json({ wedding, recipients: guests });
    }
    const list = await db
      .select({
        ...getTableColumns(weddings),
        recipientCount: count(recipients.id),
      })
      .from(weddings)
      .leftJoin(recipients, eq(recipients.weddingId, weddings.id))
      .groupBy(weddings.id)
      .orderBy(desc(weddings.updatedAt));
    return json({ weddings: list });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    if (Number(request.headers.get("content-length") || 0) > 200_000)
      throw new HttpError(413, "O pedido é demasiado grande.");
    const raw = await request.text();
    if (raw.length > 200_000)
      throw new HttpError(413, "O pedido é demasiado grande.");
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "Dados inválidos.");
    }
    const parsed = envelope.safeParse(payload);
    if (!parsed.success) throw new HttpError(400, "Pedido inválido.");
    const { action, id, data, recipientId, expiresOn } = parsed.data;
    const db = getDb(),
      now = new Date().toISOString();
    if (action === "create") {
      const wedding = {
        id: crypto.randomUUID(),
        draft: newContent(),
        published: null,
        expiresOn: null,
        firstPublishedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(weddings).values(wedding);
      return json({ wedding });
    }
    if (!id) throw new HttpError(400, "Selecione um casamento.");
    const [wedding] = await db
      .select()
      .from(weddings)
      .where(eq(weddings.id, id));
    if (!wedding) throw new HttpError(404, "Casamento não encontrado.");
    const validity = expiresOn === undefined ? wedding.expiresOn : expiresOn;
    if (
      (action === "save" || action === "publish") &&
      expiresOn !== undefined &&
      wasPublished(wedding) &&
      wedding.expiresOn &&
      (!validity || validity < wedding.expiresOn)
    ) {
      throw new HttpError(
        409,
        "Depois de publicado, o prazo só pode ser prolongado.",
      );
    }
    if (action === "save") {
      const content = draftSchema.safeParse(data);
      if (!content.success)
        throw new HttpError(400, validationMessage(content.error.issues));
      const saved = await db
        .update(weddings)
        .set({ draft: content.data, expiresOn: validity, updatedAt: now })
        .where(
          and(
            eq(weddings.id, id),
            sql`(${weddings.firstPublishedAt} IS NULL AND ${weddings.published} IS NULL OR ${weddings.expiresOn} IS NULL OR ${weddings.expiresOn} <= ${validity})`,
          ),
        )
        .returning({ id: weddings.id });
      if (!saved.length)
        throw new HttpError(
          409,
          "A validade foi atualizada noutra sessão. Reabra o convite antes de guardar.",
        );
    } else if (action === "publish") {
      if (!validity)
        throw new HttpError(
          400,
          "Escolha a data de validade antes de publicar.",
        );
      if (isExpired(validity))
        throw new HttpError(
          400,
          "A validade não pode ser anterior ao dia de hoje, em Maputo.",
        );
      const content = contentSchema.safeParse(wedding.draft);
      if (!content.success)
        throw new HttpError(
          400,
          `Complete estes dados antes de publicar:\n${validationMessage(content.error.issues)}`,
        );
      const published = await db
        .update(weddings)
        .set({
          published: sql`${weddings.draft}`,
          expiresOn: validity,
          firstPublishedAt: sql`COALESCE(${weddings.firstPublishedAt}, ${now})`,
          updatedAt: now,
        })
        .where(
          and(
            eq(weddings.id, id),
            sql`((${weddings.firstPublishedAt} IS NULL AND ${weddings.published} IS NULL) OR ${weddings.expiresOn} IS NULL OR ${weddings.expiresOn} <= ${validity})`,
          ),
        )
        .returning({ id: weddings.id });
      if (!published.length)
        throw new HttpError(
          409,
          "A validade foi prolongada noutra sessão. Reabra o convite antes de publicar.",
        );
    } else if (action === "unpublish") {
      await db
        .update(weddings)
        .set({
          published: null,
          firstPublishedAt: sql`COALESCE(${weddings.firstPublishedAt}, CASE WHEN ${weddings.published} IS NOT NULL THEN ${now} ELSE NULL END)`,
          updatedAt: now,
        })
        .where(eq(weddings.id, id));
    } else if (action === "delete") {
      const deleted = await db
        .delete(weddings)
        .where(
          and(
            eq(weddings.id, id),
            sql`((${weddings.firstPublishedAt} IS NULL AND ${weddings.published} IS NULL) OR ${weddings.expiresOn} < ${maputoDay()})`,
          ),
        )
        .returning({ id: weddings.id });
      if (!deleted.length)
        throw new HttpError(
          409,
          wedding.expiresOn
            ? `Este convite só pode ser eliminado depois de ${wedding.expiresOn}, no fuso de Maputo.`
            : "Defina a validade do convite publicado antes de o poder eliminar.",
        );
    } else if (action === "duplicate") {
      const copy = {
        id: crypto.randomUUID(),
        draft: wedding.draft,
        published: null,
        expiresOn: null,
        firstPublishedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(weddings).values(copy);
      return json({ wedding: copy });
    } else if (action === "addRecipients") {
      const names = recipientNames.safeParse(data);
      if (!names.success)
        throw new HttpError(
          400,
          "Adicione entre 1 e 500 nomes, até 180 caracteres por nome.",
        );
      // Each statement remains below D1's parameter limit; batches are transactional.
      const statements = names.data.map((name) =>
        db.insert(recipients).values({
          id: crypto.randomUUID(),
          weddingId: id,
          token: crypto.randomUUID().replaceAll("-", ""),
          name,
          active: true,
          createdAt: now,
        }),
      );
      await db.batch(
        statements as [(typeof statements)[number], ...typeof statements],
      );
    } else if (action === "toggleRecipient" || action === "renameRecipient") {
      if (!recipientId) throw new HttpError(400, "Selecione o destinatário.");
      const [guest] = await db
        .select()
        .from(recipients)
        .where(
          and(eq(recipients.id, recipientId), eq(recipients.weddingId, id)),
        );
      if (!guest) throw new HttpError(404, "Destinatário não encontrado.");
      if (action === "toggleRecipient") {
        if (typeof data !== "boolean")
          throw new HttpError(400, "Estado inválido.");
        await db
          .update(recipients)
          .set({ active: data })
          .where(eq(recipients.id, recipientId));
      } else {
        const name = z.string().trim().min(1).max(180).safeParse(data);
        if (!name.success) throw new HttpError(400, "Nome inválido.");
        await db
          .update(recipients)
          .set({ name: name.data })
          .where(eq(recipients.id, recipientId));
      }
    } else if (action === "export") {
      const ids = z.array(z.string().uuid()).min(1).max(500).safeParse(data);
      if (!ids.success)
        throw new HttpError(400, "Selecione entre 1 e 500 destinatários.");
      if (!wedding.published)
        throw new HttpError(
          409,
          "Publique o casamento antes de exportar os convites finais.",
        );
      const uniqueIds = [...new Set(ids.data)];
      const guests: (typeof recipients.$inferSelect)[] = [];
      for (let offset = 0; offset < uniqueIds.length; offset += 90) {
        guests.push(
          ...(await db
            .select()
            .from(recipients)
            .where(
              and(
                eq(recipients.weddingId, id),
                eq(recipients.active, true),
                inArray(recipients.id, uniqueIds.slice(offset, offset + 90)),
              ),
            )),
        );
      }
      if (guests.length !== uniqueIds.length)
        throw new HttpError(
          409,
          "Há destinatários desativados ou indisponíveis na seleção.",
        );
      return json({ content: wedding.published, recipients: guests });
    } else throw new HttpError(400, "Ação desconhecida.");
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
