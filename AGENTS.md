# Chimponto

PWA para o trabalhador controlar o próprio ponto (batidas), saldo de horas e estimar o salário líquido. Uso pessoal, extensível a colegas por convite. Não é sistema de ponto oficial.

## Documentação (fonte da verdade)

Leia antes de implementar qualquer coisa:

| Arquivo                                                                                | Conteúdo                                                                                        |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [docs/01-contexto.md](docs/01-contexto.md)                                             | Problema, objetivos, não-objetivos, escopo                                                      |
| [docs/02-regras-de-negocio.md](docs/02-regras-de-negocio.md)                           | Jornada, saldo, horas extras, período, salário — **regras de cálculo**                          |
| [docs/03-arquitetura.md](docs/03-arquitetura.md)                                       | Stack, componentes, decisões de system design, custos                                           |
| [docs/04-modelo-de-dados.md](docs/04-modelo-de-dados.md)                               | Tabelas, RLS, triggers                                                                          |
| [docs/05-seguranca.md](docs/05-seguranca.md)                                           | Criptografia E2E do salário, cofre, repositório público                                         |
| [docs/06-ocr.md](docs/06-ocr.md)                                                       | Leitura do comprovante do REP                                                                   |
| [docs/07-design-system.md](docs/07-design-system.md)                                   | Identidade, precedência sobre o handoff de design, ajustes decididos                            |
| [design/design_handoff_chimponto/README.md](design/design_handoff_chimponto/README.md) | Spec visual completa (tokens, componentes, telas, microcopy)                                    |
| [docs/08-pendencias.md](docs/08-pendencias.md)                                         | Pontos a confirmar com o RH, decisões em aberto, edge cases conhecidos e refatorações pendentes |

## Regras invioláveis

