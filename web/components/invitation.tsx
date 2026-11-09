import type { CSSProperties } from "react";
import { ReferenceThumbnail } from "./reference-thumbnail";
import { ReferenceInvitationView } from "./reference-invitation-view";
import {
  displayDate,
  mapUrl,
  whatsappUrl,
  type InvitationContent,
} from "@/lib/invitations";

export function Flourish({
  variant = "botanical",
}: {
  variant?: InvitationContent["ornament"];
}) {
  if (variant === "none") return null;
  return (
    <svg
      className="flourish"
      viewBox="0 0 160 48"
      fill="none"
      stroke="currentColor"
      strokeWidth=".8"
      aria-hidden="true"
    >
      <path d="M12 24H62M98 24H148M80 15l9 9-9 9-9-9z" />
      {variant === "botanical" && (
        <>
          <path d="M57 25C43 18 36 10 30 5M103 25C117 18 124 10 130 5M57 25C43 30 36 36 30 43M103 25C117 30 124 36 130 43" />
          <path d="M43 16Q29 18 30 5Q44 4 43 16ZM117 16Q131 18 130 5Q116 4 117 16ZM43 33Q29 30 30 43Q44 44 43 33ZM117 33Q131 30 130 43Q116 44 117 33Z" />
        </>
      )}
    </svg>
  );
}
export function Invitation({
  content: c,
  recipient = "Nome do convidado",
  compact = false,
  interactive = true,
}: {
  content: InvitationContent;
  recipient?: string;
  compact?: boolean;
  interactive?: boolean;
}) {
  if (c.theme === "forest") return <article className={`invitation reference-invitation ${compact ? "invitation--compact" : ""}`}>{compact ? <ReferenceThumbnail content={c} recipient={recipient} /> : <ReferenceInvitationView content={c} recipient={recipient} interactive={interactive} />}</article>;
  const style = {
    "--paper": c.background,
    "--ink": c.foreground,
    "--gold": c.accent,
    "--names-font":
      c.font === "script" ? "'Pinyon Script'" : "'Cormorant Garamond'",
  } as CSSProperties;
  return (
    <article
      className={`invitation ${compact ? "invitation--compact" : ""} ornament-${c.ornament}`}
      style={style}
    >
      <div className="invitation-border" aria-hidden="true" />
      <div className="invitation-inner">
        <Flourish variant={c.ornament} />
        <p className="invitation-eyebrow">JUNTOS, PARA SEMPRE</p>
        <h1
          className={`couple-names ${c.font === "script" ? "script-names" : ""}`}
        >
          <span>{c.partner1 || "Nome"}</span>
          <em>&</em>
          <span>{c.partner2 || "Nome"}</span>
        </h1>
        <div className="invitation-rule" />
        <p className="recipient-caption">COM CARINHO, PARA</p>
        <h2 className="recipient-name">{recipient}</h2>
        <p className="invitation-message">{c.message}</p>
        <p className="invitation-date">{displayDate(c.date)}</p>
        <div className="event-locations">
          <section>
            <p className="location-label">
              A CERIMÓNIA · {c.ceremonyTime.replace(":", "h")}
            </p>
            <h3>{c.ceremonyName || "Local da cerimónia"}</h3>
            <p>{c.ceremonyAddress || "Morada da cerimónia"}</p>
            {interactive && (
              <a
                href={mapUrl(c.ceremonyName, c.ceremonyAddress, c.ceremonyMap)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver localização <span aria-hidden="true">↗</span>
              </a>
            )}
          </section>
          <span className="location-divider" aria-hidden="true">
            ✧
          </span>
          <section>
            <p className="location-label">
              A CELEBRAÇÃO · {c.receptionTime.replace(":", "h")}
            </p>
            <h3>{c.receptionName || "Local da celebração"}</h3>
            <p>{c.receptionAddress || "Morada da celebração"}</p>
            {interactive && (
              <a
                href={mapUrl(
                  c.receptionName,
                  c.receptionAddress,
                  c.receptionMap,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver localização <span aria-hidden="true">↗</span>
              </a>
            )}
          </section>
        </div>
        {c.closing && <p className="invitation-closing">{c.closing}</p>}
        {interactive && (
          <a
            className="rsvp-button"
            href={whatsappUrl(c, recipient)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Confirmar presença <span aria-hidden="true">↗</span>
          </a>
        )}
        <Flourish variant={c.ornament} />
      </div>
    </article>
  );
}
