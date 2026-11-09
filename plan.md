# MZ Convites — plano de implementação

## Objetivo aprovado

Aplicação para criar convites de casamento para clientes, com painel exclusivo do administrador. Cada destinatário (pessoa, casal ou família) recebe um link aleatório e versões personalizadas em PDF e PNG. Português, fuso Africa/Maputo e indicativo inicial +258, editável.

**Decisão de 08/11/2026:** manter apenas a execução local. Não publicar, sincronizar código para publicação ou alterar o acesso do Site até nova autorização explícita do utilizador. A publicação online fica adiada.

## Experiência visual

- Dois temas: marfim minimalista e verde profundo com dourado, inspirado na referência.
- Molduras finas, espaço livre e ornamentos SVG discretos.
- Editar textos, cores, fontes e decoração dentro de modelos estruturados.
- Fontes locais: Cormorant Garamond + Inter e Pinyon Script + Inter, incorporadas no PDF. A caligrafia romântica foi reajustada para aproximar a referência.
- Página responsiva com destinatário, casal, mensagem, data, horários, locais, mapas e confirmação pelo WhatsApp.
- Mensagem do WhatsApp identifica evento e destinatário; envio depende do convidado.

## Painel e dados

- React/TypeScript no starter Vinext do Sites; armazenamento D1.
- Administração restrita à conta ChatGPT do proprietário, com autorização no servidor.
- Criar, editar e duplicar casamentos; duplicação não copia convidados nem publicação.
- Rascunho separado da versão publicada; pré-visualização e publicação explícita.
- Retirar casamento de publicação e desativar links individuais.
- Adicionar destinatários individualmente ou colando nomes em linhas; pesquisar, selecionar e copiar links.
- Links públicos sem login, com identificadores aleatórios; nunca expor a lista de convidados.
- Entidades: casamento, configuração visual, versão publicada e destinatário.

## Exportações

- PDF: Marfim em A5 vertical (148 × 210 mm); Verde & ouro com a proporção original da referência (148 × aproximadamente 237 mm), sem deformar a arte. Fontes incorporadas e ligações clicáveis.
- Incluir todo o conteúdo informativo, adaptando mapas e botões para contactos/endereços.
- Usar React-pdf; acrescentar páginas sem cortar texto quando necessário.
- PNG gerado do mesmo PDF com PDF.js, equivalente a 300 dpi, um ficheiro por página.
- Exportação individual em PDF/PNG e em lote para ZIP.
- Processamento sequencial, progresso, cancelamento e indicação de falhas.
- Exportações finais usam a versão publicada; composição de rascunhos pode ser pré-visualizada.

### Reajuste visual de 08/11/2026

**Revisão com o ficheiro original:** a aproximação desenhada em SVG foi substituída no modelo Verde & ouro pela própria arte de 992 × 1586 px fornecida pelo utilizador. A ferramenta integrada de edição de imagem removeu os textos; a composição preserva a imagem original nos ornamentos e usa o fundo sem letras apenas no centro. A proporção da referência é mantida (148 × aproximadamente 237 mm), sem deformar para A5. O corpo usa Cinzel e os nomes mantêm caligrafia editável. O nome do destinatário aparece abaixo da mensagem de convite, antes da data. Celebração e contactos seguem na segunda folha. Texto longo segue para mais páginas com o mesmo fundo, sem reduzir a fonte. A variante Marfim conserva A5. A publicação continua proibida até autorização futura.

- PDF e PNG seguem a composição da fotografia de referência: papel verde escuro, painel central recortado, textura subtil, molduras interrompidas com filigrana dourada nos quatro cantos e símbolos centrais.
- Nomes caligráficos em duas linhas, unidos por um pequeno E; texto compacto em maiúsculas e data numérica com horário.
- O modelo Marfim mantém a composição clara editável. Verde & ouro preserva a arte original no site e nas exportações; a edição livre de cores e ornamentos fica no Marfim.
- As ligações dos mapas estão nos nomes/moradas dos locais; a data abre o convite digital. O PDF final não tem slogans adicionais, botões sublinhados ou marca de rodapé.
- A arte exportada é plana e não inclui tecido, sombras da fotografia ou inclinação de perspetiva.
- Ajuste feito por ciclos de geração de PDF/PNG e inspeção visual dos ficheiros. A publicação online continua adiada.

## Validação e entrega

- Testar ambos os temas, telemóvel/computador, acentos, nomes longos e múltiplas páginas.
- Testar destinatários, links para mapas e mensagens WhatsApp.
- Verificar PDF/PNG, ZIPs, exportação individual/lote e cancelamento.
- Verificar autenticação/autorização, rascunhos, isolamento de convidados e desativação.
- Preparar a aplicação para publicação futura com convites anónimos e painel protegido, sem publicar nesta fase.
- Sem contas para clientes, pagamentos, fotografias, música ou lista automática de presenças.

## Acompanhamento

- [x] Plano aprovado e documentado.
- [x] Preparar projeto, armazenamento e autenticação.
- [x] Implementar painel, destinatários e publicação dos convites no ambiente local.
- [x] Implementar temas, página pública e exportações.
- [x] Executar testes e corrigir problemas encontrados: 10 testes unitários e 7 testes end-to-end passaram, incluindo referência, nomes extensos, ausência de sobreposição, validade e eliminação; TypeScript e compilação sem erros.
- [ ] Publicação online adiada: aguardar autorização futura do utilizador.

## Execução local

### Ajustes finais solicitados

- Novo convite abre por padrão em Verde & ouro, com a textura e ornamentos da referência visíveis imediatamente no painel.
- A visualização ampliada e a página do convidado usam a mesma composição paginada do PDF. As miniaturas usam a arte original e texto em fluxo.
- O nome do convidado aparece abaixo da mensagem de convite, antes da data, sem sobreposição. Esta regra substitui a colocação anterior na segunda folha.
- O rótulo RSVP foi removido. O espaço livre aumenta a área útil, mantendo confirmação pelo WhatsApp nos contactos.
- A validade é escolhida manualmente para cada convite e é obrigatória para publicar. Termina no fim do dia selecionado, em Africa/Maputo.
- Depois da primeira publicação, a validade só pode ser prolongada. Os links expirados deixam de abrir o convite.
- Rascunhos que nunca foram publicados podem ser eliminados com confirmação. Convites que já foram publicados só podem ser eliminados depois da validade, mesmo retirados de publicação. O servidor aplica a mesma proteção e a eliminação remove os destinatários associados.
- Convites antigos sem validade ficam protegidos de eliminação até ser configurada uma data. A migração de validade já foi aplicada às bases locais normal e de teste.
- A aplicação continua apenas local. Publicação na Internet exige nova autorização explícita.

Código em `web/`. Executar `npm run dev -- --port 3000` nessa pasta e abrir http://127.0.0.1:3000. O login local usa a identidade simulada do starter; produção usa a conta verificada do proprietário. O botão Publicar do painel disponibiliza o convite apenas no servidor em execução e não faz deploy da aplicação.

Os testes de navegador usam a porta 3001 e uma base D1 separada em `.wrangler/test-state`. Os dados da pré-visualização normal ficam em `.wrangler/state`.

