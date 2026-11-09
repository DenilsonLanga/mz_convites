"use client";
import { useEffect, useState } from "react";
import {
  coupleName,
  displayDate,
  mapUrl,
  whatsappUrl,
  type InvitationContent,
} from "@/lib/invitations";
import { ReferenceThumbnail } from "./reference-thumbnail";

type Hotspot = {
  href: string;
  left: number;
  top: number;
  width: number;
  height: number;
};
type PageImage = {
  src: string;
  width: number;
  height: number;
  links: Hotspot[];
};

export function ReferenceInvitationView({
  content,
  recipient,
  interactive,
}: {
  content: InvitationContent;
  recipient: string;
  interactive: boolean;
}) {
  const [pages, setPages] = useState<PageImage[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const serialized = JSON.stringify(content);
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    setPages([]);
    setReady(false);
    setError("");
    async function render() {
      const [{ makePdf }, pdfjs] = await Promise.all([
        import("@/lib/export-client"),
        import("pdfjs-dist"),
      ]);
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const pdf = await makePdf(
        JSON.parse(serialized),
        recipient,
        window.location.href,
      );
      if (cancelled) return;
      const document = await pdfjs.getDocument({
        data: new Uint8Array(await pdf.arrayBuffer()),
      }).promise;
      try {
        for (let index = 1; index <= document.numPages; index++) {
          if (cancelled) return;
          const page = await document.getPage(index);
          const viewport = page.getViewport({
            scale: 1200 / page.getViewport({ scale: 1 }).width,
          });
          const canvas = window.document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          try {
            const context = canvas.getContext("2d");
            if (!context)
              throw new Error("Não foi possível preparar a imagem do convite.");
            await page.render({ canvas, canvasContext: context, viewport })
              .promise;
            const blob = await new Promise<Blob>((resolve, reject) =>
              canvas.toBlob(
                (value) =>
                  value
                    ? resolve(value)
                    : reject(new Error("Não foi possível abrir o convite.")),
                "image/png",
              ),
            );
            if (cancelled) return;
            const src = URL.createObjectURL(blob);
            urls.push(src);
            const links: Hotspot[] = [];
            for (const annotation of await page.getAnnotations()) {
              if (
                annotation.subtype !== "Link" ||
                !annotation.url ||
                !Array.isArray(annotation.rect)
              )
                continue;
              const url = new URL(annotation.url);
              if (
                url.protocol !== "https:" &&
                url.origin !== window.location.origin
              )
                continue;
              const rect = viewport.convertToViewportRectangle(annotation.rect);
              links.push({
                href: url.href,
                left: (Math.min(rect[0], rect[2]) / viewport.width) * 100,
                top: (Math.min(rect[1], rect[3]) / viewport.height) * 100,
                width: (Math.abs(rect[2] - rect[0]) / viewport.width) * 100,
                height: (Math.abs(rect[3] - rect[1]) / viewport.height) * 100,
              });
            }
            if (!cancelled)
              setPages((previous) => [
                ...previous,
                { src, width: canvas.width, height: canvas.height, links },
              ]);
          } finally {
            canvas.width = 0;
            canvas.height = 0;
            page.cleanup();
          }
        }
        if (!cancelled) setReady(true);
      } finally {
        await document.destroy();
      }
    }
    render().catch((reason) => {
      if (!cancelled)
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível abrir o convite.",
        );
    });
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [serialized, recipient]);
  return (
    <div className="reference-viewer" aria-busy={!ready && !error}>
      <div className="reference-accessible-content">
        <h1>{coupleName(content)}</h1>
        <p>{content.message}</p>
        <h2>{recipient}</h2>
        <p>{displayDate(content.date)}</p>
        <p>
          {content.ceremonyName} · {content.ceremonyTime} ·{" "}
          {content.ceremonyAddress}
        </p>
        <p>
          {content.receptionName} · {content.receptionTime} ·{" "}
          {content.receptionAddress}
        </p>
        <p>{content.closing}</p>
        {interactive && (
          <>
            <a
              href={mapUrl(
                content.ceremonyName,
                content.ceremonyAddress,
                content.ceremonyMap,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver localização da cerimónia
            </a>
            <a
              href={mapUrl(
                content.receptionName,
                content.receptionAddress,
                content.receptionMap,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver localização da celebração
            </a>
            <a
              href={whatsappUrl(content, recipient)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Confirmar presença
            </a>
          </>
        )}
      </div>
      {pages.length === 0 && (
        <ReferenceThumbnail content={content} recipient={recipient} />
      )}
      <div className="reference-viewer-pages">
        {pages.map((page, index) => (
          <div className="reference-rendered-page" key={page.src}>
            <img
              src={page.src}
              width={page.width}
              height={page.height}
              alt={`Convite de ${coupleName(content)} para ${recipient} — página ${index + 1}`}
            />
            {interactive &&
              page.links.map((link, number) => (
                <a
                  key={number}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-hidden="true"
                  tabIndex={-1}
                  className="reference-link-hotspot"
                  style={{
                    left: `${link.left}%`,
                    top: `${link.top}%`,
                    width: `${link.width}%`,
                    height: `${link.height}%`,
                  }}
                />
              ))}
          </div>
        ))}
      </div>
      {error ? (
        <p className="reference-load-status" role="alert">
          {error} Recarregue a página para tentar novamente.
        </p>
      ) : (
        !ready && (
          <p className="reference-load-status" role="status">
            A preparar o convite…
          </p>
        )
      )}
    </div>
  );
}
