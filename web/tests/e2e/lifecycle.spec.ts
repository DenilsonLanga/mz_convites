import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { sampleContent } from "../../lib/invitations";

async function signIn(page: Page) {
  await page.goto("/signin-with-chatgpt?return_to=/");
  await expect(
    page.getByRole("button", { name: "Novo convite", exact: true }),
  ).toBeEnabled();
}
async function post(page: Page, data: Record<string, unknown>) {
  const response = await page.request.post("/api/admin", {
    headers: { Origin: "http://127.0.0.1:3001" },
    data,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}

test("novo convite mostra a arte da referência sem sobreposição e permite eliminar o rascunho", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("button", { name: "Novo convite", exact: true }).click();
  const paper = page.locator(".live-preview .reference-paper");
  await expect(paper).toBeVisible();
  expect(
    await paper.evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toContain("petrol-gold-original.png");
  await page
    .getByLabel("Mensagem do convite")
    .fill("Com amor e alegria, convidamos para celebrar o nosso casamento.");
  const phrase = await paper
    .locator(".reference-preview-message")
    .boundingBox();
  const guest = await paper
    .locator(".reference-preview-recipient")
    .boundingBox();
  const date = await paper.locator(".reference-preview-date").boundingBox();
  expect(guest!.y).toBeGreaterThan(phrase!.y + phrase!.height);
  expect(date!.y).toBeGreaterThan(guest!.y + guest!.height);
  await page.screenshot({
    path: "outputs/new-invitation-reference.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Pré-visualizar", exact: true })
    .click();
  await expect(page.locator(".modal .reference-rendered-page img")).toHaveCount(
    2,
    { timeout: 60000 },
  );
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Eliminar rascunho", exact: true })
    .click();
  await expect(page.getByLabel("Mensagem do convite")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Eliminar rascunho", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Rascunho eliminado");
});

test("validade manual impede eliminar ou encurtar publicados, incluindo após retirar de publicação", async ({
  page,
}) => {
  await signIn(page);
  const { wedding } = await post(page, { action: "create" });
  await post(page, {
    action: "save",
    id: wedding.id,
    data: { ...sampleContent, partner1: "Validade", partner2: "Exclusão" },
  });
  const send = (data: Record<string, unknown>) =>
    page.request.post("/api/admin", {
      headers: { Origin: "http://127.0.0.1:3001" },
      data,
    });
  expect((await send({ action: "publish", id: wedding.id })).status()).toBe(
    400,
  );
  await post(page, {
    action: "publish",
    id: wedding.id,
    expiresOn: "2099-12-31",
  });
  await post(page, {
    action: "addRecipients",
    id: wedding.id,
    data: ["Família do teste de validade"],
  });
  const detail = await (
    await page.request.get(`/api/admin?id=${wedding.id}`)
  ).json();
  const token = detail.recipients[0].token;
  expect((await send({ action: "delete", id: wedding.id })).status()).toBe(409);
  expect(
    (
      await send({ action: "publish", id: wedding.id, expiresOn: "2099-01-01" })
    ).status(),
  ).toBe(409);
  await post(page, { action: "unpublish", id: wedding.id });
  expect((await send({ action: "delete", id: wedding.id })).status()).toBe(409);
  await post(page, {
    action: "publish",
    id: wedding.id,
    expiresOn: "2099-12-31",
  });
  // Simulate an elapsed date in the isolated test database, without a clock bypass in the app.
  execFileSync(
    process.execPath,
    [
      "--import",
      "./scripts/sites-env.mjs",
      "./node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      "dist/server/wrangler.json",
      "--persist-to",
      ".wrangler/test-state",
      "--command",
      `UPDATE weddings SET expires_on = '2000-01-01' WHERE id = '${wedding.id}'`,
    ],
    { cwd: process.cwd(), stdio: "pipe" },
  );
  expect((await page.request.get(`/c/${token}`)).status()).toBe(404);
  await post(page, { action: "delete", id: wedding.id });
  expect((await page.request.get(`/api/admin?id=${wedding.id}`)).status()).toBe(
    404,
  );
});
