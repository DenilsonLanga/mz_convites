import { requireAdmin, HttpError, chatGPTSignInPath } from "@/lib/admin";
import { Dashboard } from "@/components/dashboard";
import { Invitation } from "@/components/invitation";
import { palettes, sampleContent } from "@/lib/invitations";
export const dynamic = "force-dynamic";
export default async function Home() {
  try {
    const user = await requireAdmin();
    return <Dashboard userName={user.fullName || "Olá"} />;
  } catch (error) {
    if (
      !(error instanceof HttpError) ||
      (error.status !== 401 && error.status !== 403)
    )
      throw error;
    const denied = error.status === 403;
    return (
      <main className="welcome-page">
        <div className="welcome-brand">
          <span className="brand-monogram">MZ</span>
          <span>
            CONVITES
            <br />
            <small>FEITOS PARA FICAR</small>
          </span>
        </div>
        <section className="welcome-copy">
          <span className="eyebrow">O INÍCIO DE UMA BONITA HISTÓRIA</span>
          <h1>
            Um dia único.
            <br />
            Um convite à altura.
          </h1>
          <p>
            Histórias de amor, transformadas em convites. Um espaço para criar,
            personalizar e partilhar o início de cada celebração.
          </p>
          {denied ? (
            <div className="notice error">
              Este painel está reservado ao proprietário.{" "}
              <a href="/signout-with-chatgpt?return_to=/">
                Entrar com outra conta
              </a>
            </div>
          ) : (
            <a
              className="button primary"
              href={chatGPTSignInPath("/")}
              target="_top"
            >
              Entrar no meu atelier <span>↗</span>
            </a>
          )}
          <p className="welcome-note">
            Acesso exclusivo do administrador · Conta ChatGPT
          </p>
        </section>
        <div
          className="welcome-art"
          aria-label="Exemplos dos dois modelos disponíveis"
        >
          <div className="welcome-card back">
            <Invitation
              compact
              interactive={false}
              content={sampleContent}
              recipient="Ana & família"
            />
          </div>
          <div className="welcome-card front">
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
          </div>
          <span className="art-caption">
            MODELOS ILUSTRATIVOS · FEITOS PARA PERSONALIZAR
          </span>
        </div>
        <footer className="welcome-footer">
          <span>CRIADO COM CUIDADO, EM MOÇAMBIQUE</span>
          <span>MZ CONVITES © {new Date().getFullYear()}</span>
        </footer>
      </main>
    );
  }
}
