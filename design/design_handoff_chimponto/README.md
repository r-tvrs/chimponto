# Handoff: Chimponto — PWA de controle de ponto pessoal

## Visão geral
Chimponto é um PWA mobile-first para o trabalhador CLT acompanhar o próprio ponto:
- registrar as 4 batidas do dia, manualmente ou pela foto do comprovante (OCR);
- ver o saldo do dia e do período de apuração (dia 20 → dia 19);
- estimar o salário líquido do dia 1º, com os valores guardados num **cofre** criptografado por uma senha separada do login;
- receber lembretes 10 min antes da volta do almoço e da saída;
- convidar colegas da mesma empresa (cada um vê só os próprios dados).

Público: devs e analistas de 20 a 40 anos, usando com uma mão em momentos rápidos. O tom é fofo e divertido, mas confiável. O mascote é a **Bolota**, uma chimpanzé redonda com crachá e uma folha na cabeça.

## Sobre os arquivos de design
Os arquivos em `referencia/` são **protótipos em HTML**, feitos para mostrar aparência e comportamento. **Não são código de produção para copiar.** A tarefa é recriar essas telas em **React + Tailwind v4 + shadcn/ui (Radix)**, seguindo os padrões do projeto.

Para ver o protótipo, abra `referencia/Telas.dc.html` num navegador servido por HTTP (ex.: `npx serve referencia`). A página mostra as 16 telas em claro e escuro, todas interativas. Ela carrega `Chimponto App.dc.html`, `support.js`, `mascote.js` e `icons.js` da mesma pasta. Toda a lógica está no bloco `class Component` dentro de `Chimponto App.dc.html`.

Já os arquivos em `src/` e `public/` **são para uso direto**:
- `globals.css` com os tokens;
- variantes de Button e Badge;
- os componentes Saldo, Mascote e CachoBanana;
- as regras de cálculo em `ponto.ts`;
- ícones do PWA, SVGs do mascote e manifest.

## Fidelidade
**Alta fidelidade.** Cores, tipografia, espaçamentos, textos e interações são finais. Recrie pixel a pixel numa tela de 360 px de largura. Em telas maiores, centralize a coluna com `max-w-[420px]`.

A exceção são as ilustrações da Bolota: são esboços geométricos aprovados como direção (proporção, poses, paleta). Podem ser refinadas por um ilustrador depois, sem mudar o nome dos arquivos nem o enquadramento (viewBox 200×224, personagem apoiado embaixo).

---

