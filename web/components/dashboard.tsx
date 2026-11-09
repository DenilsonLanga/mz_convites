"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FileText,
  Flower2,
  Heart,
  LayoutGrid,
  Link2,
  Loader2,
  LogOut,
  Mail,
  Palette,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Users,
  Trash2,
  X,
} from "lucide-react";
import { Invitation } from "./invitation";
import {
  canDeleteWedding,
  isExpired,
  maputoDay,
  wasPublished,
} from "@/lib/expiry";
import {
  coupleName,
  displayDate,
  palettes,
  sampleContent,
  type InvitationContent,
  type Recipient,
  type Wedding,
  type WeddingSummary,
} from "@/lib/invitations";

async function api<T>(
  action?: string,
  id?: string,
  data?: unknown,
  recipientId?: string,
  expiresOn?: string | null,
): Promise<T> {
  const response = await fetch(
    action
      ? "/api/admin"
      : `/api/admin${id ? `?id=${encodeURIComponent(id)}` : ""}`,
    {
      method: action ? "POST" : "GET",
      cache: "no-store",
      ...(action
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, id, data, recipientId, expiresOn }),
          }
        : {}),
    },
  );
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(result.error || "Não foi possível concluir o pedido.");
  return result;
}
type Tab = "content" | "design" | "guests" | "export";
type Notice = { message: string; error?: boolean } | null;
const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: "content", label: "Conteúdo", icon: FileText },
  { id: "design", label: "Design", icon: Palette },
  { id: "guests", label: "Convidados", icon: Users },
  { id: "export", label: "Exportar", icon: Download },
];

