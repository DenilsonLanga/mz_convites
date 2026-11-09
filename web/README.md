# MZ Convites

Atelier digital de convites de casamento. React/TypeScript, Vinext e Cloudflare D1, com autenticação ChatGPT gerida pelo Sites.

**Estado de entrega:** execução local. A publicação online foi adiada por pedido do proprietário em 08/11/2026 e requer nova autorização explícita. Não publicar, sincronizar código para publicação ou alterar o acesso do Site nesta fase.

## Desenvolvimento

Requer Node.js 22.13 ou superior.

```powershell
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_stormy_micromax.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_illegal_nova.sql
npm run dev -- --port 3000
```

Aplique cada migração apenas uma vez, por ordem. Numa base existente, aplique apenas as pendentes. A migração 0001 acrescenta validade e histórico de publicação sem apagar convites. Os dados ficam em `.wrangler/state` e sobrevivem a reinícios. Abra http://127.0.0.1:3000 e clique em **Entrar no meu atelier**. O starter simula a identidade `local_seedy` apenas no servidor de desenvolvimento em localhost; não é aceite em produção.

## Fluxo de utilização

1. Crie um convite: Verde & ouro, com a arte da referência, é o padrão. A alternativa Marfim continua disponível.
2. Edite os nomes, mensagem, data, cerimónia, celebração e WhatsApp com indicativo.
3. Personalize a paleta, fontes e ornamentos. Guarde o rascunho; pode estar incompleto.
4. Pré-visualize o site e o PDF. O nome do convidado fica abaixo da mensagem, antes da data. O PDF de pré-visualização tem a marca RASCUNHO.
5. Escolha manualmente a data de validade e publique para disponibilizar os links. A validade é obrigatória; termina no fim do dia escolhido, no fuso de Maputo. Depois da primeira publicação, só pode ser prolongada. Alterações ao conteúdo só chegam aos convidados quando publicar novamente.
6. Adicione nomes um a um ou cole uma lista com um nome por linha. Cada pessoa, casal ou família recebe um link próprio.
7. Copie um link, descarregue um PDF/PNG individual ou selecione destinatários para um ZIP em lote.
8. Desative um destinatário ou retire o casamento de publicação para bloquear os respetivos links.
9. Elimine rascunhos na lista ou no editor, confirmando a ação. Um convite que já foi publicado só pode ser eliminado depois da validade, mesmo retirado de publicação. A eliminação apaga também os destinatários. Convites antigos sem validade definida ficam protegidos de eliminação até a data ser configurada.

Uma duplicação copia os dados do casamento, sem publicação nem convidados. As exportações finais usam a versão publicada. O nome do destinatário é atualizado no link existente ao editar a lista.

## Exportações

PDF com fontes incorporadas e ligações clicáveis: Marfim em A5 e Verde & ouro na proporção original da referência. Conteúdo extenso é paginado sem reduzir a fonte. O PNG é renderizado do próprio PDF a 300 dpi (aproximadamente 1748 × 2480 px no Marfim e 1748 × 2795 px no Verde & ouro). Várias imagens de um único convite são entregues num ZIP para evitar bloqueios de downloads automáticos.

O modelo **Verde & ouro** usa a própria imagem de referência fornecida pelo utilizador: moldura com relevo dourado, painel recortado e a textura original. Uma edição com `image_gen` retirou a tipografia antiga da zona central. Os nomes novos usam Pinyon Script (ou a opção clássica), e o corpo usa Cinzel. O nome do convidado vem abaixo da mensagem de convite e antes da data. O rótulo RSVP foi removido para libertar espaço. Celebração e contacto ficam numa segunda folha; texto extenso segue para folhas adicionais sem encolher a fonte. O PDF mantém a proporção 992 × 1586 (148 × aproximadamente 237 mm). O PNG vem do próprio PDF. A variante Marfim conserva A5. A página do convidado e a pré-visualização ampliada usam a mesma composição paginada do PDF, com ligações clicáveis e conteúdo acessível. O painel lateral e as miniaturas já usam a arte original, com mensagem, destinatário e data em fluxo para evitar sobreposição.

A textura antiga em `public/print/paper-grain.png` permanece apenas na variante Marfim. No Verde & ouro, a arte é raster e a tipografia nova é vetorial. A origem, o prompt e os ficheiros da arte estão documentados em `public/print/README.md`. As amostras em `outputs/reference-invitation.pdf` e `.png` contêm dados de demonstração; as imagens de todas as folhas ficam também em `outputs/reference-invitation-page-N.png`.

A geração acontece no navegador do administrador; as bibliotecas são carregadas apenas quando necessárias. Os lotes são sequenciais, têm progresso e podem ser cancelados. Falhas parciais são identificadas em `falhas.txt`, junto dos ficheiros bem-sucedidos no ZIP. Os ZIPs são construídos em memória; divida seleções muito grandes, sobretudo ao gerar imagens num dispositivo com pouca memória.

As fontes e respetivas licenças estão em `public/fonts`. Não dependem de serviços externos durante a utilização.

## Segurança e publicação

Configure `ADMIN_EMAIL` como segredo de produção através do Sites. Não coloque o seu valor em código, Git ou no manifesto. O primeiro início de sessão com o email verificado do proprietário associa o identificador ChatGPT daquele Site na tabela `admin_identity`; os acessos seguintes usam esse identificador estável. Não existe registo público de administradores. Em falta de configuração, o painel recusa acesso.

O público abre apenas `/c/<token>` sem login. Cada token é aleatório (UUID sem separadores); a consulta devolve apenas o destinatário e a versão publicada correspondente. API, listas e rascunhos exigem autorização no servidor. Pedidos de escrita exigem a mesma origem. As páginas dinâmicas não são armazenadas em cache e pedem aos motores de pesquisa que não as indexem. As confirmações abrem o WhatsApp; a aplicação não mantém uma lista automática de presenças.

`.openai/hosting.json` preserva a identidade Sites e declara o binding D1 `DB`. As migrações Drizzle são aplicadas pelo Sites durante a publicação. A data de compatibilidade está alinhada com o workerd incluído no starter; atualize-a em conjunto com o runtime. Logs e traces estão ativos.

Para publicar use a skill Sites: construir com `build-site.mjs`, sincronizar o código e empacotar com `site-workflow.mjs`, guardar a versão e publicar. O Site deve ser público para os convidados; a aplicação mantém o painel protegido. A pré-visualização local não publica nem altera dados de produção.

## Verificação

```powershell
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Os testes end-to-end usam Chrome e um servidor de desenvolvimento separado, com D1 local de teste. A documentação de execução encontra-se em `tests/README.md`. Capturas e traces ficam em `outputs`, ignorada pelo Git.
