import { test, expect, type Page } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { sampleContent, palettes } from "../../lib/invitations";
import { REFERENCE_PRINT } from "../../lib/print-design";

const origin = "http://127.0.0.1:3001";
async function post(page: Page, body: Record<string, unknown>) {
  const response = await page.request.post("/api/admin", {
    headers: { Origin: origin },
    data:
      body.action === "publish" ? { expiresOn: "2099-12-31", ...body } : body,
  });
  expect(response.status(), await response.text()).toBe(200);
  return response.json();
}
async function signIn(page: Page) {
  await page.goto("/signin-with-chatgpt?return_to=/");
  await expect(
    page.getByRole("heading", { name: "Os meus convites", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Novo convite", exact: true }),
  ).toBeEnabled();
}
async function pdfInfo(bytes: Uint8Array) {
  const doc = await getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: false,
  }).promise;
  const texts: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    texts.push(content.items.map((x) => ("str" in x ? x.str : "")).join(" "));
  }
  const first = await doc.getPage(1),
    annotations = await first.getAnnotations();
  const result = {
    text: texts.join(" "),
    pages: doc.numPages,
    width: first.view[2],
    height: first.view[3],
    annotations,
    pageTexts: texts,
  };
  await doc.destroy();
  return result;
}
async function downloaded(page: Page, click: () => Promise<unknown>) {
  const pending = page.waitForEvent("download");
  await click();
  const file = await pending;
  expect(await file.failure()).toBeNull();
  return {
    bytes: new Uint8Array(await readFile((await file.path())!)),
    name: file.suggestedFilename(),
  };
}
test("convites públicos preservam rascunhos, destinatários e desativação", async ({
  page,
  browser,
}) => {
  const anonymous = await browser.newContext();
  expect((await anonymous.request.get(`${origin}/api/admin`)).status()).toBe(
    401,
  );
  expect(
    (
      await anonymous.request.get(`${origin}/api/admin`, {
        headers: {
          "oai-authenticated-user-id": "local_seedy",
          "oai-authenticated-user-email": "seedy@sites.test",
        },
      })
    ).status(),
  ).toBe(401);
  await signIn(page);
  expect(
    (
      await page.request.post("/api/admin", {
        headers: { Origin: "https://outsider.example" },
        data: { action: "create" },
      })
    ).status(),
  ).toBe(403);
  const { wedding } = await post(page, { action: "create" });
  // Incomplete drafts remain editable across sessions, but cannot be published.
  await post(page, {
    action: "save",
    id: wedding.id,
    data: { ...wedding.draft, partner1: "Teste" },
  });
  expect(
    (
      await page.request.post("/api/admin", {
        headers: { Origin: origin },
        data: { action: "publish", id: wedding.id },
      })
    ).status(),
  ).toBe(400);
  await post(page, { action: "save", id: wedding.id, data: sampleContent });
  await post(page, {
    action: "addRecipients",
    id: wedding.id,
    data: ["Ana e família", "Convidado secreto que não deve aparecer"],
  });
  const detail = await (
    await page.request.get(`/api/admin?id=${wedding.id}`)
  ).json();
  const guest = detail.recipients.find(
    (g: { name: string }) => g.name === "Ana e família",
  );
  expect(
    (await anonymous.request.get(`${origin}/c/${guest.token}`)).status(),
  ).toBe(404);
  await post(page, { action: "publish", id: wedding.id });
  const publicPage = await anonymous.newPage();
  await publicPage.goto(`/c/${guest.token}`);
  await expect(
    publicPage.getByRole("heading", { name: "Ana e família" }),
  ).toBeVisible();
  expect(await publicPage.content()).not.toContain("Convidado secreto");
  const whatsapp = await publicPage
    .getByRole("link", { name: "Confirmar presença" })
    .getAttribute("href");
  expect(new URL(whatsapp!).searchParams.get("text")).toContain(
    "Ana e família",
  );
  await expect(
    publicPage.getByRole("link", { name: "Ver localização" }),
  ).toHaveCount(2);
  await post(page, {
    action: "save",
    id: wedding.id,
    data: { ...sampleContent, partner1: "Rascunho invisível" },
  });
  await publicPage.reload();
  expect(await publicPage.content()).not.toContain("Rascunho invisível");
  const exportSnapshot = await post(page, {
    action: "export",
    id: wedding.id,
    data: [guest.id],
  });
  expect(exportSnapshot.content.partner1).toBe(sampleContent.partner1);
  await post(page, { action: "publish", id: wedding.id });
  await publicPage.reload();
  await expect(
    publicPage.getByText("Rascunho invisível", { exact: true }),
  ).toBeVisible();
  await publicPage.setViewportSize({ width: 390, height: 844 });
  expect(
    await publicPage.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await publicPage.screenshot({
    path: "outputs/guest-mobile.png",
    fullPage: true,
  });
  await post(page, {
    action: "toggleRecipient",
    id: wedding.id,
    recipientId: guest.id,
    data: false,
  });
  expect(
    (await anonymous.request.get(`${origin}/c/${guest.token}`)).status(),
  ).toBe(404);
  expect(
    (
      await page.request.post("/api/admin", {
        headers: { Origin: origin },
        data: { action: "export", id: wedding.id, data: [guest.id] },
      })
    ).status(),
  ).toBe(409);
  await post(page, {
    action: "toggleRecipient",
    id: wedding.id,
    recipientId: guest.id,
    data: true,
  });
  const copy = await post(page, { action: "duplicate", id: wedding.id });
  const duplicate = await (
    await page.request.get(`/api/admin?id=${copy.wedding.id}`)
  ).json();
  expect(duplicate.recipients).toEqual([]);
  expect(duplicate.wedding.published).toBeNull();
  await post(page, { action: "unpublish", id: wedding.id });
  expect(
    (await anonymous.request.get(`${origin}/c/${guest.token}`)).status(),
  ).toBe(404);
  await anonymous.close();
});

test("editor, PDF, PNG e ZIP funcionam nos dois temas", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page);
  await page.getByRole("button", { name: "Novo convite", exact: true }).click();
  await expect(page.locator(".live-preview .reference-paper")).toBeVisible();
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page.locator(".theme-option").filter({ hasText: "Marfim" }).click();
  await page.getByRole("button", { name: "Conteúdo", exact: true }).click();
  await page.getByLabel("Primeiro nome do casal").fill("Débora");
  await page.getByLabel("Segundo nome do casal").fill("Paulo");
  await page.getByLabel("Data do casamento").fill("2027-10-04");
  await page
    .getByLabel("Nome do local", { exact: true })
    .nth(0)
    .fill(sampleContent.ceremonyName);
  await page
    .getByLabel("Nome do local", { exact: true })
    .nth(1)
    .fill(sampleContent.receptionName);
  await page
    .getByLabel("Morada completa")
    .nth(0)
    .fill(sampleContent.ceremonyAddress);
  await page
    .getByLabel("Morada completa")
    .nth(1)
    .fill(sampleContent.receptionAddress);
  await page.getByLabel("WhatsApp com indicativo").fill(sampleContent.whatsapp);
  await page.getByLabel("Data de validade do convite").fill("2099-12-31");
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Convite publicado");
  const draftPdf = await downloaded(page, () =>
    page
      .getByRole("button", { name: "Ver rascunho em PDF", exact: true })
      .click(),
  );
  expect((await pdfInfo(draftPdf.bytes)).text.replace(/\s/g, "")).toContain(
    "RASCUNHO",
  );
  await page
    .getByRole("button", { name: "Convidados", exact: false })
    .filter({ has: page.locator("svg") })
    .first()
    .click();
  await page
    .getByLabel("Nomes dos destinatários")
    .fill("João & Maria\nAna e família");
  await page.getByRole("button", { name: "Adicionar à lista" }).click();
  await expect(page.getByRole("status")).toContainText("2 destinatário");
  const pdf = await downloaded(page, () =>
    page
      .getByRole("button", { name: "PDF de João & Maria", exact: true })
      .click(),
  );
  const ivory = await pdfInfo(pdf.bytes);
  expect(ivory.pages).toBe(1);
  await writeFile("outputs/invitation-ivory.pdf", pdf.bytes);
  expect(ivory.text).toContain("João & Maria");
  expect(ivory.text).toContain("Débora");
  expect(ivory.text).toContain(
    sampleContent.ceremonyAddress.toLocaleUpperCase("pt"),
  );
  expect(ivory.width).toBeCloseTo(419.53, 1);
  expect(ivory.height).toBeCloseTo(595.28, 1);
  expect(ivory.annotations.some((item) => item.url?.includes("wa.me"))).toBe(
    true,
  );
  const png = await downloaded(page, () =>
    page
      .getByRole("button", { name: "PNG de João & Maria", exact: true })
      .click(),
  );
  const image = png.name.endsWith(".zip")
    ? Object.values(unzipSync(png.bytes))[0]
    : png.bytes;
  expect([...image.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const imageView = new DataView(
    image.buffer,
    image.byteOffset,
    image.byteLength,
  );
  await writeFile("outputs/invitation-ivory.png", image);
  expect(imageView.getUint32(16)).toBeCloseTo(1748, -1);
  expect(imageView.getUint32(20)).toBeCloseTo(2480, -1);
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page.getByRole("button", { name: "Verde & ouro" }).click();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Convite publicado");
  await page.screenshot({ path: "outputs/editor-desktop.png", fullPage: true });
  await page
    .getByRole("button", { name: "Convidados", exact: false })
    .filter({ has: page.locator("svg") })
    .first()
    .click();
  const forest = await downloaded(page, () =>
    page
      .getByRole("button", { name: "PDF de João & Maria", exact: true })
      .click(),
  );
  await writeFile("outputs/invitation-forest.pdf", forest.bytes);
  const forestInfo = await pdfInfo(forest.bytes);
  expect(forestInfo.text).toContain("Débora");
  expect(forestInfo.pages).toBeGreaterThanOrEqual(2);
  expect(forestInfo.height).toBeCloseTo(REFERENCE_PRINT.height, 1);
  await page
    .getByRole("checkbox", {
      name: "Selecionar todos os destinatários visíveis e ativos",
    })
    .check();
  await page.getByRole("button", { name: "Exportar 2 selecionado(s)" }).click();
  const zip = await downloaded(page, () =>
    page.getByRole("button", { name: "Descarregar ZIP de PDFs" }).click(),
  );
  const files = unzipSync(zip.bytes);
  expect(
    Object.keys(files).filter((name) => name.endsWith(".pdf")),
  ).toHaveLength(2);
  for (const bytes of Object.values(files))
    expect((await pdfInfo(bytes)).text).toContain("Débora");
  const imageZip = await downloaded(page, () =>
    page.getByRole("button", { name: "Descarregar ZIP de imagens" }).click(),
  );
  expect(
    Object.keys(unzipSync(imageZip.bytes)).filter((name) =>
      name.endsWith(".png"),
    ).length,
  ).toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);
});

