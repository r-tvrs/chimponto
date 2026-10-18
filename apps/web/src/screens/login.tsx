import { Mail } from "lucide-react";
import { type FormEvent, useState } from "react";
import { type MagicLinkResult, useAuth } from "@/auth/auth";
import { ErrorState } from "@/components/error-state";
import { Mascote } from "@/components/mascote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FAILURES = {
  failed: { title: "Não deu para enviar o link", message: "Confira a conexão e tente de novo." },
  rate_limited: { title: "Muitos pedidos seguidos", message: "Espere um minuto e tente de novo." },
};

export function LoginScreen() {
  const { state, requestMagicLink } = useAuth();
  const [linkErrorSeen, setLinkErrorSeen] = useState(false);
  const [email, setEmail] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Exclude<MagicLinkResult, "sent"> | null>(null);

  async function send(address: string) {
    setFailure(null);
    setSending(true);
    const result = await requestMagicLink(address);
    setSending(false);
    if (result === "sent") setSentTo(address);
    else setFailure(result);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void send(address);
  }

  if (state.status === "signed_out" && state.linkError && !linkErrorSeen) {
    return (
      <ErrorState
        title="Esse link não vale mais"
        message="O link mágico expirou ou já foi usado. Peça um novo."
        onRetry={() => setLinkErrorSeen(true)}
      />
    );
  }

  if (failure) {
    return <ErrorState {...FAILURES[failure]} onRetry={() => void send(email.trim())} />;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col p-5">
      <div className="flex flex-col items-center gap-3 pt-7 text-center">
        <Mascote humor="boasvindas" size={168} />
        <h1 className="mt-2 text-[38px] leading-none tracking-[-0.01em]">Chimponto</h1>
        <p className="max-w-[260px] text-[15px] leading-[1.45] font-medium text-balance text-muted-foreground">
          Seu ponto e seu saldo de horas, sem esperar o RH.
        </p>
      </div>
      <form noValidate onSubmit={onSubmit} className="mt-auto flex flex-col gap-2.5 pt-8">
        <Input
          type="email"
          aria-label="E-mail"
          placeholder="seu@email.com"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={invalid}
          aria-describedby={invalid ? "email-error" : undefined}
        />
        {invalid && (
          <p id="email-error" className="text-[12.5px] font-bold text-negative">
            Digite um e-mail válido.
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={sending}>
          <Mail />
          {sending ? "Enviando…" : "Receber link mágico"}
        </Button>
        {sentTo ? (
          <p role="status" className="text-center text-xs leading-[1.4] font-semibold">
            Link mágico enviado para {sentTo}. Abra o e-mail neste aparelho.
          </p>
        ) : (
          <p className="text-center text-xs leading-[1.4] font-medium text-muted-foreground">
            Sem senha: mandamos um link que entra direto.
          </p>
        )}
      </form>
    </main>
  );
}
