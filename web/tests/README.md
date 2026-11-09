# Testes

`npm test` verifica validação, dados, ligações e autorização do proprietário. `npm run typecheck` verifica TypeScript.

Os testes Playwright usam Chrome instalado e um servidor separado na porta 3001. Nunca os aponte a produção.

Numa base de dados de teste nova, depois de `npm run build`:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/test-state --file drizzle/0000_stormy_micromax.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/test-state --file drizzle/0001_illegal_nova.sql
npm run dev:test
```

Noutro terminal:

```powershell
npm run test:e2e
```

O servidor de teste mantém dados exclusivamente em `.wrangler/test-state`. O servidor normal, porta 3000, mantém os dados em `.wrangler/state`. Ambos são locais e separados do D1 online. Os testes criam apenas exemplos fictícios. As capturas, downloads e traces são guardados em `outputs`, ignorada pelo Git.

Para regenerar o exemplo da referência, execute `npx playwright test tests/e2e/print-reference.spec.ts` com o servidor de teste ativo. Os testes verificam a proporção 992:1586, duas páginas no exemplo normal, nomes extensos sem sair da área de texto e ausência de slogans adicionais. O PDF completo fica em `outputs/reference-invitation.pdf`; a primeira página em `outputs/reference-invitation.png`; as outras páginas em `outputs/reference-invitation-page-N.png`.