export function Dashboard({ userName }: { userName: string }) {
  const [weddings, setWeddings] = useState<WeddingSummary[]>([]);
  const [current, setCurrent] = useState<Wedding | null>(null);
  const [draft, setDraft] = useState<InvitationContent | null>(null);
  const [expiry, setExpiry] = useState("");
  const [guests, setGuests] = useState<Recipient[]>([]);
  const [tab, setTab] = useState<Tab>("content");
  const [section, setSection] = useState<"weddings" | "templates">("weddings");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("all");
  const [guestQuery, setGuestQuery] = useState(""),
    [names, setNames] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewName, setPreviewName] = useState("Nome do convidado");
  const [preview, setPreview] = useState(false);
  const [exporting, setExporting] = useState(false),
    [progress, setProgress] = useState("");
  const cancelExport = useRef(false);
  const [rename, setRename] = useState<Recipient | null>(null),
    [renameValue, setRenameValue] = useState("");
  const dirty =
    !!current &&
    !!draft &&
    (JSON.stringify(current.draft) !== JSON.stringify(draft) ||
      expiry !== (current.expiresOn ?? ""));

  async function loadList() {
    const result = await api<{ weddings: WeddingSummary[] }>();
    setWeddings(result.weddings);
  }
  useEffect(() => {
    loadList()
      .catch((error) => setNotice({ message: error.message, error: true }))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  useEffect(() => {
    if (!preview && !rename) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreview(false);
        setRename(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [preview, rename]);
  async function perform(work: () => Promise<void>, message?: string) {
    setBusy(true);
    setNotice(null);
    try {
      await work();
      if (message) setNotice({ message });
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : "Ocorreu um erro.",
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }
  async function openWedding(id: string, preserveDraft = false) {
    const result = await api<{ wedding: Wedding; recipients: Recipient[] }>(
      undefined,
      id,
    );
    setCurrent(result.wedding);
    if (!preserveDraft) {
      setDraft(result.wedding.draft);
      setExpiry(result.wedding.expiresOn ?? "");
    }
    setGuests(result.recipients);
  }
  async function create(theme: "ivory" | "forest" = "forest") {
    await perform(async () => {
      const result = await api<{ wedding: Wedding }>("create");
      setCurrent(result.wedding);
      setExpiry("");
      setDraft({ ...result.wedding.draft, theme, ...palettes[theme] });
      setGuests([]);
      setSelected(new Set());
      setTab("content");
      setSection("weddings");
      await loadList();
    });
  }
  async function removeWedding(wedding: Wedding) {
    if (exporting) return;
    if (!canDeleteWedding(wedding)) {
      setNotice({
        message: wedding.expiresOn
          ? `Este convite só pode ser eliminado depois de ${displayDate(wedding.expiresOn)}.`
          : "Defina primeiro a validade deste convite publicado.",
        error: true,
      });
      return;
    }
    const kind = wasPublished(wedding) ? "convite" : "rascunho";
    if (
      !window.confirm(
        `Eliminar o ${kind} de ${coupleName(wedding.draft)} e a sua lista de convidados? Os links deixarão de funcionar. Esta ação não pode ser desfeita.`,
      )
    )
      return;
    await perform(
      async () => {
        await api("delete", wedding.id);
        if (current?.id === wedding.id) {
          setCurrent(null);
          setDraft(null);
          setGuests([]);
          setSelected(new Set());
          setPreview(false);
        }
        await loadList();
      },
      wasPublished(wedding) ? "Convite eliminado." : "Rascunho eliminado.",
    );
  }
  function back() {
    if (exporting) return;
    if (
      dirty &&
      !window.confirm("Existem alterações por guardar. Sair sem guardar?")
    )
      return;
    setCurrent(null);
    setDraft(null);
    setSelected(new Set());
    setNotice(null);
    setPreviewName("Nome do convidado");
    loadList().catch((error) =>
      setNotice({ message: error.message, error: true }),
    );
  }
  async function save() {
    if (!current || !draft) return;
    await api("save", current.id, draft, undefined, expiry || null);
    setCurrent({ ...current, draft, expiresOn: expiry || null });
    await loadList();
  }
  async function publish() {
    if (!current) return;
    await perform(async () => {
      await save();
      await api("publish", current.id, undefined, undefined, expiry || null);
      await openWedding(current.id);
      await loadList();
    }, "Convite publicado. Os links já apresentam esta versão.");
  }
  function change<K extends keyof InvitationContent>(
    key: K,
    value: InvitationContent[K],
  ) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }
  async function copyLink(guest: Recipient) {
    await perform(async () => {
      await navigator.clipboard.writeText(
        `${window.location.origin}/c/${guest.token}`,
      );
    }, "Ligação copiada.");
  }
  async function addGuests(event: FormEvent) {
    event.preventDefault();
    if (!current) return;
    const list = names
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);
    if (!list.length) return;
    await perform(async () => {
      await api("addRecipients", current.id, list);
      setNames("");
      await openWedding(current.id, true);
      await loadList();
    }, `${list.length} destinatário(s) adicionado(s).`);
  }
  async function exportFiles(
    format: "pdf" | "png",
    ids: string[],
    batch: boolean,
  ) {
    if (!current || exporting) return;
    setExporting(true);
    cancelExport.current = false;
    setNotice(null);
    setProgress("A preparar os convites…");
    try {
      const result = await api<{
        content: InvitationContent;
        recipients: Recipient[];
      }>("export", current.id, ids);
      const { exportInvitations } = await import("@/lib/export-client");
      await exportInvitations(
        result.content,
        result.recipients,
        format,
        batch,
        (text) => setProgress(text),
        () => cancelExport.current,
      );
      setNotice({
        message: cancelExport.current
          ? "Exportação cancelada. Nenhum ficheiro incompleto foi descarregado."
          : "Os convites foram gerados com a versão publicada.",
      });
    } catch (error) {
      setNotice({
        message:
          error instanceof Error ? error.message : "Não foi possível exportar.",
        error: true,
      });
    } finally {
      setExporting(false);
      setProgress("");
    }
  }
  async function previewPdf() {
    if (!draft || exporting) return;
    setExporting(true);
    setProgress("A compor a pré-visualização A5…");
    try {
      const { downloadPreview } = await import("@/lib/export-client");
      await downloadPreview(draft, previewName);
    } catch (error) {
      setNotice({
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível gerar o PDF.",
        error: true,
      });
    } finally {
      setExporting(false);
      setProgress("");
    }
  }
  const activeGuests = guests.filter((g) => g.active);
  const filteredGuests = guests.filter((g) =>
    g.name.toLocaleLowerCase("pt").includes(guestQuery.toLocaleLowerCase("pt")),
  );
  const visibleWeddings = weddings.filter(
    (w) =>
      coupleName(w.draft)
        .toLocaleLowerCase("pt")
        .includes(query.toLocaleLowerCase("pt")) &&
      (status === "all" ||
        (status === "published" ? !!w.published : !w.published)),
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={back}
          aria-label="MZ Convites, início"
        >
          <span className="brand-monogram">MZ</span>
          <span>
            CONVITES<small>O SEU ATELIER DIGITAL</small>
          </span>
        </button>
        <div className="sidebar-label">ATELIER</div>
        <nav>
          <button
            className={`nav-item ${section === "weddings" ? "active" : ""}`}
            onClick={() => {
              if (current) back();
              setSection("weddings");
            }}
          >
            <LayoutGrid size={18} /> Os meus convites{" "}
            <span>{weddings.length}</span>
          </button>
          <button
            className={`nav-item ${section === "templates" ? "active" : ""}`}
            onClick={() => {
              if (
                current &&
                dirty &&
                !window.confirm("Sair sem guardar as alterações?")
              )
                return;
              if (exporting) return;
              setCurrent(null);
              setDraft(null);
              setSection("templates");
            }}
          >
            <Flower2 size={18} /> Coleção de modelos
          </button>
        </nav>
        <div className="sidebar-note">
          <Sparkles size={21} />
          <p>
            Pequenos detalhes.
            <br />
            <em>Grandes começos.</em>
          </p>
          <span>Cada convite é o primeiro capítulo de uma celebração.</span>
        </div>
        <div className="sidebar-profile">
          <div className="avatar">{userName.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{userName.split(" ")[0]}</strong>
            <small>Administrador</small>
          </div>
          <a
            href="/signout-with-chatgpt?return_to=/"
            aria-label="Terminar sessão"
          >
            <LogOut size={17} />
          </a>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div>
            <span>Atelier</span>
            <ChevronRight size={14} />
            <span>
              {current
                ? coupleName(draft!)
                : section === "templates"
                  ? "Coleção de modelos"
                  : "Os meus convites"}
            </span>
          </div>
          <span className="topbar-right">
            <span className="live-dot" /> FEITO COM CUIDADO
          </span>
        </header>
        <main className={`workspace ${current ? "workspace-editor" : ""}`}>
          {notice && (
            <div
              className={`notice ${notice.error ? "error" : "success"}`}
              role={notice.error ? "alert" : "status"}
            >
              <span>{notice.message}</span>
              <button
                aria-label="Fechar mensagem"
                onClick={() => setNotice(null)}
              >
                <X size={17} />
              </button>
            </div>
          )}
          {exporting && (
            <div className="notice export-progress" role="status">
              <Loader2 className="spin" size={18} />
              <span>{progress}</span>
              <button
                onClick={() => {
                  cancelExport.current = true;
                }}
                disabled={cancelExport.current}
              >
                Cancelar
              </button>
            </div>
          )}
          {!current ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">CADA HISTÓRIA COMEÇA AQUI</span>
                  <h1>
                    {section === "templates"
                      ? "Uma coleção de começos."
                      : "Os meus convites"}
                  </h1>
                  <p>
                    {section === "templates"
                      ? "Duas formas de dizer sim. Personalize cada detalhe à sua maneira."
                      : "Crie com carinho. Personalize com intenção. Partilhe um dia especial."}
                  </p>
                </div>
                <button
                  className="button primary"
                  disabled={busy || loading}
                  onClick={() => create()}
                >
                  <Plus size={17} /> Novo convite
                </button>
              </div>
              {section === "templates" ? (
                <div className="template-gallery">
                  {(["ivory", "forest"] as const).map((theme) => (
                    <div className="template-feature" key={theme}>
                      <div className="template-large">
                        <Invitation
                          compact
                          interactive={false}
                          content={{
                            ...sampleContent,
                            theme,
                            ...palettes[theme],
                          }}
                          recipient="Ana & família"
                        />
                      </div>
                      <div className="template-feature-info">
                        <span className="eyebrow">
                          {theme === "ivory"
                            ? "01 / A BELEZA DO ESSENCIAL"
                            : "02 / UM TOQUE INTEMPORAL"}
                        </span>
                        <h2>{theme === "ivory" ? "Marfim" : "Verde & ouro"}</h2>
                        <p>
                          {theme === "ivory"
                            ? "Luz, delicadeza e espaço para as palavras certas."
                            : "Verde profundo, dourado subtil e romantismo em cada traço."}
                        </p>
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() => create(theme)}
                        >
                          Usar este modelo <ArrowUpRight size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="overview-strip">
                    <div>
                      <span className="stat-number">
                        {String(weddings.length).padStart(2, "0")}
                      </span>
                      <span>Convites criados</span>
                    </div>
                    <div>
                      <span className="stat-number">
                        {String(
                          weddings.filter((w) => w.published).length,
                        ).padStart(2, "0")}
                      </span>
                      <span>Publicados</span>
                    </div>
                    <div>
                      <span className="stat-number">
                        {String(
                          weddings.reduce(
                            (sum, w) => sum + w.recipientCount,
                            0,
                          ),
                        ).padStart(2, "0")}
                      </span>
                      <span>Destinatários</span>
                    </div>
                    <Flower2 size={52} strokeWidth={0.7} />
                  </div>
                  <div className="collection-toolbar">
                    <div className="filter-tabs">
                      {[
                        ["all", "Todos"],
                        ["published", "Publicados"],
                        ["draft", "Rascunhos"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          className={status === value ? "selected" : ""}
                          onClick={() => setStatus(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <label className="search-field">
                      <Search size={16} />
                      <input
                        aria-label="Pesquisar casamentos"
                        placeholder="Procurar uma história…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                  </div>
                  {loading ? (
                    <div className="empty-state">
                      <Loader2 className="spin" />
                      <p>A abrir o seu atelier…</p>
                    </div>
                  ) : weddings.length === 0 ? (
                    <div className="first-invitation">
                      <div className="first-copy">
                        <span className="eyebrow">
                          HÁ UM PRIMEIRO CONVITE PARA TUDO
                        </span>
                        <h2>
                          Vamos dar forma
                          <br />a uma história de amor?
                        </h2>
                        <p>
                          Escolha um modelo, acrescente os detalhes do casamento
                          e prepare um convite especial para cada pessoa.
                        </p>
                        <button
                          className="button primary"
                          disabled={busy}
                          onClick={() => create()}
                        >
                          Criar o primeiro convite <ArrowUpRight size={16} />
                        </button>
                      </div>
                      <div className="first-preview">
                        <Invitation
                          compact
                          interactive={false}
                          content={{
                            ...sampleContent,
                            theme: "forest",
                            ...palettes.forest,
                          }}
                          recipient="Ana & família"
                        />
                        <span>EXEMPLO · VERDE & OURO</span>
                      </div>
                    </div>
                  ) : (
                    <div className="wedding-grid">
                      {visibleWeddings.map((w) => (
                        <div className="wedding-card" key={w.id}>
                          <button
                            className="wedding-card-open"
                            disabled={busy}
                            onClick={() =>
                              perform(async () => {
                                await openWedding(w.id);
                                setTab("content");
                                setSelected(new Set());
                              })
                            }
                          >
                            <div className="wedding-card-art">
                              <Invitation
                                compact
                                interactive={false}
                                content={w.draft}
                                recipient="Com carinho, para os nossos convidados"
                              />
                              <span
                                className={`badge ${w.published ? "published" : ""}`}
                              >
                                <span />
                                {w.published
                                  ? isExpired(w.expiresOn)
                                    ? "Expirado"
                                    : "Publicado"
                                  : wasPublished(w)
                                    ? "Retirado"
                                    : "Rascunho"}
                              </span>
                            </div>
                            <div className="wedding-card-info">
                              <span className="eyebrow">CASAMENTO</span>
                              <h2>{coupleName(w.draft)}</h2>
                              <p>
                                {w.draft.date
                                  ? displayDate(w.draft.date)
                                  : "Data por definir"}
                              </p>
                              {wasPublished(w) && (
                                <p>
                                  {w.expiresOn
                                    ? `Validade até ${displayDate(w.expiresOn)}`
                                    : "Validade por definir"}
                                </p>
                              )}
                              <div>
                                <span>
                                  <Users size={13} /> {w.recipientCount}{" "}
                                  destinatários
                                </span>
                                <ArrowUpRight size={18} />
                              </div>
                            </div>
                          </button>
                          <button
                            className="delete-wedding"
                            disabled={busy || exporting || !canDeleteWedding(w)}
                            aria-label={`Eliminar ${wasPublished(w) ? "convite" : "rascunho"} de ${coupleName(w.draft)}`}
                            title={
                              canDeleteWedding(w)
                                ? "Eliminar convite"
                                : w.expiresOn
                                  ? `Disponível após ${displayDate(w.expiresOn)}`
                                  : "Defina a validade no editor"
                            }
                            onClick={() => removeWedding(w)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        className="new-card"
                        onClick={() => create()}
                        disabled={busy}
                      >
                        <span>
                          <Plus size={24} />
                        </span>
                        <h2>Uma nova história</h2>
                        <p>Comece um novo convite</p>
                      </button>
                    </div>
                  )}
                  {!loading &&
                    weddings.length > 0 &&
                    visibleWeddings.length === 0 && (
                      <div className="empty-state">
                        <Search size={28} />
                        <p>Nenhum convite corresponde à pesquisa.</p>
                      </div>
                    )}
                </>
              )}
              <footer className="workspace-footer">
                <span>O AMOR ESTÁ NOS DETALHES.</span>
                <span>
                  MZ CONVITES <Heart size={11} />
                </span>
              </footer>
            </>
          ) : (
            draft && (
              <>
                <div className="editor-heading">
                  <div>
                    <button
                      className="back-button"
                      disabled={exporting}
                      onClick={back}
                    >
                      <ArrowLeft size={16} /> Todos os convites
                    </button>
                    <h1>{coupleName(draft)}</h1>
                    <span
                      className={`badge inline ${current.published ? "published" : ""}`}
                    >
                      <span />
                      {current.published
                        ? isExpired(current.expiresOn)
                          ? "Expirado"
                          : "Publicado"
                        : wasPublished(current)
                          ? "Retirado"
                          : "Rascunho"}
                    </span>
                    {dirty && (
                      <span className="unsaved">Alterações por guardar</span>
                    )}
                  </div>
                  <div className="editor-actions">
                    <button
                      className="button secondary"
                      disabled={busy || exporting}
                      onClick={() => setPreview(true)}
                    >
                      <Eye size={16} /> Pré-visualizar
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy || exporting}
                      onClick={() => perform(save, "Rascunho guardado.")}
                    >
                      {busy ? (
                        <Loader2 className="spin" size={16} />
                      ) : (
                        <Check size={16} />
                      )}{" "}
                      Guardar
                    </button>
                    <button
                      className="button primary"
                      disabled={busy || exporting}
                      onClick={publish}
                    >
                      Publicar <ArrowUpRight size={16} />
                    </button>
                  </div>
                </div>
                <div className="editor-tabs">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      className={tab === t.id ? "active" : ""}
                      onClick={() => setTab(t.id)}
                    >
                      <t.icon size={16} />
                      {t.label}
                      {t.id === "guests" && <span>{guests.length}</span>}
                    </button>
                  ))}
                </div>
                <div
                  className={`editor-layout ${tab === "guests" || tab === "export" ? "full-editor" : ""}`}
                >
                  <div className="editor-panel">
                    {tab === "content" && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          perform(save, "Rascunho guardado.");
                        }}
                      >
                        <FormSection
                          number="01"
                          title="A vossa história"
                          description="As palavras que dão início à celebração."
                        >
                          <div className="field-grid">
                            <Field
                              label="Primeiro nome do casal"
                              value={draft.partner1}
                              onChange={(v) => change("partner1", v)}
                              placeholder="Débora"
                              required
                              maxLength={180}
                            />
                            <Field
                              label="Segundo nome do casal"
                              value={draft.partner2}
                              onChange={(v) => change("partner2", v)}
                              placeholder="Paulo"
                              required
                              maxLength={180}
                            />
                          </div>
                          <Field
                            label="Mensagem do convite"
                            value={draft.message}
                            onChange={(v) => change("message", v)}
                            multiline
                            required
                            maxLength={8000}
                          />
                          <Field
                            label="Data do casamento"
                            value={draft.date}
                            onChange={(v) => change("date", v)}
                            type="date"
                            required
                          />
                        </FormSection>
                        <FormSection
                          number="02"
                          title="A cerimónia"
                          description="Onde o primeiro sim acontece."
                        >
                          <div className="field-grid wide-first">
                            <Field
                              label="Nome do local"
                              value={draft.ceremonyName}
                              onChange={(v) => change("ceremonyName", v)}
                              placeholder="Igreja, conservatória ou jardim"
                              required
                              maxLength={180}
                            />
                            <Field
                              label="Horário"
                              value={draft.ceremonyTime}
                              onChange={(v) => change("ceremonyTime", v)}
                              type="time"
                              required
                            />
                          </div>
                          <Field
                            label="Morada completa"
                            value={draft.ceremonyAddress}
                            onChange={(v) => change("ceremonyAddress", v)}
                            required
                            maxLength={1000}
                          />
                          <Field
                            label="Ligação para o mapa · opcional"
                            value={draft.ceremonyMap}
                            onChange={(v) => change("ceremonyMap", v)}
                            type="url"
                            placeholder="https://maps.google.com/…"
                            maxLength={1500}
                          />
                          <p className="field-hint">
                            Sem ligação, procuramos o nome e a morada no Google
                            Maps.
                          </p>
                        </FormSection>
                        <FormSection
                          number="03"
                          title="A celebração"
                          description="O lugar onde a alegria continua."
                        >
                          <div className="field-grid wide-first">
                            <Field
                              label="Nome do local"
                              value={draft.receptionName}
                              onChange={(v) => change("receptionName", v)}
                              required
                              maxLength={180}
                            />
                            <Field
                              label="Horário"
                              value={draft.receptionTime}
                              onChange={(v) => change("receptionTime", v)}
                              type="time"
                              required
                            />
                          </div>
                          <Field
                            label="Morada completa"
                            value={draft.receptionAddress}
                            onChange={(v) => change("receptionAddress", v)}
                            required
                            maxLength={1000}
                          />
                          <Field
                            label="Ligação para o mapa · opcional"
                            value={draft.receptionMap}
                            onChange={(v) => change("receptionMap", v)}
                            type="url"
                            placeholder="https://maps.google.com/…"
                            maxLength={1500}
                          />
                        </FormSection>
                        <FormSection
                          number="04"
                          title="Os últimos detalhes"
                          description="Uma forma simples de confirmar a presença."
                        >
                          <Field
                            label="WhatsApp com indicativo"
                            value={draft.whatsapp}
                            onChange={(v) => change("whatsapp", v)}
                            type="tel"
                            placeholder="+258841234567"
                            required
                            maxLength={16}
                          />
                          <Field
                            label="Mensagem de encerramento · opcional"
                            value={draft.closing}
                            onChange={(v) => change("closing", v)}
                            multiline
                            maxLength={2000}
                          />
                          <Field
                            label="Data de validade do convite"
                            type="date"
                            value={expiry}
                            onChange={setExpiry}
                            min={
                              wasPublished(current) && current.expiresOn
                                ? current.expiresOn
                                : maputoDay()
                            }
                          />
                          <p className="field-hint">
                            Obrigatória para publicar. Válido até ao fim desse
                            dia, em Maputo. Depois da primeira publicação, o
                            prazo só pode ser prolongado. A eliminação fica
                            disponível após a validade.
                          </p>
                        </FormSection>
                        <button className="button primary" disabled={busy}>
                          Guardar rascunho <Check size={16} />
                        </button>
                        <div className="management-actions">
                          <button
                            type="button"
                            className="danger-link"
                            disabled={
                              busy || exporting || !canDeleteWedding(current)
                            }
                            title={
                              canDeleteWedding(current)
                                ? "Eliminar convite"
                                : "Só é possível eliminar depois da validade"
                            }
                            onClick={() => removeWedding(current)}
                          >
                            <Trash2 size={15} /> Eliminar{" "}
                            {wasPublished(current) ? "convite" : "rascunho"}
                          </button>
                          <button
                            type="button"
                            disabled={busy || exporting}
                            onClick={() =>
                              perform(async () => {
                                if (dirty) await save();
                                const copy = await api<{ wedding: Wedding }>(
                                  "duplicate",
                                  current.id,
                                );
                                await openWedding(copy.wedding.id);
                                setSelected(new Set());
                                await loadList();
                              }, "Convite duplicado, sem convidados e em rascunho.")
                            }
                          >
                            <Copy size={15} /> Duplicar casamento
                          </button>
                          {current.published && (
                            <button
                              type="button"
                              className="danger-link"
                              disabled={busy || exporting}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Retirar de publicação? Todos os links deste casamento ficarão indisponíveis.",
                                  )
                                )
                                  perform(async () => {
                                    await api("unpublish", current.id);
                                    await openWedding(current.id, true);
                                    await loadList();
                                  }, "Casamento retirado de publicação.");
                              }}
                            >
                              Retirar de publicação
                            </button>
                          )}
                        </div>
                      </form>
                    )}
                    {tab === "design" && (
                      <>
                        <FormSection
                          number="01"
                          title="O seu modelo"
                          description="A mesma história, com uma nova expressão."
                        >
                          <div className="theme-options">
                            {(["ivory", "forest"] as const).map((theme) => (
                              <button
                                key={theme}
                                className={`theme-option ${draft.theme === theme ? "chosen" : ""}`}
                                onClick={() =>
                                  setDraft({
                                    ...draft,
                                    theme,
                                    ...palettes[theme],
                                  })
                                }
                              >
                                <div
                                  style={{
                                    background: palettes[theme].background,
                                    color: palettes[theme].accent,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily:
                                        theme === "forest"
                                          ? "Pinyon Script"
                                          : "Cormorant Garamond",
                                    }}
                                  >
                                    Aa
                                  </span>
                                  <Flower2 size={20} strokeWidth={0.8} />
                                </div>
                                <span>
                                  {theme === "ivory"
                                    ? "Marfim"
                                    : "Verde & ouro"}
                                  {draft.theme === theme && <Check size={14} />}
                                </span>
                              </button>
                            ))}
                          </div>
                        </FormSection>
                        <FormSection
                          number="02"
                          title="A sua paleta"
                          description="Três cores, uma identidade única."
                        >
                          <div className="color-options">
                            {(
                              [
                                ["background", "Fundo"],
                                ["foreground", "Texto"],
                                ["accent", "Destaque"],
                              ] as const
                            ).map(([key, label]) => (
                              <label className="color-field" key={key}>
                                <input
                                  aria-label={label}
                                  type="color"
                                  disabled={draft.theme === "forest"}
                                  value={draft[key]}
                                  onChange={(e) => change(key, e.target.value)}
                                />
                                <span>
                                  {label}
                                  <small>{draft[key].toUpperCase()}</small>
                                </span>
                              </label>
                            ))}
                          </div>
                        </FormSection>
                        <FormSection
                          number="03"
                          title="Tipografia"
                          description="Letras que dizem tanto quanto as palavras."
                        >
                          {draft.theme === "forest" && (
                            <p
                              className="field-hint"
                              style={{ marginBottom: 16 }}
                            >
                              No modelo Verde & ouro, a arte da referência é
                              preservada no site e nas exportações. Para editar
                              cores e ornamentos, escolha Marfim. Os nomes usam
                              a tipografia escolhida abaixo.
                            </p>
                          )}
                          <button
                            className={`font-option ${draft.font === "classic" ? "chosen" : ""}`}
                            onClick={() => change("font", "classic")}
                          >
                            <span style={{ fontFamily: "Cormorant Garamond" }}>
                              O começo de sempre
                            </span>
                            <small>CLÁSSICA · CORMORANT GARAMOND + INTER</small>
                          </button>
                          <button
                            className={`font-option ${draft.font === "script" ? "chosen" : ""}`}
                            onClick={() => change("font", "script")}
                          >
                            <span style={{ fontFamily: "Pinyon Script" }}>
                              O começo de sempre
                            </span>
                            <small>ROMÂNTICA · PINYON SCRIPT + INTER</small>
                          </button>
                        </FormSection>
                        <FormSection
                          number="04"
                          title="Um toque de detalhe"
                          description="Decoração na medida certa."
                        >
                          <div className="segmented">
                            {(
                              [
                                ["none", "Sem ornamento"],
                                ["line", "Linhas finas"],
                                ["botanical", "Botânico"],
                              ] as const
                            ).map(([value, label]) => (
                              <button
                                key={value}
                                className={
                                  draft.ornament === value ? "selected" : ""
                                }
                                onClick={() => change("ornament", value)}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </FormSection>
                      </>
                    )}
                    {tab === "guests" && (
                      <>
                        <div className="section-heading">
                          <div>
                            <h2>Uma pessoa. Um convite especial.</h2>
                            <p>
                              Adicione pessoas, casais ou famílias. Cada nome
                              terá uma ligação exclusiva.
                            </p>
                          </div>
                          <span className="guest-count">
                            {guests.length} destinatários
                          </span>
                        </div>
                        <form className="add-guests" onSubmit={addGuests}>
                          <label className="field">
                            <span>Adicionar destinatários</span>
                            <textarea
                              aria-label="Nomes dos destinatários"
                              placeholder={
                                "Ana e família\nJoão & Maria\nCeleste Matavele"
                              }
                              value={names}
                              onChange={(e) => setNames(e.target.value)}
                              maxLength={90500}
                              rows={3}
                              required
                            />
                          </label>
                          <div>
                            <span className="field-hint">
                              Um nome por linha · até 500 de cada vez
                            </span>
                            <button
                              className="button primary"
                              disabled={busy || !names.trim()}
                            >
                              <Plus size={16} /> Adicionar à lista
                            </button>
                          </div>
                        </form>
                        <div className="guest-toolbar">
                          <label className="search-field">
                            <Search size={16} />
                            <input
                              aria-label="Pesquisar convidados"
                              placeholder="Procurar um nome…"
                              value={guestQuery}
                              onChange={(e) => setGuestQuery(e.target.value)}
                            />
                          </label>
                          {selected.size > 0 && (
                            <button
                              className="button secondary"
                              onClick={() => setTab("export")}
                            >
                              Exportar {selected.size} selecionado(s){" "}
                              <ArrowUpRight size={15} />
                            </button>
                          )}
                        </div>
                        <div className="guest-table">
                          <div className="guest-table-head">
                            <label>
                              <input
                                type="checkbox"
                                aria-label="Selecionar todos os destinatários visíveis e ativos"
                                checked={
                                  filteredGuests.filter((g) => g.active)
                                    .length > 0 &&
                                  filteredGuests
                                    .filter((g) => g.active)
                                    .every((g) => selected.has(g.id))
                                }
                                onChange={(e) => {
                                  const next = new Set(selected);
                                  filteredGuests
                                    .filter((g) => g.active)
                                    .forEach((g) =>
                                      e.target.checked
                                        ? next.add(g.id)
                                        : next.delete(g.id),
                                    );
                                  setSelected(next);
                                }}
                              />{" "}
                              DESTINATÁRIO
                            </label>
                            <span>ESTADO</span>
                            <span>AÇÕES</span>
                          </div>
                          {filteredGuests.map((g) => (
                            <div className="guest-row" key={g.id}>
                              <label>
                                <input
                                  type="checkbox"
                                  aria-label={`Selecionar ${g.name}`}
                                  disabled={!g.active}
                                  checked={selected.has(g.id)}
                                  onChange={(e) => {
                                    const next = new Set(selected);
                                    e.target.checked
                                      ? next.add(g.id)
                                      : next.delete(g.id);
                                    setSelected(next);
                                  }}
                                />
                                <span>{g.name}</span>
                              </label>
                              <span
                                className={`guest-status ${g.active ? "" : "inactive"}`}
                              >
                                <span />
                                {g.active ? "Ativo" : "Desativado"}
                              </span>
                              <div className="guest-actions">
                                <button
                                  title="Copiar ligação"
                                  aria-label={`Copiar ligação de ${g.name}`}
                                  disabled={
                                    !g.active || !current.published || busy
                                  }
                                  onClick={() => copyLink(g)}
                                >
                                  <Link2 size={16} />
                                </button>
                                <button
                                  title="Editar nome"
                                  aria-label={`Editar ${g.name}`}
                                  disabled={busy || exporting}
                                  onClick={() => {
                                    setRename(g);
                                    setRenameValue(g.name);
                                  }}
                                >
                                  <Settings2 size={16} />
                                </button>
                                <button
                                  title="Descarregar PDF"
                                  aria-label={`PDF de ${g.name}`}
                                  disabled={
                                    !g.active || !current.published || exporting
                                  }
                                  onClick={() =>
                                    exportFiles("pdf", [g.id], false)
                                  }
                                >
                                  <FileText size={16} />
                                </button>
                                <button
                                  title="Descarregar imagem"
                                  aria-label={`PNG de ${g.name}`}
                                  disabled={
                                    !g.active || !current.published || exporting
                                  }
                                  onClick={() =>
                                    exportFiles("png", [g.id], false)
                                  }
                                >
                                  <Download size={16} />
                                </button>
                                <button
                                  className="text-action"
                                  disabled={busy || exporting}
                                  onClick={() =>
                                    perform(
                                      async () => {
                                        await api(
                                          "toggleRecipient",
                                          current.id,
                                          !g.active,
                                          g.id,
                                        );
                                        await openWedding(current.id, true);
                                        setSelected((prev) => {
                                          const next = new Set(prev);
                                          next.delete(g.id);
                                          return next;
                                        });
                                      },
                                      g.active
                                        ? "Ligação desativada."
                                        : "Ligação reativada.",
                                    )
                                  }
                                >
                                  {g.active ? "Desativar" : "Reativar"}
                                </button>
                              </div>
                            </div>
                          ))}
                          {filteredGuests.length === 0 && (
                            <div className="empty-state">
                              <Users size={28} />
                              <p>
                                {guests.length
                                  ? "Nenhum nome corresponde à pesquisa."
                                  : "A lista está à espera dos seus convidados."}
                              </p>
                            </div>
                          )}
                        </div>
                        {!current.published && (
                          <p className="field-hint guest-hint">
                            Publique o casamento para ativar a cópia de ligações
                            e as exportações finais.
                          </p>
                        )}
                      </>
                    )}
                    {tab === "export" && (
                      <>
                        <div className="section-heading">
                          <div>
                            <span className="eyebrow">
                              PRONTOS PARA PARTILHAR
                            </span>
                            <h2>Do digital para as mãos.</h2>
                            <p>
                              O mesmo cuidado, em cada formato. Os ficheiros
                              usam sempre a versão publicada.
                            </p>
                          </div>
                          <Download size={28} strokeWidth={1} />
                        </div>
                        {!current.published && (
                          <div className="notice error">
                            Publique o casamento antes de gerar os convites
                            finais.
                          </div>
                        )}
                        {dirty && (
                          <div className="notice">
                            Existem alterações no editor. Guarde e publique para
                            as incluir nas exportações.
                          </div>
                        )}
                        <div className="export-selection">
                          <div>
                            <Users size={20} />
                            <div>
                              <strong>
                                {selected.size} destinatário(s) selecionado(s)
                              </strong>
                              <p>
                                {activeGuests.length} destinatário(s) ativo(s)
                                neste casamento
                              </p>
                            </div>
                          </div>
                          <div>
                            <button
                              className="button secondary"
                              disabled={!activeGuests.length || exporting}
                              onClick={() =>
                                setSelected(
                                  new Set(activeGuests.map((g) => g.id)),
                                )
                              }
                            >
                              Selecionar todos
                            </button>
                            <button
                              className="button text"
                              onClick={() => setTab("guests")}
                            >
                              Escolher na lista <ChevronRight size={15} />
                            </button>
                          </div>
                        </div>
                        <div className="export-cards">
                          <div>
                            <FileText size={30} strokeWidth={1} />
                            <span className="eyebrow">
                              PARA GUARDAR E IMPRIMIR
                            </span>
                            <h3>Convite em PDF</h3>
                            <p>
                              {(current.published?.theme ?? draft.theme) ===
                              "forest"
                                ? "Proporção original da referência · papel verde e dourado."
                                : "A5 vertical · fontes incorporadas."}{" "}
                              Ligações clicáveis e páginas adicionais para todos
                              os detalhes.
                            </p>
                            <button
                              className="button primary"
                              disabled={
                                exporting ||
                                !current.published ||
                                !selected.size
                              }
                              onClick={() =>
                                exportFiles(
                                  "pdf",
                                  [...selected],
                                  selected.size > 1,
                                )
                              }
                            >
                              <Download size={16} />
                              {selected.size > 1
                                ? "Descarregar ZIP de PDFs"
                                : "Descarregar PDF"}
                            </button>
                          </div>
                          <div>
                            <Mail size={30} strokeWidth={1} />
                            <span className="eyebrow">
                              PARA ENVIAR COM CARINHO
                            </span>
                            <h3>Convite em imagem</h3>
                            <p>
                              PNG de alta resolução · equivalente a 300 dpi. A
                              mesma composição do PDF, pronta para enviar.
                            </p>
                            <button
                              className="button primary"
                              disabled={
                                exporting ||
                                !current.published ||
                                !selected.size
                              }
                              onClick={() =>
                                exportFiles(
                                  "png",
                                  [...selected],
                                  selected.size > 1,
                                )
                              }
                            >
                              <Download size={16} />
                              {selected.size > 1
                                ? "Descarregar ZIP de imagens"
                                : "Descarregar PNG"}
                            </button>
                          </div>
                        </div>
                        <p className="field-hint">
                          Conteúdo extenso ocupa várias páginas. Cada página
                          terá a sua própria imagem. Pode cancelar uma geração
                          em lote a qualquer momento.
                        </p>
                      </>
                    )}
                  </div>
                  {(tab === "content" || tab === "design") && (
                    <aside className="live-preview">
                      <div className="preview-heading">
                        <span>
                          <span className="live-dot" /> PRÉ-VISUALIZAÇÃO
                        </span>
                        <button
                          onClick={() => setPreview(true)}
                          aria-label="Ampliar pré-visualização"
                        >
                          <ArrowUpRight size={17} />
                        </button>
                      </div>
                      <div className="preview-stage">
                        <Invitation
                          content={draft}
                          recipient={previewName}
                          compact
                          interactive={false}
                        />
                      </div>
                      <label className="field preview-name">
                        <span>Experimentar um destinatário</span>
                        <input
                          value={previewName}
                          maxLength={180}
                          onChange={(e) => setPreviewName(e.target.value)}
                        />
                      </label>
                      <p className="preview-caption">
                        O seu convite ganha vida em cada detalhe.
                      </p>
                      <button
                        className="button secondary"
                        disabled={exporting}
                        onClick={previewPdf}
                      >
                        <FileText size={15} /> Ver rascunho em PDF
                      </button>
                    </aside>
                  )}
                </div>
              </>
            )
          )}
        </main>
      </div>
      {preview && draft && (
        <Modal
          onClose={() => setPreview(false)}
          title="Pré-visualização do rascunho"
        >
          <div className="modal-preview">
            <Invitation content={draft} recipient={previewName} />
          </div>
        </Modal>
      )}
      {rename && (
        <Modal onClose={() => setRename(null)} title="Editar destinatário">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              perform(async () => {
                await api(
                  "renameRecipient",
                  current!.id,
                  renameValue,
                  rename.id,
                );
                await openWedding(current!.id, true);
                setRename(null);
              }, "Nome atualizado.");
            }}
          >
            <Field
              label="Nome no convite"
              value={renameValue}
              onChange={setRenameValue}
              required
              maxLength={180}
            />
            <p className="field-hint">
              O nome será atualizado no link existente e nas próximas
              exportações.
            </p>
            <button className="button primary" disabled={busy}>
              Guardar nome
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  multiline = false,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  min?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          {...props}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          {...props}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="form-section">
      <div className="form-section-heading">
        <span>{number}</span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-body">
        <header>
          <h2>{title}</h2>
          <button autoFocus aria-label="Fechar" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