1. **Valores financeiros nunca chegam ao servidor em claro.** Salário, descontos, dependentes e resultado do cálculo são cifrados no navegador (ver `docs/05-seguranca.md`).
2. **Nenhuma imagem é enviada ou persistida.** OCR roda no navegador; a imagem é descartada após a leitura.
3. **Foto nunca é obrigatória.** Registro manual é o fluxo principal.
4. **Todo acesso a dados é isolado por usuário via RLS.** Toda tabela nova nasce com RLS habilitado e teste de isolamento.
5. **Regras de cálculo vivem só em `packages/domain`** (funções puras, sem I/O), com testes. Não duplicar lógica de cálculo em componentes.
6. **Nunca commitar** `.env*`, chaves (`service_role`), fotos de comprovantes ou holerites reais. Fixtures de teste são sintéticas.
7. Valores marcados 🔶 nos docs são padrões provisórios: implementar como **configuração**, nunca hardcoded.
8. **UI segue o handoff de design** (`design/design_handoff_chimponto/`), com os ajustes de `docs/07`. Em conflito de comportamento ou cálculo, `docs/` prevalece; o handoff manda em aparência e microcopy.
9. **Nenhum commit sem `/code-review` e aprovação do usuário.** Antes de qualquer commit:
   1. rodar a skill `code-review` sobre o diff;
   2. mostrar ao usuário os dois relatórios completos (Standards e Spec);
   3. esperar a aprovação explícita do usuário para commitar.

   A review libera o commit quando nenhum achado cai em "Bloqueia" (ver [O que bloqueia e o que vira pendência](#o-que-bloqueia-e-o-que-vira-pendência)). O resto vai para `docs/08-pendencias.md`.

   Se o código mudar depois da review (correções incluídas), a review roda de novo, só sobre as correções. A regra vale mesmo quando outra skill (ex.: `implement`) manda commitar.

   A review roda em uma janela nova (ou após `/clear`), não na janela da implementação. A implementação termina com o código no working tree, sem commit, e as decisões tomadas registradas em `docs/`. As correções da review e a review seguinte ficam na mesma janela da review. Quando o fixed point não é um commit, a chamada diz isso e cita a issue, por exemplo: `/code-review HEAD (working tree) issue #4`.

## O que bloqueia e o que vira pendência

O ticket entra quando o caminho que ele pede funciona. Edge case raro e smell não reabrem a implementação nem a review: viram pendência em `docs/08-pendencias.md`, com o comportamento atual e a correção prevista, e são resolvidos em ticket próprio quando o usuário decidir.

**Bloqueia** (corrige antes do commit) só o que cai em um destes casos:

1. um critério de aceite do ticket falha no uso normal;
2. o usuário perde ou corrompe dados sem perceber, num cenário de uso normal;
3. uma regra inviolável (1 a 8) é quebrada, ou o eixo Standards aponta violação de regra documentada.

"Uso normal" não inclui falha do navegador, do aparelho ou do servidor no meio de uma operação, nem dois aparelhos mexendo no mesmo dado ao mesmo tempo.

**Vira pendência** todo o resto, por exemplo:

- cenário que depende de uma combinação improvável (falha de armazenamento seguida de uma ação específica, cache velho mais edição em outro aparelho);
- efeito visível e recuperável: a tela mostra o estado real e o usuário consegue corrigir;
- texto, layout ou microcopy;
- smell, duplicação, nome, organização de código;
- comportamento fora do escopo do ticket.

Critério rápido: um usuário comum encontra isso usando o app? Se acontecer, ele perde dado sem perceber? Dois "não", pendência. Na dúvida, o agente recomenda e o usuário decide.

**Na implementação:** fazer o que o ticket pede e tratar os erros que o usuário encontra no uso normal. Edge case raro não ganha código; entra em `docs/08` como comportamento atual.

**Na review:**

- O agente passa estes critérios ao sub-agente de Spec, que classifica cada achado em "bloqueia" ou "pendência", com o cenário concreto. O relatório chega ao usuário já separado nas duas classes.
- Smells do eixo Standards não são corrigidos no ticket: vão direto para a lista de refatorações em `docs/08`.
- Uma review completa por ticket. Depois das correções, a review seguinte verifica só as correções (o diff delas e se resolvem os achados), não o ticket inteiro. Achado novo fora das correções só bloqueia se cair nos casos acima.
- No máximo duas rodadas de correção. O que sobrar vai para `docs/08`, e o usuário decide o commit.

**Refatoração** é ticket próprio, aberto a partir da lista de `docs/08` quando um smell atrapalhar uma feature nova ou quando o usuário pedir.

## Testes (obrigatório)

**TDD em todo código com comportamento** (skill `tdd`): escrever o teste que falha → implementar o mínimo para passar. Um ciclo por fatia vertical. Testes só nas _seams_ (interfaces públicas) da tabela abaixo. Nenhum PR sem testes do comportamento que adiciona ou corrige.

| Camada            | Ferramenta                                      | O que testar                                                                                              |
| ----------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `packages/domain` | Vitest                                          | Toda regra de `docs/02`, com os exemplos do doc como casos. Cobertura ≥ 90%                               |
| Banco             | `supabase test db` (pgTAP)                      | Toda política RLS (usuário A não acessa dados de B), RPCs, triggers de lembrete                           |
| Web (componentes) | Vitest + Testing Library                        | Estados de tela, formatação de saldo, fluxo do cofre, parser do OCR                                       |
| E2E               | Playwright (viewport 360 px, Chromium + WebKit) | Fluxos críticos: bater ponto, registro offline e sincronização, editar dia, criar/abrir cofre, onboarding |

- Bug corrigido = teste de regressão que falhava antes.
- Testes usam dados sintéticos; nunca dados reais.
- CI (GitHub Actions) roda lint, typecheck, Vitest, pgTAP, Playwright e gitleaks em todo PR; PR só entra com tudo verde.
- Definição de pronto: testes passando, critérios do ticket atendidos, docs atualizados se a regra mudou.

## Convenções

- TypeScript estrito em tudo. Código e identificadores em inglês; UI e docs em pt-BR.
- Fuso: `America/Sao_Paulo`. Persistir `timestamptz`; datas de calendário como `date`.
- Dinheiro em **centavos (inteiro)**; durações em **minutos (inteiro)**. Nunca float para dinheiro.
- Migrações SQL versionadas em `supabase/migrations/`.

## Comandos

| Comando                                        | O que faz                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `pnpm install`                                 | Instala dependências e ativa o hook de gitleaks                    |
| `pnpm dev`                                     | Sobe o PWA em modo dev (`apps/web/.env.local`, ver `.env.example`) |
| `pnpm test`                                    | Vitest em todos os pacotes (domain com cobertura)                  |
| `pnpm --filter @chimponto/domain test:watch`   | TDD no domínio                                                     |
| `pnpm test:e2e`                                | Playwright (Chromium + WebKit, 360 px) contra o Supabase local     |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | Qualidade                                                          |
| `pnpm dlx supabase start` · `supabase test db` | Banco local (Docker) e testes pgTAP                                |
| `pnpm db:types`                                | Regenera os tipos do banco (`database.types.ts`)                   |

## Agent skills

### Issue tracker

Issues e specs ficam no GitHub Issues (`r-tvrs/chimponto`), via `gh` CLI. Ver `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: um `GLOSSARY.md` e `docs/adr/` na raiz. Ver `docs/agents/domain.md`.
