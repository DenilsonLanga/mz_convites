import { describe, expect, it } from "vitest";
import {
  canDeleteWedding,
  expirySchema,
  isExpired,
  maputoDay,
} from "../../lib/expiry";

describe("validade no fuso de Maputo", () => {
  it("mantém o convite válido até ao fim do dia escolhido", () => {
    expect(isExpired("2026-11-08", new Date("2026-11-08T21:59:59.999Z"))).toBe(
      false,
    );
    expect(isExpired("2026-11-08", new Date("2026-11-08T22:00:00.000Z"))).toBe(
      true,
    );
    expect(maputoDay(new Date("2026-11-08T22:00:00Z"))).toBe("2026-11-09");
  });
  it("só permite eliminar convites que já foram publicados após a validade, mesmo retirados de publicação", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    expect(canDeleteWedding({ published: null }, now)).toBe(true);
    expect(
      canDeleteWedding({ published: {}, expiresOn: "2026-11-08" }, now),
    ).toBe(false);
    expect(
      canDeleteWedding(
        {
          published: null,
          firstPublishedAt: "2026-01-01",
          expiresOn: "2026-11-08",
        },
        now,
      ),
    ).toBe(false);
    expect(
      canDeleteWedding({ published: {}, expiresOn: "2026-11-07" }, now),
    ).toBe(true);
    expect(canDeleteWedding({ published: {} }, now)).toBe(false);
  });
  it("recusa datas impossíveis e não presume validade para convites antigos", () => {
    expect(expirySchema.safeParse("2026-02-30").success).toBe(false);
    expect(expirySchema.safeParse("2028-02-29").success).toBe(true);
    expect(isExpired(null)).toBe(false);
  });
});
