# 07 — Design system e telas

## Identidade

- **Nome:** Chimponto. Slogan: "Seu ponto e seu saldo de horas, sem esperar o RH."
- **Mascote:** Bolota, chimpanzé redonda com crachá e folha na cabeça. 12 humores.
- **Tom:** fofo e divertido, mas confiável. Humor sutil na microcopy ("De volta ao galho!"), números sempre claros.

## Fonte da especificação visual

A spec completa está em [`design/design_handoff_chimponto/README.md`](../design/design_handoff_chimponto/README.md) (handoff do Claude Design, alta fidelidade). Ela define cores, tipografia, raios, espaçamentos, sombras, componentes, telas, microcopy e notificações.

| Pasta do handoff | Uso |
|---|---|
| `src/globals.css` | Copiar para `apps/web` (tokens shadcn `:root`/`.dark` + `@theme inline`) |
| `src/components/ui/{button,badge}.tsx`, `saldo.tsx`, `mascote.tsx`, `cacho-banana.tsx` | Copiar para `apps/web/src/components` |
| `public/icons`, `public/mascote`, `public/manifest.webmanifest` | Copiar para `apps/web/public` |
| `src/lib/ponto.ts` | **Não copiar a lógica de cálculo.** Ver "Precedência" abaixo |
| `referencia/*.html` | Protótipo só para consulta visual (`npx serve design/design_handoff_chimponto/referencia` → `Telas.dc.html`) |

## Precedência

1. **Comportamento, cálculo e dados:** `docs/02` a `docs/06` prevalecem sobre o handoff.
2. **Aparência, layout, microcopy e assets:** o handoff prevalece.
3. Números e nomes nos mockups (jornada 8h48, "Marina Costa", "Lumen Software", valores do holerite, divisor 220h) são **fictícios**. Usar os valores reais do cálculo e da configuração.

## Ajustes ao handoff (decididos)

| Handoff | Implementação |
|---|---|
| `ponto.ts` com `JORNADA_MIN = 528`, falta = −528, só 4 batidas, sem tolerância | Cálculo vem de `packages/domain` (`docs/02`). Jornada = `rules.dailyMinutes` da empresa (padrão 480) |
| Helpers `hm`, `saldoTexto`, `saldoTom`, `saldoFalado` | Mover para `packages/domain/src/format.ts` (são formatação, sem regra de negócio) |
| Tipo de dia "Feriado" como chip editável | Feriado vem só do calendário da empresa (`holidays`); chips do Dia: Normal · Falta · Atestado · Férias · Folga · Abono |
| Nota "Falta desconta a jornada inteira" | Texto: "Falta sem abono desconta o dia e o DSR da semana." (`docs/02` §8.4) |
| Confirmação do OCR mostra NSR e CNPJ | Não exibir NSR (leitura não confiável, `docs/06`). Mostrar só data e hora lidas |
| Dia "N de 4 batidas" | Dias com 5+ batidas são válidos se o número for par; alerta só para número ímpar (`docs/02` §3) |
| Holerite com "Salário base · 220h" | Referência vem de `rules.hourDivisor` |
| "Exportar meus dados · CSV" | Exportar JSON completo + CSV de batidas e saldos |
| Convite por código (`LUMEN-7K2Q`) | Aceitar link **e** código; ambos validados por `accept_invite` |
| Ajustes sem saída da sessão | Linha "Sair" · "Encerra a sessão neste aparelho" (`LogOut`), sessão local. Se falhar (sem conexão e com o token vencido), estado de erro "Não deu para sair" com "Tentar de novo". Fica no grupo "Privacidade e conta"; até o grupo existir, num grupo "Conta" |
| Cofre "tranca sozinho após 5 min" | Abre uma vez por aparelho e fica lembrado (`docs/05`). Ajustes: "Trancar cofre agora" com apoio "Fica aberto neste aparelho até você trancar" |
| Push com ações "Bater agora" e "Lembrar em 5 min" | Só "Bater agora" |
| Sheet "Bater ponto" com grade 2×2 para escolher o tipo | Sem escolha de tipo. No lugar da grade, texto derivado da hora escolhida: "Vai entrar como **volta do almoço**" (`docs/02` §2.1), recalculado ao vivo |

## Regras globais de UI (resumo do handoff)

- Saldo sempre com sinal + cor (`+1h20`, `−0h35` com U+2212, `±0h00`), via `<Saldo>`.
- Números em Manrope com `tabular-nums`; Fredoka só em títulos, nunca em números.
- Amarelo (`primary`, `banana`) nunca é cor de texto no tema claro.
- Alvos de toque ≥ 44 px; ação principal de 56–60 px na metade inferior.
- Cofre trancado: `R$ •••••` em `muted-foreground`.
- Fundos tingidos com `color-mix(in oklab, …)`, nunca oklch.
- Ícones de interface: `lucide-react`.
- Tema claro, escuro e sistema (classe `.dark` no `<html>`).

## Telas

Especificadas no handoff (seções 1–10): Hoje, Bater ponto, Lendo comprovante, Confirmação do OCR, Período, Dia, Salário (trancado / sem cofre / aberto), Criar cofre, Ajustes, Onboarding (Login → Empresa → Instalar no iPhone → Notificações).

Navegação: barra inferior com Hoje · Período · Salário · Ajustes. Dia e Criar cofre são telas filhas sem barra.
