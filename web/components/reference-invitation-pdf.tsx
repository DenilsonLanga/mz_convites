import {
  Document,
  Image,
  Link,
  Page,
  Svg,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";
import {
  coupleName,
  mapUrl,
  whatsappUrl,
  type InvitationContent,
} from "@/lib/invitations";
import { REFERENCE_PRINT as design } from "@/lib/print-design";

const ink = "#F4D481";
const styles = StyleSheet.create({
  page: {
    paddingTop: 134,
    paddingHorizontal: 61,
    paddingBottom: 115,
    fontFamily: "Cinzel",
    fontSize: 12,
    lineHeight: 1.35,
    color: ink,
    textAlign: "center",
  },
  recipient: {
    fontSize: 11,
    lineHeight: 1.4,
    textTransform: "uppercase",
    marginTop: 6,
    marginBottom: 6,
    letterSpacing: 0.65,
    color: ink,
  },
  conjunction: { marginTop: 14, marginBottom: 7 },
  message: {
    fontSize: 11.2,
    textTransform: "uppercase",
    lineHeight: 1.4,
    marginTop: 28,
    marginBottom: 0,
    letterSpacing: 0.3,
  },
  date: {
    fontSize: 16.3,
    letterSpacing: 1.3,
    lineHeight: 1.4,
    marginBottom: 27,
  },
  venueName: {
    fontSize: 11.5,
    letterSpacing: 0.5,
    lineHeight: 1.6,
    textTransform: "uppercase",
  },
  address: {
    fontSize: 11.5,
    lineHeight: 1.6,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  supplementary: { marginTop: 24 },
  section: { marginBottom: 22 },
  heading: { fontSize: 12, letterSpacing: 1, marginBottom: 10 },
  closing: { fontSize: 13, lineHeight: 1.7, marginBottom: 24 },
  contact: { fontSize: 11, lineHeight: 1.6, letterSpacing: 0.5 },
  rsvp: {
    position: "absolute",
    bottom: 157.5,
    left: 61,
    right: 61,
    textAlign: "center",
    fontSize: 17,
    letterSpacing: 3,
  },
  draft: {
    position: "absolute",
    bottom: 25,
    left: 61,
    right: 61,
    fontSize: 5,
    color: ink,
    letterSpacing: 1,
  },
});

// The names remain vector text. Highlight and shadow layers give the gold its raised foil finish.
function FoilLine({
  text,
  fontSize,
  fontFamily = "PinyonScript",
  height = fontSize + 5,
}: {
  text: string;
  fontSize: number;
  fontFamily?: string;
  height?: number;
}) {
  const width = design.width - 122;
  const typography = { fontFamily, fontSize };
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ fontFamily, fontSize }}
    >
      <Text
        {...typography}
        x={width / 2 + 0.65}
        y={fontSize * 0.95 + 0.8}
        textAnchor="middle"
        fill="#001B17"
      >
        {text}
      </Text>
      <Text
        {...typography}
        x={width / 2 - 0.2}
        y={fontSize * 0.95 - 0.2}
        textAnchor="middle"
        fill="#FFF3CB"
      >
        {text}
      </Text>
      <Text
        {...typography}
        x={width / 2}
        y={fontSize * 0.95}
        textAnchor="middle"
        fill="#F1CF77"
      >
        {text}
      </Text>
    </Svg>
  );
}

function nameLines(name: string, classic: boolean) {
  // Keep the calligraphy readable; long names flow onto further lines/pages, never shrink to fit.
  const words = (name || "Nome").trim().split(/\s+/);
  const context = document.createElement("canvas").getContext("2d");
  if (!context)
    throw new Error("Não foi possível preparar a caligrafia do convite.");
  context.font = `57px "${classic ? "Cormorant Garamond" : "Pinyon Script"}"`;
  const fits = (text: string) =>
    context.measureText(text).width <= design.width - 134;
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && !fits(`${line} ${word}`)) {
      lines.push(line);
      line = "";
    }
    if (fits(word)) line = line ? `${line} ${word}` : word;
    else
      for (const letter of Array.from(word)) {
        if (line && !fits(line + letter)) {
          lines.push(line);
          line = "";
        }
        line += letter;
      }
  }
  if (line) lines.push(line);
  return lines;
}

