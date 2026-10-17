# Chimponto

PWA para o trabalhador controlar o próprio ponto (batidas), saldo de horas e estimar o salário líquido. Uso pessoal, extensível a colegas por convite. Não é sistema de ponto oficial.

## Documentação (fonte da verdade)

Leia antes de implementar qualquer coisa:

| Arquivo                                                                                | Conteúdo                                                               |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [docs/01-contexto.md](docs/01-contexto.md)                                             | Problema, objetivos, não-objetivos, escopo                             |
| [docs/02-regras-de-negocio.md](docs/02-regras-de-negocio.md)                           | Jornada, saldo, horas extras, período, salário — **regras de cálculo** |
| [docs/03-arquitetura.md](docs/03-arquitetura.md)                                       | Stack, componentes, decisões de system design, custos                  |
| [docs/04-modelo-de-dados.md](docs/04-modelo-de-dados.md)                               | Tabelas, RLS, triggers                                                 |
| [docs/05-seguranca.md](docs/05-seguranca.md)                                           | Criptografia E2E do salário, cofre, repositório público                |
| [docs/06-ocr.md](docs/06-ocr.md)                                                       | Leitura do comprovante do REP                                          |
| [docs/07-design-system.md](docs/07-design-system.md)                                   | Identidade, precedência sobre o handoff de design, ajustes decididos   |
| [design/design_handoff_chimponto/README.md](design/design_handoff_chimponto/README.md) | Spec visual completa (tokens, componentes, telas, microcopy)           |
| [docs/08-pendencias.md](docs/08-pendencias.md)                                         | Pontos a confirmar com o RH e decisões em aberto                       |

## Regras invioláveis

1. **Valores financeiros nunca chegam ao servidor em claro.** Salário, descontos, dependentes e resultado do cálculo são cifrados no navegador (ver `docs/05-seguranca.md`).
2. **Nenhuma imagem é enviada ou persistida.** OCR roda no navegador; a imagem é descartada após a leitura.
3. **Foto nunca é obrigatória.** Registro manual é o fluxo principal.
4. **Todo acesso a dados é isolado por usuário via RLS.** Toda tabela nova nasce com RLS habilitado e teste de isolamento.
5. **Regras de cálculo vivem só em `packages/domain`** (funções puras, sem I/O), com testes. Não duplicar lógica de cálculo em componentes.
6. **Nunca commitar** `.env*`, chaves (`service_role`), fotos de comprovantes ou holerites reais. Fixtures de teste são sintéticas.
7. Valores marcados 🔶 nos docs são padrões provisórios: implementar como **configuração**, nunca hardcoded.
8. **UI segue o handoff de design** (`design/design_handoff_chimponto/`), com os ajustes de `docs/07`. Em conflito de comportamento ou cálculo, `docs/` prevalece; o handoff manda em aparência e microcopy.

## Testes (obrigatório)

**TDD em todo código com comportamento** (skill `tdd`): escrever o teste que falha → implementar o mínimo para passar. Um ciclo por fatia vertical; refatoração acontece na etapa de review. Testes só nas _seams_ (interfaces públicas) da tabela abaixo. Nenhum PR sem testes do comportamento que adiciona ou corrige.

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

| Comando                                        | O que faz                                         |
| ---------------------------------------------- | ------------------------------------------------- |
| `pnpm install`                                 | Instala dependências e ativa o hook de gitleaks   |
| `pnpm dev`                                     | Sobe o PWA em modo dev                            |
| `pnpm test`                                    | Vitest em todos os pacotes (domain com cobertura) |
| `pnpm --filter @chimponto/domain test:watch`   | TDD no domínio                                    |
| `pnpm test:e2e`                                | Playwright (Chromium + WebKit, 360 px)            |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | Qualidade                                         |
| `pnpm dlx supabase start` · `supabase test db` | Banco local (Docker) e testes pgTAP               |
