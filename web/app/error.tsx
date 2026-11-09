"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty-page">
      <span className="brand-monogram">MZ</span>
      <h1>Não foi possível abrir esta página.</h1>
      <p>Tente novamente dentro de instantes.</p>
      <button className="button primary" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
