# 06 — OCR do comprovante

Atalho opcional para preencher a batida. Nunca obrigatório.

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

1. Usuário toca "Usar foto do comprovante" na tela de registro.
2. Captura via `<input type="file" accept="image/*" capture="environment">`.
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
