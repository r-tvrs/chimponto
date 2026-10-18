import {
  type CompanyRules,
  companyRulesSchema,
  formatDuration,
  parseDuration,
} from "@chimponto/domain";
import { Building2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useCreateCompany } from "@/company/company";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_RULES = companyRulesSchema.parse({});

/** Regras padrão com a jornada digitada, ou null se o schema de regras não a aceitar. */
function rulesWithDailyHours(dailyHours: string): CompanyRules | null {
  const dailyMinutes = parseDuration(dailyHours);
  if (dailyMinutes === null) return null;
  const parsed = companyRulesSchema.safeParse({ dailyMinutes });
  return parsed.success ? parsed.data : null;
}

/** Onboarding, passo 1 de 3. Convites ficam para a v1.4: só o cartão "Criar empresa". */
export function CompanyScreen() {
  const createCompany = useCreateCompany();
  const [name, setName] = useState("");
  const [dailyHours, setDailyHours] = useState(formatDuration(DEFAULT_RULES.dailyMinutes));
  const [invalid, setInvalid] = useState({ name: false, dailyHours: false });
  const [creating, setCreating] = useState(false);
  const [failed, setFailed] = useState(false);

  function submit() {
    const companyName = name.trim();
    const rules = rulesWithDailyHours(dailyHours);
    setInvalid({ name: companyName === "", dailyHours: rules === null });
    if (companyName === "" || rules === null) return;
    void create(companyName, rules);
  }

  // Criada a empresa (ou já existente), a guarda de rotas leva à Hoje.
  async function create(companyName: string, rules: CompanyRules) {
    setFailed(false);
    setCreating(true);
    if ((await createCompany(companyName, rules)) === "failed") {
      setCreating(false);
      setFailed(true);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  if (failed) {
    return (
      <ErrorState
        title="Não deu para criar a empresa"
        message="Confira a conexão e tente de novo."
        onRetry={submit}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col gap-3.5 px-5 pt-3 pb-5">
      <div
        role="progressbar"
        aria-label="Configuração"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={1}
        aria-valuetext="Passo 1 de 3"
        className="flex gap-1.5"
      >
        <span className="h-[5px] flex-1 rounded-[3px] bg-foreground" />
        <span className="h-[5px] flex-1 rounded-[3px] bg-border" />
        <span className="h-[5px] flex-1 rounded-[3px] bg-border" />
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <h1 className="text-[26px] leading-[1.1]">Onde você trabalha?</h1>
        <p className="text-sm leading-normal font-medium text-pretty text-muted-foreground">
          Colegas da mesma empresa dividem jornada e feriados. Cada um vê só os próprios dados.
        </p>
      </div>

      <form noValidate onSubmit={onSubmit} className="flex flex-1 flex-col gap-3.5">
        <section
          aria-labelledby="create-company-title"
          className="flex flex-col gap-3 rounded-[18px] border-2 border-foreground bg-card p-4"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
              <Building2 className="size-5" aria-hidden />
            </span>
            <div className="flex flex-col gap-0.5">
              <h2 id="create-company-title" className="font-sans text-[15px] font-bold">
                Criar empresa
              </h2>
              <span className="text-[12.5px] font-medium text-muted-foreground">
                Você define jornada e feriados
              </span>
            </div>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
            <Input
              aria-label="Nome da empresa"
              placeholder="Nome da empresa"
              autoComplete="organization"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={invalid.name}
              aria-describedby={invalid.name ? "company-name-error" : undefined}
              className="h-12 rounded-xl bg-background px-3.5 text-[15px]"
            />
            <Input
              aria-label="Jornada diária"
              value={dailyHours}
              onChange={(e) => setDailyHours(e.target.value)}
              aria-invalid={invalid.dailyHours}
              aria-describedby={invalid.dailyHours ? "daily-hours-error" : undefined}
              className="h-12 rounded-xl bg-background px-2 text-center text-[15px] font-extrabold"
            />
          </div>
          {(invalid.name || invalid.dailyHours) && (
            <div className="flex flex-col gap-1 text-[12.5px] font-bold text-negative">
              {invalid.name && <p id="company-name-error">Digite o nome da empresa.</p>}
              {invalid.dailyHours && <p id="daily-hours-error">Digite a jornada como 8h00.</p>}
            </div>
          )}
        </section>

        <Button type="submit" size="lg" className="mt-auto w-full" disabled={creating}>
          {creating ? "Criando…" : "Continuar"}
        </Button>
      </form>
    </main>
  );
}
