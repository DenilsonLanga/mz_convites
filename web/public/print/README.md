# Arte de impressão

## Verde e dourado

- `petrol-gold-original.png`: cópia sem alterações do ficheiro de referência fornecido pelo utilizador, de 992 × 1586 px.
- `petrol-gold-background.png`: edição sem textos, criada pela ferramenta integrada `image_gen` a partir dessa referência, com as mesmas dimensões.
- O componente `ReferenceInvitationPDF` usa a imagem original para preservar os ornamentos, margens, símbolos e textura. Apenas a zona central com a tipografia antiga recebe a edição sem textos, através de uma janela de recorte durante a composição do documento. Os PNGs exportados são renderizados do próprio PDF.
- A proporção original é preservada. O formato do PDF usa 148 mm de largura e aproximadamente 237 mm de altura. A variante Marfim continua em A5.
- Nomes: Pinyon Script ou a opção clássica; corpo do modelo da referência: Cinzel. Todas as fontes são locais. Camadas de sombra, brilho e dourado dão acabamento às letras dos nomes.
- O nome do destinatário aparece imediatamente abaixo de «Convidam para o seu casamento», antes da data. Celebração, contacto e conteúdo adicional ficam numa segunda folha. Nomes e mensagens extensos podem ocupar mais folhas, sem encolher a tipografia.

## Prompt da edição

Ferramenta: `image_gen`, modo integrado de edição; sem CLI/API externa.

```text
EDIT the provided wedding invitation image. This is a precise text-removal operation to create a reusable print background, NOT a redesign. Remove ONLY all existing typography: 'Débora', 'E', 'Paulo', 'CONVIDAM PARA O SEU CASAMENTO', the date/time line, the venue/address lines, and 'RSVP'. Inpaint those exact letter areas with the same surrounding deep petrol green embossed/rough paper texture. Preserve ALL other parts of the image: exact original canvas dimensions and 5:8 portrait aspect ratio, the dark teal petrol green color, fine dense tactile rough paper grain, the raised central scalloped layered panel and its subtle bevel/shadow, all four EXACT ornate metallic gold filigree corners with rounded gold raised beads at line endpoints, the thin paired vertical gold rules at the left and right middle edges, and the small top and bottom fleur-de-lis gold ornaments. All decorative artwork must retain its exact position, shape, width, scale, lighting, metallic gold highlights and dark relief shadows. Do not flatten the foil into a flat color, do not simplify any curl, do not add decorations. Do not add any text, letters, mockup fabric, perspective, margin, watermark or logos. Output just this original invitation artwork as a clean, empty, print-ready background. Invariants: preserve the entire original design as faithfully as possible; the only intended change is removing typography.
```

`paper-grain.png` pertence à composição anterior e permanece apenas na variante Marfim; não é usado para substituir a textura do modelo de referência.
