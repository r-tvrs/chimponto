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
| Tipo de dia "Feriado" vindo do calendário da empresa | Feriado é chip editável, marcado pelo usuário (`docs/03` D7); chips do Dia: Normal · Falta · Atestado · Férias · Folga · Abono · Feriado. Nota: "Feriado: não conta jornada." |
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
| Card Batidas sempre com 4 linhas, "N de 4" | 4 linhas, ou o total quando passa de 4, arredondado para par: 5 batidas mostram "5 de 6". A próxima linha tem o rótulo que uma batida agora teria (o mesmo do CTA); as pendentes são os rótulos de um dia completo ainda não cobertos (dia só com entrada e saída mostra o almoço que falta). Lógica em `daySlots` (`packages/domain`) |
| Sheet só para nova batida | Tocar numa batida feita abre "Editar batida" ("Vai ficar como **…**"), com "Excluir batida" (`Trash2`). Excluir pede confirmação: "Excluir a batida das HH:MM?" · "Ela sai do dia e fica só no histórico." · Cancelar / Excluir. Salvar a edição mostra "Batida das HH:MM salva." (o toast temático é só da batida nova). Toast "Batida excluída." |
| Toasts só das 4 batidas | Extras: "Saída extra às HH:MM." e "De volta ao galho! Retorno às HH:MM." |
| Sheet sem estados de erro | Mesmo minuto de outra batida (inclusive uma ainda na fila): "Já tem uma batida às HH:MM." e "Salvar batida" desabilitado. O sheet não espera o servidor: grava na outbox e fecha (D3); falhas de envio ficam na fila e o minuto tomado em outro aparelho vira conflito na Hoje |
| Toast offline só ao salvar batida nova | Sem conexão, salvar, editar e excluir mostram "Salvo no aparelho. Sobe quando o sinal voltar." (`CloudOff`) no lugar do toast normal |
| Pill de sync "quando houver" | Só com itens na fila (conflitos não contam). Offline com a fila vazia, só o banner |
| Conflito de sincronização (não previsto no handoff) | Escrita recusada com `duplicate_minute` vira um alerta na Hoje, abaixo do banner: fundo `negative` tingido, `TriangleAlert`, "A batida das HH:MM não subiu: já tem uma nesse minuto em outro aparelho." (outro dia: "de DD/MM às HH:MM"). Botões "Mudar a hora" (abre "Editar batida" com essa batida; salvar substitui o conflito na fila) e "Descartar". Recusada por outro motivo (`rejected`): "A batida das HH:MM não subiu: o servidor recusou.", só com "Descartar". A batida em conflito não entra no card Batidas |
| Link "Usar foto do comprovante" no sheet | Invertido (#13): "Bater ponto" (CTA e linha pendente) abre a câmera direto. "Registrar manualmente" na câmera (ou câmera negada) abre o sheet manual, que tem o link "Usar foto do comprovante". Leitura sem data/hora válida abre o manual com o aviso `warning` "Não deu para ler o comprovante. Preencha a hora." e a hora atual. "Editar batida" e a tela Dia continuam só manuais |
| "Confira a leitura" com miniatura, confiança, empresa, NSR e CNPJ | Sem miniatura (a foto é descartada ao fim da leitura), sem texto de confiança e sem empresa/NSR/CNPJ (NSR não é confiável, `docs/06`). Ficam os campos "Data lida" e "Hora lida" com borda banana, o "Vai entrar como …", os avisos ao vivo do sheet manual, "Confirmar batida" e "Tirar outra foto" |
| CTA "Dia completo · 4 de 4 batidas", desabilitado, e hora prevista "prev." nas linhas pendentes | Dia fechado (`complete`): CTA "Dia completo · N de N batidas" com o total do card (6 batidas: "6 de 6"), no mesmo visual `muted`, mas clicável, com a linha "registrar nova batida": abre o sheet para batidas além do dia fechado (`docs/02` §2.1), como sair ao médico e voltar. O rótulo fica no "Vai entrar como …" do sheet, porque depende da hora (antes da saída, a batida muda a ordem do dia). Linhas pendentes mostram "prev. HH:MM" quando há previsão (volta e saída, `docs/02` §7) e "—" sem ela |
| Card "Próximo" só com hora prevista ("Volta do almoço às 14:28", "em 7 min · almoço de 1h") | Título é a próxima batida, com "às HH:MM" quando há previsão. Apoio: "em N min" / "em 1h05", "agora" na hora, "há N min" depois dela; mais "almoço de 1h" (saída e volta do almoço) ou "jornada de 8h" (entrada e saída). Em dia sem jornada: "dia sem jornada". Entrada e saída do almoço não têm hora prevista |
| Mascote da Hoje por número de batidas | Pelo resumo do dia: `boasvindas` antes da entrada e em dia sem jornada; `tranquilo` depois da entrada; `almoco` na saída do almoço; `saida` a ≤ 30 min da saída prevista (ou depois dela), senão `tranquilo`; dia fechado `feliz` / `preocupado` / `tranquilo` pelo sinal do saldo; dia incompleto `pendente` |
| Tiles "de 8h48" / "jornada 8h48" | Jornada de `rules.dailyMinutes`; em dia sem jornada, "sem jornada". Saldo do dia: "—" + "fecha na saída" com o dia aberto, "—" + "dia incompleto" (ex.: falta o almoço) e `<Saldo>` com a tolerância de `docs/02` §4 no dia fechado |
| Alertas só do almoço curto | Também "Falta registrar o almoço" (só entrada e saída, > 6h) e "Falta uma batida neste dia" (ímpar em dia passado), no mesmo bloco `warning` |
| Aviso ao vivo do saldo só em `positive`/`negative` | Saldo zerado (dentro da tolerância) usa o fundo `muted` com `CircleCheck`. Os avisos ficam abaixo de "Vai entrar como …" |
| Aviso do saldo só na saída ("Com essa saída, …") | Aparece em toda batida nova que fecha o dia e na edição da última batida. Fora da saída o texto é "Com essa batida, o saldo do dia fica …" (ex.: a volta do médico que fecha o dia antes da saída) |
| Período: seletor com "período atual · fecha em N dias" | "fecha hoje" e "fecha amanhã" nos dois últimos dias. Período passado: "período fechado · pagamento em 1º out" (data de `payday`). Sem período futuro: o próximo fica desabilitado no atual |
| Resumo com "Horas extras" numa soma só | Mini-tile com a soma; abaixo, uma linha com as extras por tipo que não são zero: "Dia útil +0h40 · Sábado +2h00 · Domingo/feriado +1h30" (`docs/02` §6). "Pendências" conta dias `pending` e `incomplete` passados (não conta almoço curto) |
| Lista só com dias úteis | Todos os dias do período, do mais recente. Fim de semana sem batidas: "sem jornada", sem badge |
| Badge "3 de 4 batidas" | "N batidas" para número ímpar ("1 batida" no singular); "Sem almoço" para só entrada e saída com mais de 6h (`docs/02` §3). Um badge por dia, nesta ordem: Hoje · Sem registro · N batidas · Sem almoço · tipo do dia (`negative` "Falta"; `neutral` "Atestado", "Férias", "Folga", "Abono", "Feriado") · Almoço curto. Dia marcado sem batidas mostra "—" no lugar das horas |
| Linha "Hoje" com "em andamento" | Mantido enquanto aberto; fechado, mostra as horas trabalhadas e o saldo |
| Tocar numa linha abre Dia | Hoje vai para a Hoje; dias passados abrem o Dia (`/periodo/AAAA-MM-DD`); dias futuros não são tocáveis e não têm `ChevronRight`. Voltar e "Salvar dia" retornam ao período do dia aberto e tiram o Dia do histórico (`replace`): o voltar do sistema não reabre o Dia |
| Filtro "Pendências (N)" | Mostra só os dias que faltam resolver (`pending` e `incomplete` passados); hoje e os futuros nunca entram |
| Hoje parada no instante em que abriu | Relógio renovado a cada 30 s: "em N min", previsões, rótulo da próxima batida e virada do dia acompanham a hora |
| Dia com 4 linhas fixas ("Entrada" … "Saída") | Uma linha por batida, completadas com linhas vazias até 4 (ou até o próximo par com 5+). Linhas vazias levam os rótulos que faltam num dia completo e ficam fora do cálculo. Rótulos sempre pela ordem cronológica (`labelDraftDay`), recalculados ao vivo; as linhas ficam na ordem da tela |
| Dia sem adicionar ou remover batida | Cada linha tem `Trash2` de 44 px ("Remover {rótulo}"), sem confirmação (nada sai antes de "Salvar dia"). "Adicionar batida" (`Plus`, ghost) abre uma linha vazia no fim do card. Hora apagada equivale a remover |
| Dia sem erro de minuto duplicado | Linhas no mesmo minuto ganham borda `negative` e "Já tem uma batida às HH:MM." (12,5/700 `negative`); "Salvar dia" fica desabilitado |
| Alertas do Dia "N de 4 batidas" / "Falta a saída." | Do resumo do domínio, com título e detalhe: "Almoço de N min" / "O mínimo é 1h para jornada acima de 6h (CLT)."; "Falta registrar o almoço" / "Só entrada e saída, com mais de 6h entre elas."; "N batidas" / "Falta uma batida neste dia." |
| Tiles do Dia "Trabalhadas" e "Saldo do dia" | Saldo com `<Saldo>` (tolerância de `docs/02` §4) só com o dia `complete`; senão "—" |
| "Salvar dia" grava o dia | Só o que o usuário mudou vai para a outbox (a diferença do rascunho para as batidas salvas no momento da primeira edição; o que mudar depois no servidor não vira escrita): exclusões, edições e batidas novas (`manual`), nessa ordem. Entre as edições, a que libera um minuto sobe antes da que entra nele. Sem conexão, o toast é o offline ("Salvo no aparelho. …") no lugar de "Dia N salvo". Até a primeira edição, a tela acompanha as batidas salvas |
| "Salvar dia" sem estado de erro | Se o aparelho não gravar na outbox (IndexedDB), a tela fica no Dia com o rascunho, o botão volta a funcionar e o toast diz "Não deu para salvar o dia. Tente de novo." (`TriangleAlert`). Salvar de novo grava a diferença para as batidas da primeira edição, repetindo as escritas que já tinham entrado na fila (ver `docs/08` #20) |
| Dia sem estado offline | Sem conexão e sem o período no aparelho, no lugar do editor: mascote `offline` (150 px), "Sem sinal na selva" e "Este dia ainda não está no aparelho. Ele abre quando a conexão voltar.", sem botão. O editor aparece sozinho quando o sinal volta. Com o período no aparelho, o Dia abre offline normalmente. Com as batidas já na tela, uma releitura que falha não mostra erro nem tira o rascunho; "Não deu para abrir o dia" só na primeira leitura |
| Observação do Dia | Sem o campo no #9 (ver `docs/08` #15). O app preserva a `note` já salva ao trocar o tipo |
| Nota do dia abonado "conta como 8h48 trabalhadas" | Atestado, férias, folga e abono: "Dia abonado: não conta jornada." (`docs/02` §3: a jornada esperada vai a 0, as batidas continuam contando) |
| Chips do tipo do dia | Ficam entre os alertas e o card Batidas. Não selecionado: `bg-muted`. "Folga" grava `folga_compensada`. Fora de Normal, o card fica com opacidade 0,5 e continua editável. "Salvar dia" grava o tipo pela outbox junto com as batidas, só se mudou; voltar a Normal exclui a marcação (`deleted_at`) |
| Ajustes com todos os grupos (§9) | Na v1: card de perfil, Empresa (só a linha da empresa, sem Convidar; sem Feriados, ver `docs/03` D7), Conta (Sair) e Aparência. Notificações, Cofre, Dados salariais, Privacidade, Exportar e Excluir conta ficam ocultos até as fases deles |
| Card de perfil só exibe | Tocar no card abre o sheet "Seu nome" com "Nome de exibição" e "Salvar". Vazio grava `null` e o avatar volta às iniciais do e-mail. Falha: toast "Não deu para salvar o nome. Tente de novo." e o sheet fica aberto |
| Linha da empresa com toast "Só o admin da empresa edita a jornada" | Abre a tela filha Empresa (`/ajustes/empresa`), com todos os campos de `docs/02` §1 em três cards (Jornada · Período e pagamento · Horas extras). Durações como "8h00", adicionais em %, `scheduleMode` só exibido ("Flexível"), dias como chips seg–dom, booleanos como Switch. Validação pelo `companyRulesSchema`, com uma mensagem pt-BR por campo. Admin: "Salvar regras" grava, toast "Regras da empresa salvas." e volta a Ajustes (`replace`); falha: toast "Não deu para salvar as regras. Tente de novo.". Membro: campos desabilitados, aviso "Só o admin da empresa edita a jornada." e sem botão |
| Resumo da empresa "Jornada 8h48 · seg a sex · almoço 1h" | Dos valores das regras: 3+ dias seguidos viram faixa ("seg a sáb"), senão lista ("seg, qua, sex") (`formatWorkdays`) |
| Aparência sem regra de persistência | Escolha guardada no aparelho (`localStorage`, chave `chimponto:theme`); "Sistema" acompanha `prefers-color-scheme` ao vivo |

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
