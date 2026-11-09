import { z } from "zod";
export const expirySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return (
      !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    );
  }, "Escolha uma data de validade válida.");

export function maputoDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Maputo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (key: string) =>
    parts.find((value) => value.type === key)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function isExpired(
  expiresOn: string | null | undefined,
  now = new Date(),
) {
  return !!expiresOn && expiresOn < maputoDay(now);
}
export function wasPublished(wedding: {
  published: unknown;
  firstPublishedAt?: string | null;
}) {
  return !!wedding.published || !!wedding.firstPublishedAt;
}
export function canDeleteWedding(
  wedding: {
    published: unknown;
    firstPublishedAt?: string | null;
    expiresOn?: string | null;
  },
  now = new Date(),
) {
  return !wasPublished(wedding) || isExpired(wedding.expiresOn, now);
}
