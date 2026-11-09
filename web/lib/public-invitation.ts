import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { recipients, weddings } from "@/db/schema";
import { isExpired } from "./expiry";

export async function getPublicInvitation(token: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const [row] = await getDb()
    .select({
      name: recipients.name,
      content: weddings.published,
      expiresOn: weddings.expiresOn,
    })
    .from(recipients)
    .innerJoin(weddings, eq(weddings.id, recipients.weddingId))
    .where(and(eq(recipients.token, token), eq(recipients.active, true)));
  if (!row?.content || isExpired(row.expiresOn)) return null;
  return { name: row.name, content: row.content };
}
