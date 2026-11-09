import { test, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { palettes, sampleContent } from "../../lib/invitations";

test("nomes extensos continuam noutras folhas sem sair da área de texto", async ({
  page,
}) => {
  await page.goto("/signin-with-chatgpt?return_to=/");
  await expect(
    page.getByRole("button", { name: "Novo convite", exact: true }),
  ).toBeEnabled();
  const post = async (data: Record<string, unknown>) => {
    const response = await page.request.post("/api/admin", {
      headers: { Origin: "http://127.0.0.1:3001" },
      data:
        data.action === "publish" ? { expiresOn: "2099-12-31", ...data } : data,
    });
    expect(response.ok(), await response.text()).toBe(true);
    return response.json();
  };
  const { wedding } = await post({ action: "create" });
  const content = {
    ...sampleContent,
    ...palettes.forest,
    theme: "forest",
    partner1:
      "Maria da Conceição de Albuquerque e Vasconcelos de Oliveira da Silva dos Anjos de Lima",
    partner2:
      "António Francisco de Assis da Costa de Almeida de Sousa e Albuquerque dos Santos",
  };
  await post({ action: "save", id: wedding.id, data: content });
  await post({ action: "publish", id: wedding.id });
  await post({
    action: "addRecipients",
    id: wedding.id,
    data: ["Convidado do teste de nomes extensos"],
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Novo convite", exact: true }),
  ).toBeEnabled();
  await page.locator(".wedding-card").first().click();
  await page
    .getByRole("button", { name: "Convidados", exact: false })
    .filter({ has: page.locator("svg") })
    .first()
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "PDF de Convidado do teste de nomes extensos",
      exact: true,
    })
    .click();
  const file = await download;
  const doc = await getDocument({
    data: new Uint8Array(await readFile((await file.path())!)),
  }).promise;
  expect(doc.numPages).toBeGreaterThan(2);
  let text = "";
  for (let index = 1; index <= doc.numPages; index++) {
    const items = (await (await doc.getPage(index)).getTextContent()).items;
    for (const item of items) {
      if (!("str" in item) || !item.str.trim()) continue;
      text += item.str + " ";
      expect(item.transform[4], item.str).toBeGreaterThanOrEqual(40);
      expect(item.transform[4] + item.width, item.str).toBeLessThanOrEqual(380);
    }
  }
  expect(text).toContain("Lima");
  expect(text).toContain("Santos");
  expect(text).toContain("CONFIRMAÇÃO");
  await doc.destroy();
});

// A real PDF and its PNG are generated through the same admin actions as customer invitations.
test("composição de impressão inspirada na referência", async ({ page }) => {
  await page.goto("/signin-with-chatgpt?return_to=/");
  await expect(
    page.getByRole("button", { name: "Novo convite", exact: true }),
  ).toBeEnabled();
  const post = async (data: Record<string, unknown>) => {
    const response = await page.request.post("/api/admin", {
      headers: { Origin: "http://127.0.0.1:3001" },
      data:
        data.action === "publish" ? { expiresOn: "2099-12-31", ...data } : data,
    });
    expect(response.ok(), await response.text()).toBe(true);
    return response.json();
  };
  const content = {
    ...sampleContent,
    ...palettes.forest,
    theme: "forest",
    date: "2024-10-04",
    ceremonyTime: "20:00",
    message: "Convidam para o seu casamento",
    ceremonyName: "Paróquia São Sebastião",
    ceremonyAddress: "Travessa Roma, Pq. das Nações\nSão Bernardo do Campo",
    receptionTime: "21:00",
    receptionName: "Jardim das Acácias",
    receptionAddress: "Costa do Sol, Maputo",
    closing:
      "Após a cerimónia, junte-se a nós para celebrar este dia especial.",
  };
  const { wedding } = await post({ action: "create" });
  await post({ action: "save", id: wedding.id, data: content });
  await post({ action: "publish", id: wedding.id });
  await post({
    action: "addRecipients",
    id: wedding.id,
    data: ["Ana e família"],
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Novo convite", exact: true }),
  ).toBeEnabled();
  await page.locator(".wedding-card").first().click();
  await page
    .getByRole("button", { name: "Convidados", exact: false })
    .filter({ has: page.locator("svg") })
    .first()
    .click();
  let download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "PDF de Ana e família", exact: true })
    .click();
  const pdf = await download;
  const bytes = new Uint8Array(await readFile((await pdf.path())!));
  await writeFile("outputs/reference-invitation.pdf", bytes);
  const document = await getDocument({ data: new Uint8Array(bytes) }).promise;
  expect(document.numPages).toBe(2);
  expect(
    (await document.getPage(1)).view[3] / (await document.getPage(1)).view[2],
  ).toBeCloseTo(1586 / 992, 4);
  const pdfPage = await document.getPage(1);
  const textItems = (await pdfPage.getTextContent()).items.filter(
    (item) => "str" in item,
  );
  const text = textItems.map((item) => item.str).join(" ");
  const phrase = textItems.find((item) =>
    item.str.includes("CONVIDAM PARA O SEU CASAMENTO"),
  );
  const guest = textItems.find((item) => item.str.includes("ANA E FAMÍLIA"));
  const date = textItems.find((item) =>
    item.str.replace(/\s/g, "").includes("04.10.2024"),
  );
  expect(phrase).toBeDefined();
  expect(guest).toBeDefined();
  expect(date).toBeDefined();
  expect(guest!.transform[5]).toBeLessThan(phrase!.transform[5]);
  expect(guest!.transform[5]).toBeGreaterThan(date!.transform[5]);
  expect(text).toContain("Débora");
  expect(text.replace(/\s/g, "")).toContain("04.10.2024");
  expect(text).not.toContain("JUNTOS, PARA SEMPRE");
  expect(text).not.toContain("Ver localização");
  expect(text.replace(/\s/g, "")).not.toContain("RSVP");
  let remaining = "";
  for (let index = 2; index <= document.numPages; index++)
    remaining += (await (await document.getPage(index)).getTextContent()).items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
  expect(remaining).toContain("CELEBRAÇÃO");
  await document.destroy();
  download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "PNG de Ana e família", exact: true })
    .click();
  const png = await download;
  const pngBytes = new Uint8Array(await readFile((await png.path())!));
  const image = png.suggestedFilename().endsWith(".zip")
    ? Object.values(unzipSync(pngBytes))[0]
    : pngBytes;
  await writeFile("outputs/reference-invitation.png", image);
  if (png.suggestedFilename().endsWith(".zip")) {
    const images = Object.values(unzipSync(pngBytes));
    for (let index = 0; index < images.length; index++)
      await writeFile(
        `outputs/reference-invitation-page-${index + 1}.png`,
        images[index],
      );
  }
});
