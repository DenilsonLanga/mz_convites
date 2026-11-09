import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import type { InvitationContent } from "../lib/invitations";

export const weddings = sqliteTable("weddings", {
  id: text("id").primaryKey(),
  draft: text("draft", { mode: "json" }).$type<InvitationContent>().notNull(),
  published: text("published", { mode: "json" }).$type<InvitationContent>(),
  expiresOn: text("expires_on"),
  firstPublishedAt: text("first_published_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const recipients = sqliteTable(
  "recipients",
  {
    id: text("id").primaryKey(),
    weddingId: text("wedding_id")
      .notNull()
      .references(() => weddings.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    name: text("name").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("recipients_wedding_idx").on(table.weddingId)],
);
export const adminIdentity = sqliteTable("admin_identity", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
});
