import { describe, expect, it } from "vitest";
import {
  canAccessAdmin,
  contentSchema,
  draftSchema,
  fileSlug,
  mapUrl,
  newContent,
  sampleContent,
  whatsappUrl,
} from "../../lib/invitations";

describe("autorização do proprietário", () => {
  const owner = { userId: "site-owner", email: "owner@example.com" };
  it("recusa anónimos, utilizadores externos e configuração ausente", () => {
    expect(canAccessAdmin(null, owner.email, null, false)).toBe(false);
    expect(
      canAccessAdmin(
        { userId: "other", email: "guest@example.com" },
        owner.email,
        null,
        false,
      ),
    ).toBe(false);
    expect(canAccessAdmin(owner, undefined, null, false)).toBe(false);
  });
  it("associa a conta verificada e usa depois o identificador persistente", () => {
    expect(canAccessAdmin(owner, "OWNER@example.com", null, false)).toBe(true);
    expect(canAccessAdmin(owner, undefined, owner.userId, false)).toBe(true);
    expect(
      canAccessAdmin(
        { userId: "other", email: owner.email },
        owner.email,
        owner.userId,
        false,
      ),
    ).toBe(false);
  });
  it("nunca permite o utilizador simulado em produção", () => {
    const local = { userId: "local_seedy", email: "seedy@sites.test" };
    expect(canAccessAdmin(local, owner.email, null, true)).toBe(true);
    expect(canAccessAdmin(local, owner.email, null, false)).toBe(false);
  });
});
describe("conteúdo e ligações", () => {
  it("guarda rascunhos incompletos, mas exige os dados ao publicar", () => {
    expect(draftSchema.safeParse(newContent()).success).toBe(true);
    expect(contentSchema.safeParse(newContent()).success).toBe(false);
    expect(contentSchema.safeParse(sampleContent).success).toBe(true);
  });
  it("rejeita datas impossíveis, números inválidos e mapas inseguros", () => {
    for (const changes of [
      { date: "2027-02-30" },
      { whatsapp: "+258" },
      { ceremonyMap: "javascript:alert(1)" },
      { receptionTime: "25:00" },
    ]) {
      expect(
        contentSchema.safeParse({ ...sampleContent, ...changes }).success,
      ).toBe(false);
    }
  });
  it("inclui destinatário, casal e data na mensagem sem perder acentos", () => {
    const url = new URL(whatsappUrl(sampleContent, "João & família"));
    expect(url.pathname).toBe("/258841234567");
    expect(url.searchParams.get("text")).toContain("João & família");
    expect(url.searchParams.get("text")).toContain("Débora & Paulo");
    expect(url.searchParams.get("text")).toContain("2027");
  });
  it("codifica pesquisas nos mapas e produz nomes de ficheiro seguros", () => {
    expect(
      new URL(mapUrl("Igreja & Jardim", "Maputo", "")).searchParams.get(
        "query",
      ),
    ).toBe("Igreja & Jardim, Maputo");
    expect(fileSlug("../../João & Débora")).toBe("joao-debora");
  });
});