test("conteúdo longo mantém todas as páginas e exportação pode ser cancelada", async ({
  page,
}) => {
  await signIn(page);
  const { wedding } = await post(page, { action: "create" });
  const longContent = {
    ...sampleContent,
    ...palettes.forest,
    theme: "forest",
    message: `${"Uma história de amor com todas as pessoas especiais. ".repeat(110)} MARCADOR-FINAL-MENSAGEM`,
    closing: "MARCADOR-ENCERRAMENTO",
  };
  await post(page, { action: "save", id: wedding.id, data: longContent });
  await post(page, { action: "publish", id: wedding.id });
  const longName =
    "Maria da Conceição e António Luís de Albuquerque com toda a família";
  await post(page, {
    action: "addRecipients",
    id: wedding.id,
    data: [longName, "Segundo destinatário"],
  });
  await page.reload();
  await page.locator(".wedding-card").first().click();
  await page
    .getByRole("button", { name: "Convidados", exact: false })
    .filter({ has: page.locator("svg") })
    .first()
    .click();
  const file = await downloaded(page, () =>
    page
      .getByRole("button", { name: `PDF de ${longName}`, exact: true })
      .click(),
  );
  const document = await pdfInfo(file.bytes);
  expect(document.pages).toBeGreaterThan(1);
  expect(document.text).toContain("MARCADOR-FINAL-MENSAGEM");
  expect(document.text).toContain("MARCADOR-ENCERRAMENTO");
  for (const pageText of document.pageTexts)
    expect(
      pageText.replace(/\s/g, "").replaceAll("RSVP", "").length,
    ).toBeGreaterThan(10);
  await page
    .getByRole("checkbox", {
      name: "Selecionar todos os destinatários visíveis e ativos",
    })
    .check();
  await page.getByRole("button", { name: "Exportar 2 selecionado(s)" }).click();
  let downloads = 0;
  page.on("download", () => downloads++);
  await page
    .getByRole("button", { name: "Descarregar ZIP de imagens" })
    .click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Exportação cancelada", {
    timeout: 60000,
  });
  expect(downloads).toBe(0);
});
