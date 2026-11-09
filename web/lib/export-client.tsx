import { pdf } from "@react-pdf/renderer";
import { Zip, ZipPassThrough, strToU8 } from "fflate";
import {
  InvitationPDF,
  registerInvitationFonts,
} from "@/components/invitation-pdf";
import {
  coupleName,
  fileSlug,
  type InvitationContent,
  type Recipient,
} from "./invitations";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export async function makePdf(
  content: InvitationContent,
  name: string,
  link?: string,
  preview = false,
) {
  registerInvitationFonts(window.location.origin);
  if (content.theme === "forest") {
    await Promise.all([
      document.fonts.load('57px "Pinyon Script"'),
      document.fonts.load('57px "Cormorant Garamond"'),
    ]);
  }
  return pdf(
    <InvitationPDF
      content={content}
      recipient={name}
      link={link}
      preview={preview}
    />,
  ).toBlob();
}
export async function downloadPreview(
  content: InvitationContent,
  name: string,
) {
  const blob = await makePdf(content, name, undefined, true);
  download(blob, `rascunho-${fileSlug(coupleName(content))}.pdf`);
}
async function* pngPages(blob: Blob, cancelled: () => boolean) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({
    data: new Uint8Array(await blob.arrayBuffer()),
  });
  const documentPdf = await task.promise;
  try {
    for (let pageNumber = 1; pageNumber <= documentPdf.numPages; pageNumber++) {
      if (cancelled()) return;
      const page = await documentPdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 300 / 72 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      try {
        const context = canvas.getContext("2d");
        if (!context)
          throw new Error("O navegador não suporta a geração de imagens.");
        await page.render({ canvasContext: context, canvas, viewport }).promise;
        const image = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (result) =>
              result
                ? resolve(result)
                : reject(new Error("Falha ao criar a imagem.")),
            "image/png",
          ),
        );
        yield { blob: image, page: pageNumber, total: documentPdf.numPages };
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    }
  } finally {
    await documentPdf.destroy();
  }
}
export async function exportInvitations(
  content: InvitationContent,
  recipients: Recipient[],
  format: "pdf" | "png",
  batch: boolean,
  onProgress: (text: string) => void,
  cancelled: () => boolean,
) {
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let zipError: Error | null = null;
  let finished!: () => void;
  const completed = new Promise<void>((resolve) => {
    finished = resolve;
  });
  const zip = batch
    ? new Zip((error, chunk, final) => {
        if (error) {
          zipError = error;
          finished();
          return;
        }
        chunks.push(new Uint8Array(chunk));
        if (final) finished();
      })
    : null;
  const failures: string[] = [];
  let successCount = 0;
  function addFile(name: string, bytes: Uint8Array) {
    const entry = new ZipPassThrough(name);
    zip!.add(entry);
    entry.push(bytes, true);
    if (zipError) throw zipError;
  }
  try {
    for (let index = 0; index < recipients.length; index++) {
      if (cancelled()) return;
      const guest = recipients[index];
      onProgress(`${index + 1} de ${recipients.length} · ${guest.name}`);
      const basename = `${fileSlug(guest.name)}-${guest.id.slice(0, 8)}`;
      try {
        const blob = await makePdf(
          content,
          guest.name,
          `${window.location.origin}/c/${guest.token}`,
        );
        if (cancelled()) return;
        if (format === "pdf") {
          if (zip)
            addFile(
              `${basename}.pdf`,
              new Uint8Array(await blob.arrayBuffer()),
            );
          else download(blob, `${basename}.pdf`);
        } else {
          // A single multipage invitation is packaged as a ZIP to avoid blocked automatic downloads.
          let singleZip: Zip | null = null;
          const singleChunks: Uint8Array<ArrayBuffer>[] = [];
          for await (const image of pngPages(blob, cancelled)) {
            if (cancelled()) return;
            const filename = `${basename}${image.total > 1 ? `-pagina-${image.page}` : ""}.png`;
            const bytes = new Uint8Array(await image.blob.arrayBuffer());
            if (zip) addFile(filename, bytes);
            else if (image.total === 1) download(image.blob, filename);
            else {
              singleZip ??= new Zip((error, chunk) => {
                if (error) throw error;
                singleChunks.push(new Uint8Array(chunk));
              });
              const entry = new ZipPassThrough(filename);
              singleZip.add(entry);
              entry.push(bytes, true);
            }
          }
          if (singleZip && !cancelled()) {
            singleZip.end();
            download(
              new Blob(singleChunks, { type: "application/zip" }),
              `${basename}-imagens.zip`,
            );
          }
        }
        successCount++;
      } catch (error) {
        const message = `${guest.name}: ${error instanceof Error ? error.message : "Falha na geração"}`;
        if (!batch) throw new Error(message);
        failures.push(message);
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (cancelled()) return;
    if (!successCount)
      throw new Error(
        `Não foi possível gerar os convites.\n${failures.join("\n")}`,
      );
    if (zip) {
      if (failures.length) addFile("falhas.txt", strToU8(failures.join("\n")));
      zip.end();
      await completed;
      if (zipError) throw zipError;
      download(
        new Blob(chunks, { type: "application/zip" }),
        `${fileSlug(coupleName(content))}-${format}.zip`,
      );
    }
    if (failures.length)
      throw new Error(
        `${successCount} convite(s) gerado(s). ${failures.length} falha(s), descritas no ficheiro falhas.txt do ZIP.`,
      );
  } finally {
    zip?.terminate();
    chunks.length = 0;
  }
}
