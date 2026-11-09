import {
  Document,
  Image,
  Page,
  Text,
  View,
  Link,
  Font,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  coupleName,
  mapUrl,
  whatsappUrl,
  type InvitationContent,
} from "@/lib/invitations";
import { PrintArtwork } from "./print-artwork";
import { ReferenceInvitationPDF } from "./reference-invitation-pdf";

let registered = false;
export function registerInvitationFonts(origin: string) {
  if (registered) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: `${origin}/fonts/inter-regular.woff`, fontWeight: 400 },
      { src: `${origin}/fonts/inter-semibold.woff`, fontWeight: 600 },
    ],
  });
  Font.register({
    family: "Cormorant",
    src: `${origin}/fonts/cormorant-regular.woff`,
  });
  Font.register({
    family: "PinyonScript",
    src: `${origin}/fonts/pinyon-script.ttf`,
  });
  Font.register({
    family: "Cinzel",
    src: `${origin}/fonts/cinzel-regular.woff`,
  });
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 155,
    paddingHorizontal: 78,
    paddingBottom: 80,
    fontFamily: "Inter",
    fontSize: 6,
    lineHeight: 1.6,
    textAlign: "center",
  },
  names: { fontSize: 36, lineHeight: 1.32, textAlign: "center" },
  conjunction: {
    fontFamily: "Cormorant",
    fontSize: 8,
    marginTop: 7,
    marginBottom: 16,
    lineHeight: 1.4,
  },
  namesBlock: { marginBottom: 35 },
  message: {
    fontSize: 6.1,
    lineHeight: 1.65,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  recipient: {
    fontSize: 5.5,
    lineHeight: 1.6,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  date: {
    fontSize: 8,
    letterSpacing: 1.25,
    marginBottom: 21,
    lineHeight: 1.45,
  },
  venue: {
    fontSize: 5.8,
    lineHeight: 1.65,
    letterSpacing: 0.65,
    textTransform: "uppercase",
  },
  address: { fontSize: 5.1, lineHeight: 1.7, textTransform: "uppercase" },
  secondVenue: { marginTop: 12 },
  closing: {
    fontSize: 5.5,
    lineHeight: 1.75,
    marginTop: 16,
    textTransform: "uppercase",
  },
  contact: {
    marginTop: 12,
    fontSize: 4.8,
    letterSpacing: 0.25,
    lineHeight: 1.5,
  },
  draft: {
    position: "absolute",
    left: 70,
    right: 70,
    bottom: 37,
    fontSize: 4.5,
    letterSpacing: 1.2,
  },
});
function printDate(date: string) {
  return date ? date.split("-").reverse().join(".") : "DIA.MÊS.ANO";
}

export function InvitationPDF({
  content: c,
  recipient,
  link,
  preview = false,
}: {
  content: InvitationContent;
  recipient: string;
  link?: string;
  preview?: boolean;
}) {
  if (c.theme === "forest")
    return (
      <ReferenceInvitationPDF
        content={c}
        recipient={recipient}
        link={link}
        preview={preview}
      />
    );
  const fontFamily = c.font === "script" ? "PinyonScript" : "Cormorant";
  const namesSize = (name: string) =>
    name.length > 100 ? 16 : name.length > 60 ? 22 : name.length > 26 ? 29 : 36;
  return (
    <Document
      title={`${preview ? "RASCUNHO — " : ""}${coupleName(c)} — ${recipient}`}
      author="MZ Convites"
      language="pt-MZ"
    >
      <Page
        size="A5"
        style={[
          styles.page,
          { backgroundColor: c.background, color: c.foreground },
        ]}
        wrap
      >
        <PrintArtwork content={c} />
        <Image
          src="/print/paper-grain.png"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 419.53,
            height: 595.28,
            opacity: 0.72,
          }}
          fixed
        />
        <View style={styles.namesBlock} wrap={false}>
          <Text
            style={[
              styles.names,
              { fontFamily, color: c.accent, fontSize: namesSize(c.partner1) },
            ]}
          >
            {c.partner1 || "Nome"}
          </Text>
          <Text style={[styles.conjunction, { color: c.accent }]}>E</Text>
          <Text
            style={[
              styles.names,
              { fontFamily, color: c.accent, fontSize: namesSize(c.partner2) },
            ]}
          >
            {c.partner2 || "Nome"}
          </Text>
        </View>
        <Text style={styles.message} orphans={3} widows={3}>
          {c.message}
        </Text>
        <Text style={styles.recipient}>COM CARINHO, PARA {recipient}</Text>
        <Text style={[styles.date, { color: c.accent }]} minPresenceAhead={48}>
          {link ? (
            <Link
              src={link}
              style={{ color: c.accent, textDecoration: "none" }}
            >
              {printDate(c.date)}
            </Link>
          ) : (
            printDate(c.date)
          )}{" "}
          | ÀS {c.ceremonyTime.replace(":", "H") || "00H00"}
        </Text>
        <View minPresenceAhead={28}>
          <Link
            src={mapUrl(c.ceremonyName, c.ceremonyAddress, c.ceremonyMap)}
            style={{ color: c.foreground, textDecoration: "none" }}
          >
            <Text style={styles.venue}>
              {c.ceremonyName || "Local da cerimónia"}
            </Text>
            <Text style={styles.address}>
              {c.ceremonyAddress || "Morada da cerimónia"}
            </Text>
          </Link>
        </View>
        <View style={styles.secondVenue} minPresenceAhead={28}>
          <Link
            src={mapUrl(c.receptionName, c.receptionAddress, c.receptionMap)}
            style={{ color: c.foreground, textDecoration: "none" }}
          >
            <Text style={styles.venue}>
              {c.receptionName || "Local da celebração"} ·{" "}
              {c.receptionTime.replace(":", "H")}
            </Text>
            <Text style={styles.address}>
              {c.receptionAddress || "Morada da celebração"}
            </Text>
          </Link>
        </View>
        {c.closing && <Text style={styles.closing}>{c.closing}</Text>}
        <Link
          src={whatsappUrl(c, recipient)}
          style={[styles.contact, { color: c.accent, textDecoration: "none" }]}
        >
          CONFIRMAÇÃO DE PRESENÇA · {c.whatsapp}
        </Link>
        {preview && (
          <Text style={[styles.draft, { color: c.accent }]} fixed>
            RASCUNHO · NÃO PUBLICADO
          </Text>
        )}
      </Page>
    </Document>
  );
}
