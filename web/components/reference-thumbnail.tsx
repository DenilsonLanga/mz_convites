import type { CSSProperties } from "react";
import type { InvitationContent } from "@/lib/invitations";

export function ReferenceThumbnail({
  content: c,
  recipient,
}: {
  content: InvitationContent;
  recipient: string;
}) {
  const date = c.date ? c.date.split("-").reverse().join(".") : "DIA.MÊS.ANO";
  return (
    <div
      className="reference-paper"
      style={
        {
          "--reference-names-font":
            c.font === "classic" ? "'Cormorant Garamond'" : "'Pinyon Script'",
        } as CSSProperties
      }
      aria-label="Modelo verde e dourado da referência"
    >
      <div className="reference-preview-text" aria-hidden="true">
        <p className="reference-preview-first">{c.partner1 || "Nome"}</p>
        <p className="reference-preview-and">E</p>
        <p className="reference-preview-second">{c.partner2 || "Nome"}</p>
        <div className="reference-preview-body">
          <p className="reference-preview-message">{c.message}</p>
          <p className="reference-preview-recipient">{recipient}</p>
          <p className="reference-preview-date">
            {date} | ÀS {c.ceremonyTime.replace(":", "H")}
          </p>
          <div className="reference-preview-venue">
            <p>{c.ceremonyName || "Local da cerimónia"}</p>
            <p>{c.ceremonyAddress || "Morada da cerimónia"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
