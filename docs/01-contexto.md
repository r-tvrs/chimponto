# 01 — Contexto (Chimponto)

## Problema

- O ponto é registrado por biometria em um REP (Registrador Eletrônico de Ponto) que imprime um comprovante em papel térmico por batida.
- O controle de horas fica só com o RH. O trabalhador só descobre se está positivo ou negativo perto do fechamento da folha (dia 19).
- Não há como prever o salário líquido do dia 1º considerando horas extras e atrasos.

## Objetivos

1. Registrar batidas lendo a foto do comprovante (principal), com registro manual como alternativa quando a leitura falha ou não há comprovante.
2. Mostrar saldo do dia e do período de apuração (20 → 19) em tempo real.
3. Estimar o salário líquido do dia 1º com base no saldo e nos descontos.
4. Lembrar o horário de volta do almoço e de saída.
5. Permitir que colegas usem o app por convite, cada um vendo apenas os próprios dados.

## Não-objetivos

- Não é sistema de ponto oficial (Portaria 671/2021) nem substitui o REP.
- Sem acesso do RH ou de qualquer admin a batidas ou salários de outros usuários.
- Sem armazenamento de imagens.
- Sem monetização, cadastro aberto ou painel administrativo complexo.
- Sem app nativo (apenas PWA).
- Sem lembrete de "ir almoçar".

## Usuários

- **Usuário**: registra as próprias batidas, vê saldo, configura cofre e salário.
- **Admin da empresa**: além do acima, edita configurações da empresa (jornada, regras) e gera convites. Não vê dados de outros usuários.

Todo usuário pertence a exatamente uma empresa. Quem se cadastra sem convite cria a própria empresa (e é admin dela).

## Restrições

- **Custo**: R$ 0 (planos gratuitos). Ver `03-arquitetura.md`.
- **Privacidade**: o operador do sistema não consegue ler dados financeiros.
- **Dispositivos**: Android e iPhone (PWA instalado; push no iOS exige instalação na tela inicial, iOS 16.4+).
- **Desenvolvimento**: feito com assistência de IA; docs são a fonte da verdade.

## Roadmap

| Fase | Entrega |
|---|---|
| v1 | Auth, empresa, batidas manuais, saldo dia/período, PWA offline |
| v1.1 | OCR do comprovante |
| v1.2 | Cofre + estimativa de salário |
| v1.3 | Notificações push |
| v1.4 | Convites para colegas |
| v1.5 | Exportar dados / excluir conta (LGPD) |
