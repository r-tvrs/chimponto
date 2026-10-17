Preciso de ajuda para criar a identidade visual e o design das telas de um PWA mobile-first de controle de ponto pessoal. A temática central é **macaquinhos fofos**: chimpanzés trabalhadores, bananas, selva/escritório.

## O produto

App para o trabalhador CLT controlar o próprio ponto. Na empresa, o ponto é batido por biometria num relógio que imprime um comprovante em papel, e só o RH sabe o saldo de horas. O app permite:

- registrar as batidas do dia (entrada, saída almoço, volta almoço, saída) — manualmente (fluxo principal, já vem com a hora atual) ou lendo a foto do comprovante (atalho opcional, OCR);
- ver o saldo de horas do dia e do período de apuração (dia 20 a dia 19), positivo ou negativo;
- estimar o salário líquido que cai no dia 1º, considerando horas extras, atrasos e descontos (INSS, IRRF, plano de saúde, adiantamento);
- receber lembrete 10 min antes da volta do almoço e da saída;
- convidar colegas da mesma empresa (cada um vê só os próprios dados).

Os dados de salário ficam num **"cofre"** criptografado com uma senha separada do login — nem o dono do sistema consegue ver. Isso precisa transmitir confiança.

Usuários: trabalhadores de escritório (desenvolvedores, analistas), 20–40 anos, usam no celular, com uma mão, em momentos rápidos (chegando, saindo pro almoço).

## Temática e tom

- Mascote: um **chimpanzé trabalhador fofo** (crachá, caneca de café, mochila, talvez gravata frouxa). Proponha 2–3 direções de personagem antes de fechar.
- Elementos: bananas (como "moeda"/recompensa, ícone de almoço), cipós, folhas, cachos de banana como indicador de progresso.
- Tom: **fofo e divertido, mas confiável** — o app mexe com dinheiro e horas de trabalho. Nada infantil demais; pense em Duolingo/Headspace, não em app para crianças.
- Microcopy em pt-BR, leve e com humor sutil ("Hora de voltar pro galho! Bata o ponto às 14:28 🍌"), mas sempre claro nos números.

## Estados do mascote (ilustrações)

Proponha o mascote nestes momentos:

| Momento | Ideia |
|---|---|
| Saldo positivo | comemorando, segurando cacho de bananas |
| Saldo negativo | preocupado / correndo atrasado |
| Saldo zerado | tranquilo, joinha |
| Lembrete de volta do almoço | terminando de comer banana |
| Lembrete de saída | pegando a mochila |
| Cofre bloqueado | guardando um baú de bananas com cadeado |
| Cofre aberto / salário | contando bananas |
| Dia pendente ou incompleto | coçando a cabeça, procurando algo |
| Offline | pendurado no cipó, "sem sinal na selva" |
| Lista vazia / primeiro acesso | acenando, boas-vindas |
| Lendo comprovante (OCR) | com lupa |
| Erro | tropeçando em casca de banana |

## O que eu preciso que você entregue

1. **Nome do app**: 5–8 sugestões na temática (o app ainda não tem nome).
2. **Logo e ícone do app** (PWA: 192 px, 512 px e versão *maskable*), legível em tamanho pequeno.
3. **Paleta** mapeada para estes tokens semânticos, em **tema claro e escuro**:
   `primary`, `positive` (saldo +), `negative` (saldo −), `warning` (dia incompleto, almoço curto), `pending` (dia sem registro), `muted`, `background`, `foreground`, `card`, `border`.
   Cuidado: amarelo-banana sobre branco costuma falhar em contraste — todo texto precisa passar WCAG AA.
4. **Tipografia**: fonte para títulos (pode ter personalidade) e para texto/números (números com `tabular-nums` são essenciais). Fontes gratuitas (Google Fonts).
5. **Estilo de ilustração e iconografia**: compatível com lucide-react nos ícones de interface; ilustrações em SVG leve.
6. **Telas** (mobile, 360 px de largura, claro e escuro):
   - **Hoje**: linha do tempo das 4 batidas com rótulos, horas trabalhadas, saldo do dia, "próximo: volta do almoço às 14:28", saldo do período, botão grande "Bater ponto".
   - **Bater ponto** (bottom sheet): data e hora pré-preenchidas e editáveis, observação, salvar; link secundário "Usar foto do comprovante".
   - **Confirmação do OCR**: data/hora lidas, editáveis, confirmar.
   - **Período**: seletor 20→19, resumo (saldo, horas extras, débito), lista de dias com status.
   - **Dia**: batidas editáveis, marcar tipo de dia (falta, atestado, férias, folga, abono), alertas.
   - **Salário bloqueado** (desbloquear cofre) e **aberto**: líquido estimado em destaque, data de pagamento, detalhamento estilo holerite (proventos/descontos), aviso "Estimativa — o oficial é o holerite".
   - **Criar cofre**: senha + exibição do código de recuperação (precisa deixar claro que é importante guardar).
   - **Ajustes**: notificações, cofre, dados salariais, empresa (jornada, feriados, convites), privacidade, exportar/excluir conta.
   - **Onboarding**: login (link mágico / Google), criar empresa ou aceitar convite, instruções para instalar o app no iPhone, ativar notificações.
   - Navegação: barra inferior com 4 abas (Hoje, Período, Salário, Ajustes).
7. **Notificações push**: texto e ícone dos lembretes.

## Restrições técnicas

- Implementação em **React + Tailwind + shadcn/ui (Radix)**. Entregue os tokens como **variáveis CSS no formato do shadcn/ui** (`:root` e `.dark`), e componentes como variações dos componentes shadcn (Button, Card, Sheet, Badge, Tabs, Input, Dialog...).
- Saldo **sempre com sinal e cor**: `+1h20` / `−0h35` — nunca depender só da cor (daltonismo).
- Alvos de toque ≥ 44 px; ação principal na metade inferior da tela.
- Valores do cofre ocultos quando bloqueado (`R$ •••••`).
- Indicador discreto de offline e de itens aguardando sincronização.
- Use dados fictícios (empresa, nomes, valores) nos mockups.

Comece propondo as direções de mascote, nome e paleta; depois de eu escolher, seguimos para as telas.
