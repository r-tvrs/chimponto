import { expect } from "@playwright/test";

// SMTP local do Supabase (Mailpit). Em CI vem de `supabase status`.
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitSearch = { messages: { ID: string }[] };
type MailpitMessage = { HTML: string };

/**
 * Espera o e-mail do link mágico chegar para `email` e devolve o HTML.
 * Apaga o e-mail lido: o próximo pedido para o mesmo endereço espera o e-mail novo.
 */
async function loginMailFor(email: string): Promise<string> {
  let id: string | undefined;
  await expect
    .poll(
      async () => {
        const query = encodeURIComponent(`to:"${email}"`);
        const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
        id = ((await res.json()) as MailpitSearch).messages[0]?.ID;
        return id;
      },
      { message: `e-mail do link mágico para ${email}` },
    )
    .toBeTruthy();

  const message = (await (
    await fetch(`${MAILPIT_URL}/api/v1/message/${id}`)
  ).json()) as MailpitMessage;
  await fetch(`${MAILPIT_URL}/api/v1/messages`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ IDs: [id] }),
  });
  return message.HTML;
}

/** URL de verificação do link mágico que chegou para `email`. */
export async function magicLinkFor(email: string): Promise<string> {
  const html = await loginMailFor(email);
  const href = /href="([^"]*\/auth\/v1\/verify[^"]*)"/.exec(html)?.[1];
  if (!href) throw new Error(`Link mágico não encontrado no e-mail para ${email}`);
  return href.replaceAll("&amp;", "&");
}

/** Código de 6 dígitos que chegou para `email`, no mesmo e-mail do link. */
export async function loginCodeFor(email: string): Promise<string> {
  const code = /<strong>(\d{6})<\/strong>/.exec(await loginMailFor(email))?.[1];
  if (!code) throw new Error(`Código não encontrado no e-mail para ${email}`);
  return code;
}