## Stack e setup
- React + TypeScript, Tailwind v4, shadcn/ui (estilo new-york), `lucide-react` para todos os ícones de interface.
- Fontes do Google Fonts: **Fredoka** (500, 600, 700) para títulos e **Manrope** (400–800) para texto e números.
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  ```
- Copie `src/globals.css`, `src/components/*`, `src/lib/ponto.ts` e `public/*` para o projeto.
- `<head>` do PWA:
  ```html
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">
  <meta name="theme-color" content="#FCFAF4" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#17110D" media="(prefers-color-scheme: dark)">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  ```
- O tema escuro usa a classe `.dark` no `<html>`. Ajustes → Aparência oferece Claro, Escuro e Sistema.

---

## Regras globais (não negociáveis)
1. **Saldo sempre com sinal e cor.** Formato `+1h20`, `−0h35` e `±0h00`. O menos é o caractere U+2212. Use `<Saldo min={…} />` e `saldoTexto()`. Nunca dependa só da cor.
2. **Números sempre em Manrope com `tabular-nums`** (já é o padrão no `body`). Fredoka nunca é usada em números.
3. **Amarelo (`primary` e `banana`) nunca é cor de texto no tema claro.** Ele entra só como preenchimento, com `primary-foreground` (cacau) por cima. Links e abas ativas usam `foreground`.
4. **Alvos de toque ≥ 44 px.** A ação principal tem 56–60 px e fica na metade de baixo da tela.
5. **Cofre trancado = valores ocultos:** `R$ •••••` em `muted-foreground`.
6. **Indicador de offline e de fila** sempre visível no topo da tela Hoje quando houver itens pendentes (veja Estados globais).
7. **Fundos tingidos:** `bg-{token}/12` com texto `text-{token}`. Em CSS puro, `color-mix(in oklab, var(--token) 12%, var(--card))`. **Use oklab, não oklch:** como `--card` tem hue 0, a mistura em oklch puxa o resultado para o rosa.

---

## Design tokens

### Cores (shadcn/ui, `:root` e `.dark`)
| Token | Claro (oklch) | Claro (hex) | Escuro (oklch) | Escuro (hex) | Nota |
|---|---|---|---|---|---|
| `--background` | `oklch(0.985 0.008 90)` | #FCFAF4 | `oklch(0.185 0.012 60)` | #17110D |
| `--foreground` | `oklch(0.25 0.035 55)` | #2F1D11 | `oklch(0.955 0.012 85)` | #F4F0E7 |
| `--card` | `oklch(1 0 0)` | #FFFFFF | `oklch(0.225 0.014 60)` | #211A15 |
| `--card-foreground` | `oklch(0.25 0.035 55)` | #2F1D11 | `oklch(0.955 0.012 85)` | #F4F0E7 |
| `--popover` | `oklch(1 0 0)` | #FFFFFF | `oklch(0.225 0.014 60)` | #211A15 |
| `--popover-foreground` | `oklch(0.25 0.035 55)` | #2F1D11 | `oklch(0.955 0.012 85)` | #F4F0E7 |
| `--primary` | `oklch(0.865 0.165 92)` | #F9CE32 | `oklch(0.865 0.165 92)` | #F9CE32 | banana — só preenchimento, nunca texto no claro
| `--primary-foreground` | `oklch(0.25 0.035 55)` | #2F1D11 | `oklch(0.22 0.03 55)` | #25170D |
| `--secondary` | `oklch(0.955 0.014 85)` | #F4F0E6 | `oklch(0.27 0.016 60)` | #2C251F |
| `--secondary-foreground` | `oklch(0.25 0.035 55)` | #2F1D11 | `oklch(0.955 0.012 85)` | #F4F0E7 |
| `--muted` | `oklch(0.955 0.014 85)` | #F4F0E6 | `oklch(0.27 0.016 60)` | #2C251F |
| `--muted-foreground` | `oklch(0.48 0.03 60)` | #6B5A4D | `oklch(0.74 0.025 75)` | #B4A99A |
| `--accent` | `oklch(0.955 0.014 85)` | #F4F0E6 | `oklch(0.27 0.016 60)` | #2C251F |
| `--accent-foreground` | `oklch(0.25 0.035 55)` | #2F1D11 | `oklch(0.955 0.012 85)` | #F4F0E7 |
| `--destructive` | `oklch(0.52 0.19 27)` | #BE2323 | `oklch(0.72 0.16 25)` | #F97770 |
| `--destructive-foreground` | `oklch(0.985 0.008 90)` | #FCFAF4 | `oklch(0.185 0.012 60)` | #17110D |
| `--border` | `oklch(0.905 0.018 85)` | #E5DFD3 | `oklch(0.32 0.018 60)` | #3A312A |
| `--input` | `oklch(0.87 0.02 85)` | #DAD4C6 | `oklch(0.38 0.02 60)` | #4B4038 | borda de inputs e botões outline
| `--ring` | `oklch(0.62 0.13 80)` | #AF7C00 | `oklch(0.8 0.14 88)` | #E3B842 | foco 3px a 30%
| `--positive` | `oklch(0.5 0.13 150)` | #137738 | `oklch(0.78 0.15 150)` | #67D283 |
| `--positive-foreground` | `oklch(0.985 0.008 90)` | #FCFAF4 | `oklch(0.185 0.012 60)` | #17110D |
| `--negative` | `oklch(0.52 0.19 27)` | #BE2323 | `oklch(0.72 0.16 25)` | #F97770 |
| `--negative-foreground` | `oklch(0.985 0.008 90)` | #FCFAF4 | `oklch(0.185 0.012 60)` | #17110D |
| `--warning` | `oklch(0.52 0.14 58)` | #A24F00 | `oklch(0.8 0.13 72)` | #F1AF57 |
| `--warning-foreground` | `oklch(0.985 0.008 90)` | #FCFAF4 | `oklch(0.185 0.012 60)` | #17110D |
| `--pending` | `oklch(0.5 0.12 305)` | #734F99 | `oklch(0.76 0.1 305)` | #C0A1E4 |
| `--pending-foreground` | `oklch(0.985 0.008 90)` | #FCFAF4 | `oklch(0.185 0.012 60)` | #17110D |
| `--banana` | `oklch(0.865 0.165 92)` | #F9CE32 | `oklch(0.865 0.165 92)` | #F9CE32 | decorativo (spot do mascote, cacho)

Contraste verificado (WCAG 2.x), no pior caso:
- `foreground` sobre `background`: 15,4:1 no claro e 16,4:1 no escuro.
- `muted-foreground` sobre `muted`: 5,8:1 e 6,5:1.
- Texto semântico sobre badge tingido: todos ≥ 4,6:1 no claro e ≥ 5,1:1 no escuro.
- `primary` como texto no claro dá 1,45:1, por isso é proibido.

Cores fixas das ilustrações (não mudam com o tema):
- pelagem #6B4330, sombra #4E2F20
- rosto #F3CDA6, sombra #E0AC84
- olhos #2B1B13
- banana #FFD23F, contorno #D49F00, cabo #7A5A2A
- folha #46A86F e #2F7F52
- crachá #E2574C
- bochecha #F29A88 com opacidade de 0,45 a 0,75

### Tipografia
| Papel | Fonte | Tamanho / altura de linha | Peso | Uso |
|---|---|---|---|---|
| display | Manrope | 40/40, letter-spacing −0,02em | 800 | saldo do período |
| número grande | Manrope | 36/1,05 | 800 | líquido estimado |
| título 1 | Fredoka | 28/28 | 600 | título de tela (Hoje, Período…) |
| título 2 | Fredoka | 20–22/1,2 | 600 | título de sheet, cards, onboarding (26) |
| número | Manrope | 18–26/1 | 800 | horas das batidas, tiles |
| corpo | Manrope | 15/1,45 (14 em descrições) | 500–600 | texto geral |
| botão | Manrope | 16–17 | 800 | ações principais |
| apoio | Manrope | 12,5/1,3 | 600 | legendas, `muted-foreground` |
| rótulo | Manrope | 11, caixa-alta, letter-spacing 0,08em | 700 | cabeçalhos de grupo |
| aba | Manrope | 11,5 | 800 ativa / 600 inativa | barra inferior |
| código | ui-monospace | 21, letter-spacing 0,06em | 700 | código de recuperação |

### Raios
| Raio | Uso |
|---|---|
| 999 | pills, badges, switch |
| 12 | inputs pequenos e botões de ícone quadrados |
| 14 | inputs, botões default, segmentados (11 por dentro) |
| 16 | botão lg e tiles de stats |
| 18 | botão "ponto" e tiles |
| 20 | cards |
| 24 | cards hero |
| 26 | topo do sheet |
| 34 | moldura do celular (só no protótipo) |

### Espaçamento
- Base de 4 px.
- Padding lateral das telas: 16 px (onboarding: 20 px).
- Gap entre blocos: 12 px (14 em formulários).
- Padding de card: 14–16 px.
- Altura do cabeçalho de tela: 52 px.

### Sombras
- Botão primário: `inset 0 -3px 0 color-mix(in oklab, var(--primary) 70%, var(--foreground))`. No CTA "Bater ponto", somar `0 8px 20px -8px color-mix(in oklab, var(--primary) 70%, transparent)`.
- Segmentado ativo: `0 1px 3px rgba(0,0,0,.12)`.
- Thumb do switch: `0 1px 2px rgba(0,0,0,.25)`.
- Toast: `0 10px 30px -10px rgba(0,0,0,.4)`.
- Foco: anel de 3 px em `ring` a 30% + borda `ring`.

---

## Componentes (variações do shadcn)
- **Button** (`src/components/ui/button.tsx`)
  - Variantes: `default` (banana com borda inferior escura), `secondary` (muted), `outline` (card + borda input), `ghost`, `link` (sublinhado, offset 3 px), `destructive`.
  - Tamanhos: `default` 44 px · r14, `lg` 56 px · r16, `ponto` 60 px · r18 · largura total · ícone 24, `icon` 44 px redondo.
  - Ao pressionar: `translate-y-px`. Desabilitado: opacidade 0,45.
- **Badge** (`src/components/ui/badge.tsx`): `positive`, `negative`, `warning`, `pending`, `neutral`, `today`. Fonte 12/1, peso 700, padding 7×10.
- **Switch**: ligado usa `bg-foreground` com thumb `bg-card`, nunca amarelo (banana sobre branco não atinge 3:1 de contraste de objeto). Trilho 46×28, thumb 22, desloca 18 px, transição de 0,2 s. No shadcn, troque `data-[state=checked]:bg-primary` por `data-[state=checked]:bg-foreground` e o thumb para `bg-card`.
- **Tabs (segmentado)**: container `bg-muted p-1 rounded-[14px]`; gatilho com 40–44 px de altura, `rounded-[11px]`, 13,5/700. Ativo: `bg-card text-foreground` com sombra. Inativo: `text-muted-foreground`.
- **Input**:
  - Altura 52 px (56 nos campos de data e hora do sheet), raio 14, borda `input`, fundo `card` (`background` dentro de sheets), padding 0 16, 16/600.
  - Campo de hora: 22/800 tabular. Erro: borda `negative` + mensagem 12,5/700 `text-negative`.
- **Card**: `bg-card border rounded-[20px]`, padding 14–16.
- **Sheet** (Radix Dialog como bottom sheet):
  - `bg-card`, raio 26 só no topo, padding 8 16 18, altura máxima 90%.
  - Alça de 40×5 em `border`. Título Fredoka 22. Botão fechar de 44 px redondo em `bg-muted` com ícone `X`.
  - Overlay `--scrim`: `oklch(0.2 0.03 55 / .45)` no claro e `oklch(0 0 0 / .6)` no escuro.
  - Entra com `translateY`, 320 ms, `cubic-bezier(.2,.8,.2,1)`. O overlay faz fade de 250 ms.
- **Dialog** (AlertDialog): só para ações destrutivas. Card r24, padding 20. Botões lado a lado: Cancelar (outline) à esquerda e Excluir (destructive) à direita, com 48 px.
- **Toast** (sonner ou equivalente):
  - Topo, 40 px abaixo da status bar.
  - `bg-foreground text-background`, raio 16, padding 12×16, 13,5/700.
  - Ícone lucide 18 px na cor `banana`. Some em 2,6 s. Entra com translateY de −16 px e fade de 250 ms.
- **Saldo** (`src/components/saldo.tsx`): sinal + cor + `aria-label` falado ("mais 1 hora e 20 minutos").
- **Mascote** (`src/components/mascote.tsx`):
  - `<Mascote humor="almoco" size={84} />`: círculo `bg-banana` com o SVG ocupando 86% da largura, apoiado embaixo e cortado pelo círculo.
  - Abaixo de 40 px, use `/mascote/icone.svg`.
- **CachoBanana** (`src/components/cacho-banana.tsx`): progresso de 0 a 4 batidas. Sempre acompanhado do texto "N de 4". As bananas vazias usam `currentColor` (`text-muted-foreground`).

### Ícones (lucide-react, traço 2, 20 px padrão, 24 na ação principal, 16 em linhas densas)
| Uso | Ícone lucide |
|---|---|
| Abas | Hoje `Clock` · Período `CalendarDays` · Salário `Wallet` · Ajustes `Settings` |
| Bater ponto | `Fingerprint` |
| Comprovante / OCR | `Camera` · `ScanLine` |
| Editar batida | `Pencil` |
| Alerta | `TriangleAlert` |
| Offline / fila | `CloudOff` · `WifiOff` |
| Cofre | `Lock` · `LockOpen` · `ShieldCheck` · `KeyRound` · `Eye` · `EyeOff` |
| Lembretes | `Bell` |
| Empresa e convites | `Building2` · `Calendar` · `UserPlus` · `Mail` |
| Dados | `Download` · `Trash2` · `Shield` · `Copy` |
| Sucesso / toast | `Banana` · `CircleCheck` |
| Navegação | `ChevronLeft` · `ChevronRight` · `X` · `Check` · `Info` |
| Instalar no iPhone | `Share` · `SquarePlus` |
| Aparência | `Sun` · `Moon` · `Monitor` |

---

## Navegação
- **Barra inferior com 4 abas:** Hoje, Período, Salário, Ajustes.
  - `bg-card`, borda superior, padding 6 4 16, grade de 4 colunas, cada item com 54 px de altura mínima.
  - O ícone fica dentro de uma pílula de 56×30. Ativa: `bg-primary text-primary-foreground`. Inativa: transparente, `text-muted-foreground`.
  - Rótulo de 11,5 px. Use `aria-current="page"` na aba ativa.
- Telas filhas sem barra: **Dia** (vem de Período) e **Criar cofre** (vem de Salário). Ambas têm um botão voltar `ChevronLeft` de 44 px no cabeçalho.
- Onboarding (sem barra): Login → Empresa → Instalar no iPhone → Notificações → Hoje.

## Telas

### 1. Hoje (`Telas.dc.html#2a`)
**Para quê:** ver o dia e bater o ponto com uma mão.

Layout em coluna, padding 6 16 108, gap 12. Os 108 px de baixo deixam espaço para o CTA fixo.
1. **Cabeçalho** (52 px)
   - À esquerda: data "sex, 16 de outubro" (12,5/600 muted) sobre o título "Hoje" (Fredoka 28).
   - À direita: pill de sync (quando houver) e avatar de 40 px redondo em `bg-muted` com as iniciais "MC" (13/700).
2. **Banner offline** (só offline)
   - `bg-muted`, r16, padding 10 14 10 10.
   - Mascote `offline` num círculo de 52 px com fundo `pending` a 18%.
   - Título "Sem sinal na selva" (14/700). Texto: "Suas batidas ficam salvas aqui e sobem quando a conexão voltar." (12,5/500 muted).
3. **Card "Próximo"** (card r20, padding 16, gap 14)
   - Mascote de 84 px (veja o mapeamento abaixo).
   - Rótulo "PRÓXIMO" (11/700, caixa-alta, tracking 0,07em, muted).
   - Título "Volta do almoço às 14:28" (Fredoka 19/1,2).
   - Linha de apoio "em 7 min · almoço de 1h" (13/600 muted).
   - Com o dia completo: rótulo "DIA FECHADO", título "Saldo do dia +0h03" e apoio "Bom descanso. Amanhã tem mais galho."
4. **Alerta de almoço curto** (quando almoço < 60 min): fundo `warning`/12, texto `warning` 13/700, `TriangleAlert` 18. Texto: "Almoço de 53 min · o mínimo é 1h".
5. **Card "Batidas"** (padding 6, r20)
   - Cabeçalho: "Batidas" (Fredoka 17) + "2 de 4" (12,5/700 muted) + `CachoBanana` de 34 px.
   - 4 linhas-botão de 52 px, r14. Grade: 22 px (marcador) · 1fr (rótulo) · auto (hora) · 20 px (lápis).
   - Marcadores de 20 px com borda de 2:
     - feito = `bg-foreground` com `Check` 12 em `card`;
     - próxima = `bg-primary` com borda `foreground`;
     - futura = vazia com borda `input`.
   - Linha da próxima batida: fundo `primary` a 18% sobre `card`, rótulo em 800 e legenda "próxima batida" (11,5/700 muted).
   - Hora: 18/800 tabular. Batida feita em `foreground`. Prevista em `muted`, com o prefixo "prev." (11,5/600).
   - Tocar numa batida feita abre o sheet para editá-la. Tocar numa pendente abre o sheet para a próxima.
6. **Tiles** (grade 2×, gap 10, r18, padding 14)
   - "Trabalhadas" 4h26 (26/800) com "de 8h48".
   - "Saldo do dia" mostra "—" e "fecha na saída" enquanto incompleto. Completo: `<Saldo>` e "jornada 8h48".
7. **Tile do período** (botão de 64 px que leva a Período): "Saldo do período · 20 set – 19 out" + `<Saldo>` 22/800 + `ChevronRight`.
8. **CTA fixo**
   - Posição: `absolute bottom-0`, padding 18 16 12, fundo em degradê de `background` (72%) para transparente.
   - Botão `size="ponto"` com `Fingerprint` 24. Texto em duas linhas: "Bater ponto" (17/800) e o tipo da próxima batida em minúsculas (12/700, opacidade 0,8).
   - Com o dia completo: `bg-muted text-muted-foreground`, `CircleCheck`, "Dia completo · 4 de 4 batidas", desabilitado.

**Mascote da Hoje:**
| Situação | Humor |
|---|---|
| offline | `offline` |
| 0 batidas | `boasvindas` |
| 1 batida | `tranquilo` |
| 2 batidas | `almoco` |
| 3 batidas | `saida` se faltar ≤ 30 min para a saída prevista, senão `tranquilo` |
| 4 batidas | `feliz` (saldo +), `preocupado` (saldo −) ou `tranquilo` (zerado) |

### 2. Bater ponto — sheet (`#2b`)
- Título "Bater ponto".
- **Tipo:** grade 2×2 de botões de 44 px, r12: Entrada · Saída almoço · Volta almoço · Saída. Vem selecionado o tipo da próxima batida. Selecionado: `bg-foreground text-background`. Os outros: `card` com borda `input`.
- **Data + Hora** (colunas 1,15fr / 1fr, gap 8): `<input type="date">` e `<input type="time">` com 56 px. Rótulos 12/700 muted. Já vêm com a data de hoje e a **hora atual**.
- **Aviso ao vivo** (fundo tingido, 13/700, ícone 18), recalculado a cada mudança de hora:
  - Volta do almoço com almoço < 60 min: `warning` + "Almoço de 53 min. O mínimo é 1h; volta prevista às 14:28."
  - Saída: "Com essa saída, o saldo do dia fica +0h03." em `positive` com `CircleCheck`, ou em `negative` com `Clock` quando o saldo for negativo.
- **Observação:** input de 48 px com placeholder "Observação (opcional)".
- **"Salvar batida":** botão primário de 56 px.
- Link secundário com `Camera`: "Usar foto do comprovante" (sublinhado).
- Toasts ao salvar (ícone `Banana`):
  - "Bom dia! Entrada às HH:MM."
  - "Bom almoço! Saída às HH:MM."
  - "De volta ao galho! Volta às HH:MM."
  - "Até amanhã! Saída às HH:MM."
- Offline, o toast é "Salvo no aparelho. Sobe quando o sinal voltar." com `CloudOff`, e a fila soma 1.

### 3. Lendo comprovante — sheet (`#2c`)
- Título "Lendo comprovante".
- Área da foto: altura 220, r18, borda.
- Mascote `lupa` de 96×108 no canto inferior direito.
- Texto "Procurando data e hora…" (15/700) e barra de progresso de 6 px (`muted` com preenchimento `banana`).
- Ao terminar, vai para a confirmação. No protótipo isso leva 1,7 s.

### 4. Confirmação do OCR — sheet (`#2d`)
- Título "Confira a leitura".
- Miniatura de 76×100, r12.
- Ao lado:
  - "Leitura com boa confiança" (13/800 `positive` + `ScanLine`);
  - nome da empresa (13/600);
  - "NSR 000184522 · CNPJ 12.345.678/0001-90" (12/500 muted).
- Campos "Data lida" e "Hora lida" editáveis, com **borda de 2 px em `banana`** para indicar que vieram da leitura.
- Texto: "Vai entrar como **volta do almoço**. Toque nos campos para corrigir."
- "Confirmar batida" (primário com `Check`) e "Tirar outra foto" (ghost).
- Toast: "Batida das 14:19 lida do comprovante."
- Se a confiança for baixa, troque o texto para `warning` e não preencha os campos ilegíveis.

### 5. Período (`#2e`)
1. Título "Período".
2. **Seletor:** `bg-muted` r16 p4. Botões de 44 px com `ChevronLeft` e `ChevronRight`. No centro, "20 set → 19 out" (15/800) e "período atual · fecha em 3 dias" (11,5/600 muted). O próximo período fica desabilitado (opacidade 0,45) enquanto não começar.
3. **Resumo** (card r20)
   - "Saldo do período" + `<Saldo>` display 40.
   - Mascote de 64 px: `feliz`, `preocupado` ou `tranquilo`, conforme o sinal.
   - 3 mini-tiles (`bg-muted` r12 p10):
     - "Horas extras" com a soma dos saldos positivos (`positive`);
     - "Débito" com a soma dos negativos (`negative`);
     - "Pendências" com o número de dias com alerta (`warning`).
4. **Filtro segmentado:** "Todos os dias" / "Pendências (N)".
5. **Lista** (card r20)
   - Cabeçalhos de mês "OUTUBRO" e "SETEMBRO" em `bg-muted`, 11/700 caixa-alta.
   - Linhas de 62 px separadas por borda. Grade: 40 px (dia da semana 10,5/700 muted sobre o número 19/800) · 1fr (trabalhadas 14/600 + badge) · saldo 15/800 · `ChevronRight` 16.
   - Badges:
     - `today` "Hoje" (linha com fundo `primary` a 12%);
     - `pending` "Sem registro";
     - `warning` "3 de 4 batidas" / "Almoço curto";
     - `neutral` "Feriado" / "Atestado" / "Férias" / "Folga" / "Abono";
     - `negative` "Falta".
   - Dias completos sem alerta não levam badge.
   - Dias futuros com opacidade 0,55.
   - Tocar abre **Dia**. "Hoje" abre a aba Hoje.

### 6. Dia (`#2f`)
1. **Cabeçalho:** botão voltar + "Período 20 set → 19 out" (12/600 muted) + título "qua, 14 out" (Fredoka 24).
2. **Alertas** do dia (cards `warning`/12 com título 13,5/800 e detalhe 12,5/600). Exemplo: "Almoço de 42 min" / "O mínimo é 1h para jornada acima de 6h (CLT)."
3. **Tipo do dia:** chips de 38 px, r999, 13/700. Opções: Normal · Falta · Atestado · Férias · Folga · Abono. Selecionado: `bg-foreground text-background`.
   - Fora de "Normal", o card de batidas fica com opacidade 0,5 e aparece uma nota (12,5/600 muted):
     - abonado: "Dia abonado: conta como 8h48 trabalhadas.";
     - falta: "Falta sem abono desconta a jornada inteira (8h48).";
     - feriado: "Feriado da empresa: não conta jornada."
4. **Batidas:** card com 4 linhas de 56 px. Rótulo (15/600) + `<input type="time">` de 118×44 (17/800). Tudo é recalculado ao vivo.
5. **Tiles** "Trabalhadas" e "Saldo do dia" (`bg-muted` r16, 20/800).
6. Observação (input de 48 px).
7. **"Salvar dia"** (primário de 56 px, preso embaixo). Volta para Período com o toast "Dia 14 salvo".

### 7. Salário — cofre trancado (`#2g`) / sem cofre / aberto (`#2h`)
**Trancado**
- Card centralizado:
  - mascote `cofre` num círculo de 132 px;
  - "Cofre trancado" (Fredoka 20);
  - `R$ •••••` (34/800 muted, tracking 0,04em);
  - "Líquido estimado · cai em 1º nov" (13/600 muted).
- Nota de confiança com `ShieldCheck`: "Salário e descontos ficam criptografados com uma senha só sua, separada do login. Nem a equipe do Chimponto consegue abrir."
- Embaixo:
  - campo "Senha do cofre" (password, 52 px), com botão olho de 44 px dentro do campo;
  - erro em `negative`: "Digite a senha do cofre." / "Senha incorreta. Confira e tente de novo.";
  - "Abrir cofre" (primário com `LockOpen`; Enter também envia);
  - link "Esqueci a senha · usar código de recuperação".

**Sem cofre**
- Mascote `cofre` + "Seu salário mora num cofre" + "Para estimar o líquido do dia 1º, o Chimponto precisa do seu salário e descontos. Eles ficam trancados com uma senha que só você sabe."
- Botão "Criar cofre".

**Aberto**
- Cabeçalho com botão "Trancar" (outline de 44 px, `Lock`).
- **Hero** `bg-primary text-primary-foreground`, r24, padding 18:
  - "Líquido estimado" (12,5/700);
  - **R$ 2.874,49** (36/800);
  - "cai em dom, 1º nov" (13/700);
  - "período 20 set → 19 out" (12/600, opacidade 0,85);
  - mascote `contando` de 112×125 vazando no canto inferior direito.
- Aviso `bg-muted` com `Info`: **"Estimativa — o oficial é o holerite."**
- **Holerite** (card r20). Grade: descrição 1fr · referência (12,5 muted) · valor (800, à direita).
  - Proventos: Salário base · 220h · 8.500,00 / Horas extras 50% · 5h02 · 291,67 / DSR sobre extras · 69,44 → Total proventos 8.861,11
  - Descontos: Atrasos e saídas · 1h52 · −72,13 / INSS · teto · −988,07 / IRRF · 27,5% · −1.236,52 / Plano de saúde · −289,90 / Adiantamento · 20 out · −3.400,00 → Total descontos −5.986,62
  - Líquido (borda superior de 2 px em `foreground`, 17/800): R$ 2.874,49
  - Os subtotais ficam acima de uma borda tracejada, em 13/700 muted.
  - *Os valores são fictícios. INSS e IRRF devem seguir as tabelas vigentes, e as horas extras e o débito vêm do Período.*
- Link "Editar salário e descontos" → Ajustes.

### 8. Criar cofre (`#2i`, `#2j`)
- Cabeçalho com voltar, "Criar cofre" (Fredoka 20) e "1 de 2" / "2 de 2".

**Passo 1**
- Mascote `cofre` de 76 px + "Crie a senha do cofre" (Fredoka 21) + "Diferente da senha de login. Ela nunca sai do seu aparelho."
- Senha (password) com medidor de força em 4 barras de 6 px, r3. A pontuação vai de 0 a 4:
  - +1 com ≥ 8 caracteres;
  - +1 com ≥ 14 caracteres;
  - +1 se tiver letras e números;
  - +1 se tiver símbolo ou maiúscula;
  - limitada a 1 se tiver menos de 8 caracteres.
- Cores do medidor: ≤ 1 `negative`, 2 `warning`, ≥ 3 `positive`.
- Textos: vazio "Use 8 ou mais caracteres. Uma frase curta funciona bem." / "Muito curta" / "Fraca" / "Razoável" / "Boa" / "Forte".
- Confirmação: com valores diferentes, borda `negative` + "As senhas não batem."
- "Continuar" habilitado só com ≥ 8 caracteres, força ≥ 2 e senhas iguais.

**Passo 2**
- "Guarde seu código de recuperação" (Fredoka 22) + "Se esquecer a senha, só este código abre o cofre."
- Aviso `warning`: "Sem a senha e sem este código, ninguém recupera seus dados de salário — nem a gente. Ele aparece só agora."
- Caixa com borda tracejada de 2 px em `input`, r18:
  - código `BNN4-7KQ2-XC9M-T3PA` (mono 21/700);
  - botões "Copiar" (`Copy`) e "Baixar .txt" (`Download`), outline de 44 px.
- Checkbox de 24 px, r7: "Guardei o código num lugar seguro (gerenciador de senhas ou papel)."
- "Abrir meu cofre" fica desabilitado (opacidade 0,45) até o checkbox ser marcado. Ao concluir, o cofre abre e mostra o toast "Cofre criado e aberto".

### 9. Ajustes (`#2k`)
- Card de perfil: avatar de 48 px + "Marina Costa" + "marina@lumen.dev · Lumen Software".
- Grupos com rótulo em caixa-alta e card com linhas de 58–62 px (ícone 20 muted · título 14,5/600 · apoio 12,5/500 muted · `ChevronRight`):
  - **Notificações** (com switch):
    - "Volta do almoço" · "10 min antes · "Hora de voltar pro galho!"";
    - "Saída" · "10 min antes · "Mochila nas costas?"".
  - **Cofre:**
    - "Trancar cofre agora" (ou "Abrir cofre"), "Tranca sozinho após 5 min";
    - "Trocar senha do cofre";
    - "Código de recuperação · Gerado em 02 out 2026".
  - **Dados salariais:**
    - "Salário e descontos" (mostra `R$ •••••` com o cofre trancado);
    - "Adiantamento · Dia 20 · 40% do salário".
  - **Empresa:**
    - "Lumen Software Ltda · Jornada 8h48 · seg a sex · almoço 1h";
    - "Feriados · 12 cadastrados";
    - "Convidar colegas · Cada um vê só os próprios dados".
  - **Privacidade e conta:**
    - "Privacidade";
    - "Exportar meus dados · CSV com batidas e saldos";
    - "Excluir conta" (texto e ícone em `destructive`), que abre o Dialog.
  - **Aparência:** segmentado Claro (`Sun`) · Escuro (`Moon`) · Sistema (`Monitor`).
- **Dialog "Excluir conta?":** "Apaga batidas, cofre e convites deste aparelho e do servidor. Não dá para desfazer."

### 10. Onboarding (`#2l`–`#2o`)
O padding lateral é de 20 px. Telas 2 a 4 têm um progresso de 3 barras de 5 px (feitas em `foreground`, o restante em `border`).
- **Login**
  - Mascote `boasvindas` num círculo de 168 px, "Chimponto" (Fredoka 38) e "Seu ponto e seu saldo de horas, sem esperar o RH."
  - Embaixo:
    - "Continuar com Google" (outline de 52 px; use o logo oficial do Google);
    - divisor "ou";
    - e-mail (52 px, placeholder "seu@email.com");
    - "Receber link mágico" (primário com `Mail`);
    - "Sem senha: mandamos um link que entra direto."
- **Empresa:** "Onde você trabalha?" + "Colegas da mesma empresa dividem jornada e feriados. Cada um vê só os próprios dados." Dois cartões-rádio, r18, com borda de 2 px (`foreground` quando selecionado, `border` quando não):
  - "Tenho um convite" (`Mail`): ao selecionar, mostra o campo do código `LUMEN-7K2Q` e a confirmação "Lumen Software Ltda · 14 colegas" (`positive`, `CircleCheck`).
  - "Criar empresa" (`Building2`): ao selecionar, mostra o nome da empresa e a jornada (8h48).
  - Botão "Continuar".
- **Instalar no iPhone**
  - Título "Instale no iPhone" + "No iPhone, os lembretes só funcionam com o Chimponto na tela de início. Leva 10 segundos."
  - Três passos de 64 px:
    1. "No Safari, toque em **Compartilhar**" (`Share` em azul iOS);
    2. "Escolha **Adicionar à Tela de Início**" (`SquarePlus`);
    3. "Abra pelo ícone do Chimponto" (ícone de 40 px).
  - Uma barra do Safari estilizada destaca o `Share` com um anel `banana` de 2 px.
  - Botões "Já instalei" e "Estou no Android · pular". Mostre esta tela só em iOS e quando o app não estiver instalado (`display-mode: standalone`).
- **Notificações**
  - Mascote `almoco` num círculo de 150 px, "Lembretes na hora certa" e "Avisamos 10 min antes da volta do almoço e da saída. Só isso."
  - Prévia da notificação em `bg-muted` r20.
  - "Ativar lembretes" (com `Bell`) chama `Notification.requestPermission()` e assina o push. "Agora não" pula.

### Estados globais
- **Pill de sync** no cabeçalho da Hoje: altura 30, `bg-pending/12 text-pending`, 11,5/700, `CloudOff` 14. Offline: "Offline · N na fila". Online com fila: "N na fila". Some quando a fila zera.
- Na status bar, o ícone de Wi-Fi vira `WifiOff` (só no protótipo; no app real a status bar é do sistema).
- **Erro genérico:** mascote `erro` + mensagem clara + "Tentar de novo".

---

## Regras de negócio e estado
Toda a lógica está em `src/lib/ponto.ts`.
- **Constantes:** jornada de 528 min (8h48), almoço mínimo de 60 min, lembretes 10 min antes. O período vai do dia 20 ao dia 19 e o pagamento cai no dia 1º seguinte (`periodoDe()`).
- **Saldo do dia:** trabalhadas − jornada, calculado só com as 4 batidas.
- **Previsões:**
  - volta = saída do almoço + 60;
  - saída = entrada + 528 + almoço real (60 se ainda não voltou).
- **Alertas:**
  - almoço < 60 → `warning`;
  - dia passado com 1 a 3 batidas → `warning` "N de 4 batidas";
  - dia útil passado sem batidas → `pending` "Sem registro".
- **Tipos de dia:**
  - falta = −528;
  - atestado, férias, folga e abono = 0 (abonado);
  - feriado vem do calendário da empresa e não conta jornada.
- **Resumo do período:** extras = soma dos saldos positivos, débito = soma dos negativos, pendências = dias com alerta (sem contar hoje e dias futuros).

**Estado mínimo:**
```ts
type Estado = {
  hoje: Batidas;                         // ["09:02","13:28",null,null]
  dias: Record<string /*ISO*/, { batidas: Batidas; tipo: TipoDia; obs?: string }>;
  filaSync: Array<{ id: string; dia: string; indice: 0|1|2|3; hora: string; origem: "manual"|"ocr" }>;
  online: boolean;
  cofre: "inexistente" | "trancado" | "aberto";
  tema: "light" | "dark" | "system";
  lembretes: { almoco: boolean; saida: boolean };
};
```
- **Offline-first:** grave as batidas em IndexedDB primeiro e coloque na fila. A fila é enviada quando voltar a conexão (evento `online` / Background Sync).
- **Cofre:**
  - os dados salariais são cifrados no cliente (por exemplo, WebCrypto AES-GCM com chave derivada da senha via PBKDF2 ou Argon2);
  - o servidor guarda só o texto cifrado;
  - o código de recuperação é uma segunda chave que cifra a mesma chave de dados;
  - o cofre tranca sozinho depois de 5 min.
- **Lembretes:** agende pelo servidor (Web Push) para `previsto − 10 min` e recalcule a cada batida.

## Notificações push
| Gatilho | Título | Corpo | Ações (Android) |
|---|---|---|---|
| volta prevista − 10 min | Hora de voltar pro galho! 🍌 | Bata o ponto às {hora} — faltam 10 min. | Bater agora · Lembrar em 5 min |
| saída prevista − 10 min | Mochila nas costas? 🎒 | Sua saída prevista é {hora}. Bata o ponto antes de ir. | Bater agora · Lembrar em 5 min |

```js
// service worker
self.registration.showNotification(title, {
  body, lang: "pt-BR", tag: "lembrete-" + tipo, renotify: true,
  icon: "/icons/icon-192.png", badge: "/icons/badge-96.png",
  actions: [{ action: "bater", title: "Bater agora" }, { action: "adiar", title: "Lembrar em 5 min" }],
  data: { url: "/?bater=1" },
});
```
"Bater agora" abre o app com o sheet já aberto na hora atual. Nada é registrado sem a confirmação do usuário.

## Assets
- `public/icons/`:
  - `icon-192.png` e `icon-512.png` (purpose any, cantos arredondados);
  - `icon-maskable-192.png` e `icon-maskable-512.png` (sangria total, rosto dentro da zona segura de 80%);
  - `apple-touch-icon-180.png`;
  - `badge-96.png` (monocromático, para a barra de status do Android);
  - `icon.svg` e `icon-maskable.svg`.
- `public/mascote/*.svg`: 12 humores (feliz, preocupado, tranquilo, almoco, saida, cofre, contando, pendente, offline, boasvindas, lupa, erro) + `icone.svg` (só o rosto). Todos com viewBox 200×224 (o ícone tem 200×200), sem dependências. Os estados `pendente` ("?") e `contando` ("+1") têm texto que usa Fredoka quando disponível.
- `public/manifest.webmanifest`: tema `#F9CE32`, fundo `#FCFAF4`.
- Todos os ícones e ilustrações foram criados para este projeto. O logo do Google no botão de login deve vir das diretrizes oficiais do Google.

## Arquivos
```
design_handoff_chimponto/
├── README.md
├── src/
│   ├── globals.css                 ← tokens shadcn (:root/.dark) + @theme inline
│   ├── lib/ponto.ts                ← cálculos, formatação de saldo, período 20→19
│   └── components/
│       ├── saldo.tsx
│       ├── mascote.tsx
│       ├── cacho-banana.tsx
│       └── ui/{button,badge}.tsx   ← variantes do shadcn
├── public/
│   ├── manifest.webmanifest
│   ├── icons/…
│   └── mascote/…
└── referencia/                     ← protótipo HTML (só referência)
    ├── Telas.dc.html               ← todas as telas, claro e escuro (abrir este)
    ├── Chimponto App.dc.html       ← protótipo interativo + lógica (class Component)
    ├── Sistema.dc.html             ← logo, ícone, tipografia, tokens, mascote, componentes, push
    ├── mascote.js                  ← gerador dos SVGs do mascote
    ├── icons.js · support.js       ← runtime do protótipo
    └── icons/…
```