function ReferenceSheet({
  content: c,
  recipient,
  preview,
  children,
}: {
  content: InvitationContent;
  recipient: string;
  preview: boolean;
  children: ReactNode;
}) {
  return (
    <Page size={[design.width, design.height]} style={styles.page} wrap>
      <Image
        src={design.original}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: design.width,
          height: design.height,
        }}
        fixed
      />
      <View
        style={{
          position: "absolute",
          top: (250 * design.width) / 992,
          left: (180 * design.width) / 992,
          width: (630 * design.width) / 992,
          height: (1000 * design.width) / 992,
          overflow: "hidden",
        }}
        fixed
      >
        <Image
          src={design.background}
          style={{
            position: "absolute",
            left: (-180 * design.width) / 992,
            top: (-250 * design.width) / 992,
            width: design.width,
            height: design.height,
          }}
        />
      </View>
      {children}
      {preview && (
        <Text style={styles.draft} fixed>
          RASCUNHO · NÃO PUBLICADO
        </Text>
      )}
    </Page>
  );
}

export function ReferenceInvitationPDF({
  content: c,
  recipient,
  link,
  preview,
}: {
  content: InvitationContent;
  recipient: string;
  link?: string;
  preview: boolean;
}) {
  const date = c.date ? c.date.split("-").reverse().join(".") : "DIA.MÊS.ANO";
  return (
    <Document
      title={`${preview ? "RASCUNHO — " : ""}${coupleName(c)} — ${recipient}`}
      author="MZ Convites"
      language="pt-MZ"
    >
      <ReferenceSheet content={c} recipient={recipient} preview={preview}>
        {nameLines(c.partner1, c.font === "classic").map((line, index) => (
          <FoilLine
            key={`first-${index}`}
            text={line}
            fontSize={57}
            fontFamily={c.font === "classic" ? "Cormorant" : "PinyonScript"}
          />
        ))}
        <View style={styles.conjunction} wrap={false}>
          <FoilLine text="E" fontSize={17} fontFamily="Cormorant" height={22} />
        </View>
        {nameLines(c.partner2, c.font === "classic").map((line, index) => (
          <FoilLine
            key={`second-${index}`}
            text={line}
            fontSize={57}
            fontFamily={c.font === "classic" ? "Cormorant" : "PinyonScript"}
          />
        ))}
        <Text
          style={styles.message}
          orphans={2}
          widows={2}
          minPresenceAhead={26}
        >
          {c.message}
        </Text>
        <Text style={styles.recipient} orphans={2} widows={2}>
          {recipient}
        </Text>
        <Text style={styles.date} minPresenceAhead={48}>
          {link ? (
            <Link src={link} style={{ color: ink, textDecoration: "none" }}>
              {date}
            </Link>
          ) : (
            date
          )}{" "}
          | ÀS {c.ceremonyTime.replace(":", "H") || "00H00"}
        </Text>
        <View>
          <Link
            src={mapUrl(c.ceremonyName, c.ceremonyAddress, c.ceremonyMap)}
            style={{ color: ink, textDecoration: "none" }}
          >
            <Text style={styles.venueName} minPresenceAhead={18}>
              {c.ceremonyName || "Local da cerimónia"}
            </Text>
            <Text style={styles.address}>
              {c.ceremonyAddress || "Morada da cerimónia"}
            </Text>
          </Link>
        </View>
      </ReferenceSheet>
      <ReferenceSheet content={c} recipient={recipient} preview={preview}>
        <View style={styles.supplementary}>
          <View style={styles.section} minPresenceAhead={65}>
            <Text style={styles.heading}>
              A CELEBRAÇÃO · {c.receptionTime.replace(":", "H")}
            </Text>
            <Link
              src={mapUrl(c.receptionName, c.receptionAddress, c.receptionMap)}
              style={{ color: ink, textDecoration: "none" }}
            >
              <Text style={styles.venueName}>
                {c.receptionName || "Local da celebração"}
              </Text>
              <Text style={styles.address}>
                {c.receptionAddress || "Morada da celebração"}
              </Text>
            </Link>
          </View>
          {c.closing && (
            <Text style={styles.closing} orphans={2} widows={2}>
              {c.closing}
            </Text>
          )}
          <Link
            src={whatsappUrl(c, recipient)}
            style={[styles.contact, { color: ink, textDecoration: "none" }]}
          >
            CONFIRMAÇÃO DE PRESENÇA{"\n"}
            {c.whatsapp}
          </Link>
        </View>
      </ReferenceSheet>
    </Document>
  );
}
