import { z } from "zod";

const shortText = z.string().trim().min(1).max(180);
const safeMap = z
  .string()
  .trim()
  .max(1500)
  .refine(
    (value) => !value || /^https:\/\//i.test(value),
    "Use uma ligação HTTPS para o mapa.",
  );
export const contentSchema = z.object({
  partner1: shortText,
  partner2: shortText,
  message: z.string().trim().min(1).max(8000),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const parsed = new Date(`${value}T12:00:00Z`);
      return (
        !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
      );
    }, "Escolha uma data válida."),
  ceremonyTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  ceremonyName: shortText,
  ceremonyAddress: z.string().trim().min(1).max(1000),
  ceremonyMap: safeMap,
  receptionTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  receptionName: shortText,
  receptionAddress: z.string().trim().min(1).max(1000),
  receptionMap: safeMap,
  whatsapp: z
    .string()
    .trim()
    .regex(
      /^\+?[1-9]\d{6,14}$/,
      "Introduza o número com indicativo, por exemplo +258841234567.",
    ),
  closing: z.string().trim().max(2000),
  theme: z.enum(["ivory", "forest"]),
  font: z.enum(["classic", "script"]),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  foreground: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ornament: z.enum(["none", "line", "botanical"]),
});
export type InvitationContent = z.infer<typeof contentSchema>;
export const draftSchema = contentSchema.extend({
  partner1: z.string().trim().max(180),
  partner2: z.string().trim().max(180),
  message: z.string().trim().max(8000),
  date: z.union([z.literal(""), contentSchema.shape.date]),
  ceremonyName: z.string().trim().max(180),
  ceremonyAddress: z.string().trim().max(1000),
  receptionName: z.string().trim().max(180),
  receptionAddress: z.string().trim().max(1000),
  ceremonyTime: z.union([z.literal(""), contentSchema.shape.ceremonyTime]),
  receptionTime: z.union([z.literal(""), contentSchema.shape.receptionTime]),
  whatsapp: z
    .string()
    .trim()
    .max(16)
    .regex(/^\+?\d*$/, "Use apenas o indicativo e os algarismos do número."),
});
export function validationMessage(
  issues: { path: (string | number)[]; message: string }[],
) {
  const labels: Record<string, string> = {
    partner1: "Primeiro nome",
    partner2: "Segundo nome",
    message: "Mensagem do convite",
    date: "Data do casamento",
    ceremonyTime: "Horário da cerimónia",
    ceremonyName: "Local da cerimónia",
    ceremonyAddress: "Morada da cerimónia",
    ceremonyMap: "Mapa da cerimónia",
    receptionTime: "Horário da celebração",
    receptionName: "Local da celebração",
    receptionAddress: "Morada da celebração",
    receptionMap: "Mapa da celebração",
    whatsapp: "WhatsApp",
    closing: "Mensagem de encerramento",
  };
  return issues
    .map(
      (issue) =>
        `${labels[String(issue.path[0])] || "Personalização"}: ${issue.message === "String must contain at least 1 character(s)" ? "preencha este campo." : issue.message}`,
    )
    .join("\n");
}
export type Recipient = {
  id: string;
  weddingId: string;
  token: string;
  name: string;
  active: boolean;
  createdAt: string;
};
export type Wedding = {
  id: string;
  draft: InvitationContent;
  published: InvitationContent | null;
  expiresOn: string | null;
  firstPublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type WeddingSummary = Wedding & { recipientCount: number };

export const palettes = {
  ivory: {
    background: "#FAF7F0",
    foreground: "#354239",
    accent: "#997D45",
    font: "classic" as const,
  },
  forest: {
    background: "#17473E",
    foreground: "#D5C694",
    accent: "#D8BE7E",
    font: "script" as const,
  },
};
export function newContent(): InvitationContent {
  return {
    partner1: "",
    partner2: "",
    message: "Convidam para o seu casamento",
    date: "",
    ceremonyTime: "14:00",
    ceremonyName: "",
    ceremonyAddress: "",
    ceremonyMap: "",
    receptionTime: "17:00",
    receptionName: "",
    receptionAddress: "",
    receptionMap: "",
    whatsapp: "+258",
    closing: "A vossa presença tornará este dia ainda mais especial.",
    theme: "forest",
    ornament: "botanical",
    ...palettes.forest,
  };
}
export const sampleContent: InvitationContent = {
  ...newContent(),
  theme: "ivory",
  ...palettes.ivory,
  partner1: "Débora",
  partner2: "Paulo",
  date: "2027-10-04",
  whatsapp: "+258841234567",
  ceremonyName: "Igreja de Santo António",
  ceremonyAddress: "Av. Salvador Allende, Maputo",
  receptionName: "Jardim dos Encontros",
  receptionAddress: "Costa do Sol, Maputo",
};
export function coupleName(c: InvitationContent) {
  return `${c.partner1 || "Nome"} & ${c.partner2 || "Nome"}`;
}
export function displayDate(value: string) {
  if (!value) return "A vossa data especial";
  return new Intl.DateTimeFormat("pt-MZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Maputo",
  }).format(new Date(`${value}T12:00:00Z`));
}
export function whatsappUrl(c: InvitationContent, recipient: string) {
  const text = `Olá! Sou ${recipient}. Gostaria de confirmar a presença no casamento de ${coupleName(c)}, no dia ${displayDate(c.date)}.`;
  return `https://wa.me/${c.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
export function mapUrl(name: string, address: string, explicit: string) {
  return (
    explicit ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${address}`)}`
  );
}
export function fileSlug(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 70) || "convite"
  );
}
export function canAccessAdmin(
  user: { userId: string; email: string } | null,
  expectedEmail: string | undefined,
  boundId: string | null,
  isDev: boolean,
) {
  if (!user) return false;
  if (
    isDev &&
    user.userId === "local_seedy" &&
    user.email === "seedy@sites.test"
  )
    return true;
  if (boundId) return user.userId === boundId;
  return (
    !!expectedEmail && user.email.toLowerCase() === expectedEmail.toLowerCase()
  );
}
