# 06 — OCR do comprovante

Fluxo principal para registrar a batida. Nunca obrigatório: falha na leitura, câmera negada ou sem comprovante caem no registro manual.

## Formato do comprovante (REP, Portaria 671)

Um comprovante por batida, papel térmico, fonte matricial. Exemplo (dados fictícios):

```
COMPROVANTE DE REGISTRO
DE PONTO DO TRABALHADOR
EMPRESA EXEMPLO LTDA
RUA EXEMPLO, 100 - CTBA/PR
CNPJ:00000000000100  NSR:000012345
CEI:000000000000
NF:0000000000000000
PONTOALL C3 - BIO-G-W
PIS:000000000000 30/05/2025 09:03
NOME DO TRABALHADOR
<hash hexadecimal em 4 linhas>
```

O dado necessário está na linha `PIS:... dd/mm/aaaa hh:mm`.

## Resultado do teste (foto real, sem pré-processamento)

- Tesseract.js 5, idioma `por`, Node: ~1,5 s.
- Data e hora: **corretas**.
- NSR: **incorreto** (`9` lido como `3`). → **Não usar NSR** para nada.
- CNPJ, CEI e hash: ruidosos. Ignorar.

## Fluxo

1. Usuário toca "Bater ponto": a câmera abre direto. O sheet oferece "Registrar manualmente" como alternativa.
2. Captura dentro do app (#15): sheet com `getUserMedia({ video: { facingMode: "environment" } })` num `<video>` e botão "Capturar", que tira o frame num canvas. As tracks desligam ao fechar, ao capturar e em segundo plano (`visibilitychange`), e religam ao voltar. Câmera negada ou indisponível abre o manual com o aviso "Não deu para abrir a câmera. Preencha a hora.". O `<input capture>` foi descartado: no iOS instalado abre a câmera do sistema com a tela preta.
3. Pré-processamento em canvas: redimensionar (lado maior ~1600 px), escala de cinza, aumento de contraste.
4. Tesseract.js (`por`), worker e dados de idioma carregados sob demanda e cacheados pelo Service Worker.
5. Extração:
   ```ts
   /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2})\s*[:;.,]?\s*(\d{2})/
   ```
   Priorizar a linha que contém `PIS`; fallback para o texto inteiro.
6. Validação: data real, não futura, no máximo 60 dias no passado; hora 00–23; minuto 00–59.
7. Tela de confirmação com data/hora preenchidas e editáveis (`source = 'ocr'`). Falha na leitura → mesma tela vazia com mensagem, preenchimento manual.
8. Imagem e canvas descartados (revogar object URLs). Nada é enviado ao servidor.

## Testes

Fixtures sintéticas geradas (texto renderizado em fonte matricial + ruído/rotação) em `apps/web/src/features/ocr/__fixtures__/`. Testar parser separadamente do OCR com strings ruidosas reais (ex.: `PIS:021283582676 30/05/2025 09:03`, `30/05/2025 09.03`, `30/05/2025 0903`).

## Evolução (fora da v1)

Se a precisão for insuficiente: recorte guiado da linha da data, whitelist de caracteres (`0-9/: `), ou OCR em nuvem atrás de interface `OcrProvider`.
