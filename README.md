# MZ Convites

O plano aprovado e o acompanhamento da implementação estão em [plan.md](plan.md). A aplicação está na pasta [web](web).

**Apenas local:** a publicação online está adiada até nova autorização explícita. O botão Publicar dentro do painel publica os dados do convite no servidor local; não publica a aplicação na Internet.

## Pré-visualização local

```powershell
cd C:\Langa\mz_convites\web
npm run dev -- --port 3000
```

Abra http://127.0.0.1:3000 e clique em **Entrar no meu atelier**. O ambiente de desenvolvimento simula a conta ChatGPT apenas em localhost. Os dados locais são guardados em D1/SQLite na pasta ignorada `web/.wrangler/state`; não são os dados de produção.

As instruções de instalação, testes e publicação estão em [web/README.md](web/README.md).
