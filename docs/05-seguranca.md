# 05 — Segurança e privacidade

## Classificação dos dados

| Dado | Proteção |
|---|---|
| Batidas, marcações de dia, empresa, feriados | Texto puro no banco; isolado por RLS |
| Salário, descontos, dependentes, líquido real | **Cifrado no navegador** (E2E). Servidor guarda apenas ciphertext |
| Resultado do cálculo de salário | Nunca persistido nem enviado; calculado em memória |
| Imagens do comprovante | Nunca enviadas nem persistidas |

## Cofre (criptografia E2E)

Envelope encryption com WebCrypto:

1. **DEK** (Data Encryption Key): AES-GCM 256 aleatória, gerada no navegador ao criar o cofre.
2. **Senha do cofre** → `PBKDF2-SHA256`, 600.000 iterações, salt aleatório de 16 bytes → **KEK**. DEK é cifrada (*wrapped*) com a KEK → `wrapped_dek_password`.
3. **Código de recuperação**: 128 bits aleatórios, exibido uma única vez (formato legível em grupos). Deriva outra KEK → `wrapped_dek_recovery`.
4. `verifier`: string fixa cifrada com a DEK para validar a senha sem expor dados.
5. Cada registro cifrado usa IV aleatório de 12 bytes. Payload = JSON validado por Zod antes de cifrar e depois de decifrar.

Regras:
- Senha do cofre é **independente** do login e nunca sai do navegador.
- Trocar senha = re-wrap da DEK (não re-cifra os dados).
- Esquecer senha e código → "Redefinir cofre": apaga `vaults`, `salary_profiles`, `payslip_actuals`. Batidas não são afetadas.
- O cofre é aberto **uma vez por aparelho** e fica lembrado: DEK importada como `CryptoKey` **não exportável** e guardada no IndexedDB. Sem trancamento automático por tempo.
- A senha do cofre é pedida só na aba Salário (e telas de dados salariais). Batidas, saldo e período nunca pedem.
- Bloquear cofre / sair da conta remove a chave do IndexedDB e da memória.

Limitação declarada (exibir na página "Privacidade"): E2E em web depende de confiar no JavaScript servido. Mitigação: código aberto e auditável.

## Autorização

- RLS em todas as tabelas; nenhuma tabela sem política.
- A `anon key` é pública por design. A `service_role` key **nunca** vai para o frontend nem para o repositório; só em secrets de Edge Functions / GitHub Actions.
- Testes automatizados de isolamento entre usuários (ver `04-modelo-de-dados.md`).

## Repositório público

- `.gitignore` cobre `.env*`, `private/`, `*.local.*`, dumps de banco.
- **gitleaks** em pre-commit e no CI; push protection / secret scanning do GitHub habilitados.
- Fixtures de OCR e testes: apenas comprovantes **sintéticos** (nome, PIS, CNPJ fictícios). Imagens reais ficam em `private/` (ignorado).
- Nenhum dado real de empresa em seeds; configuração de empresa é feita pela UI.

## Backups

Dumps diários (GitHub Action) contêm batidas em claro e salário cifrado. Armazenados em bucket R2 privado; credenciais em GitHub Secrets.

## LGPD

- Exportar dados do usuário (JSON; dados do cofre exportados decifrados localmente, se o cofre estiver aberto).
- Excluir conta remove todos os dados do usuário (RPC `delete_account`).
- Página de privacidade descrevendo o que é coletado e o modelo de criptografia.
