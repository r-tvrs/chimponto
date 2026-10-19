import {
  type CompanyRules,
  companyRulesSchema,
  formatDuration,
  parseDuration,
  WEEKDAYS,
  type Weekday,
} from "@chimponto/domain";
import { ChevronLeft, TriangleAlert } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router";
import { type Membership, useMembership, useUpdateCompanyRules } from "@/company/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/use-toast";

const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "seg",
  tue: "ter",
  wed: "qua",
  thu: "qui",
  fri: "sex",
  sat: "sáb",
  sun: "dom",
};

type TextField =
  | "dailyMinutes"
  | "expectedLunchMinutes"
  | "dailyToleranceMinutes"
  | "closingDay"
  | "payday"
  | "hourDivisor"
  | "overtimeRateWeekday"
  | "overtimeRateSaturday"
  | "overtimeRateSundayHoliday";
type SwitchField = "compensateWithinPeriod" | "dsrOnOvertime" | "absenceDeductsDsr";

type Form = Record<TextField, string> & Record<SwitchField, boolean> & { workdays: Weekday[] };

const DURATION_FIELDS = ["dailyMinutes", "expectedLunchMinutes"] as const;
const RATE_FIELDS = [
  "overtimeRateWeekday",
  "overtimeRateSaturday",
  "overtimeRateSundayHoliday",
] as const;

// Mensagens por campo: quem valida é o schema do domínio; aqui só se diz o que digitar.
const ERRORS: Partial<Record<keyof CompanyRules, string>> = {
  dailyMinutes: "Digite a jornada como 8h00, até 24h00.",
  workdays: "Escolha pelo menos um dia.",
  expectedLunchMinutes: "Digite o almoço como 1h00, até 24h00.",
  dailyToleranceMinutes: "Digite os minutos, de 0 a 1440.",
  closingDay: "Escolha um dia de 1 a 28.",
  payday: "Escolha um dia de 1 a 28.",
  hourDivisor: "Digite um número inteiro maior que zero.",
  overtimeRateWeekday: "Digite um percentual, 0 ou mais.",
  overtimeRateSaturday: "Digite um percentual, 0 ou mais.",
  overtimeRateSundayHoliday: "Digite um percentual, 0 ou mais.",
};

function toForm(rules: CompanyRules): Form {
  // Percentual com até 2 casas, sem o ruído de ponto flutuante (0.07 * 100).
  const percent = (rate: number) => String(Math.round(rate * 10_000) / 100);
  return {
    dailyMinutes: formatDuration(rules.dailyMinutes),
    workdays: rules.workdays,
    expectedLunchMinutes: formatDuration(rules.expectedLunchMinutes),
    dailyToleranceMinutes: String(rules.dailyToleranceMinutes),
    closingDay: String(rules.closingDay),
    payday: String(rules.payday),
    hourDivisor: String(rules.hourDivisor),
    overtimeRateWeekday: percent(rules.overtimeRateWeekday),
    overtimeRateSaturday: percent(rules.overtimeRateSaturday),
    overtimeRateSundayHoliday: percent(rules.overtimeRateSundayHoliday),
    compensateWithinPeriod: rules.compensateWithinPeriod,
    dsrOnOvertime: rules.dsrOnOvertime,
    absenceDeductsDsr: rules.absenceDeductsDsr,
  };
}

/** Converte o texto digitado e passa pelo schema. Texto ilegível vira NaN, que o schema recusa. */
function parseForm(form: Form, scheduleMode: CompanyRules["scheduleMode"]) {
  const number = (text: string) => (text.trim() === "" ? NaN : Number(text.replace(",", ".")));
  const raw: Record<string, unknown> = { ...form, scheduleMode };
  for (const field of ["dailyToleranceMinutes", "closingDay", "payday", "hourDivisor"] as const) {
    raw[field] = number(form[field]);
  }
  for (const field of DURATION_FIELDS) raw[field] = parseDuration(form[field]) ?? NaN;
  for (const field of RATE_FIELDS) raw[field] = number(form[field]) / 100;
  return companyRulesSchema.safeParse(raw);
}

/** Regras de jornada da empresa (docs/02 §1). Só o admin salva; o membro vê sem editar. */
export function CompanyRulesScreen() {
  const membership = useMembership().data;
  // Dentro de RequireCompany, o vínculo já está carregado.
  return membership ? <RulesForm membership={membership} /> : null;
}

function RulesForm({ membership }: { membership: Membership }) {
  const updateRules = useUpdateCompanyRules();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => toForm(membership.rules));
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const readOnly = membership.role !== "admin";

  const set = <K extends keyof Form>(field: K, value: Form[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseForm(form, membership.rules.scheduleMode);
    setErrors(new Set(parsed.success ? [] : parsed.error.issues.map((i) => String(i.path[0]))));
    if (!parsed.success) return;
    setSaving(true);
    if ((await updateRules(membership.companyId, parsed.data)) === "saved") {
      toast("Regras da empresa salvas.");
      void navigate("/ajustes", { replace: true });
    } else {
      setSaving(false);
      toast("Não deu para salvar as regras. Tente de novo.", TriangleAlert);
    }
  }

  const text = (field: TextField, label: string, inputMode: "text" | "numeric" | "decimal") => (
    <Field label={label} error={errors.has(field) ? ERRORS[field] : undefined} id={field}>
      <Input
        id={field}
        inputMode={inputMode}
        value={form[field]}
        onChange={(e) => set(field, e.target.value)}
        aria-invalid={errors.has(field)}
        aria-describedby={errors.has(field) ? `${field}-error` : undefined}
        className="h-12 rounded-xl bg-background px-3.5 text-[15px] tabular-nums"
      />
    </Field>
  );

  const toggle = (field: SwitchField, label: string) => (
    <label className="flex min-h-[52px] items-center gap-3 text-[14.5px] font-semibold">
      <span className="flex-1">{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={form[field]}
        onChange={(e) => set(field, e.target.checked)}
        className="relative h-7 w-[46px] shrink-0 cursor-pointer appearance-none rounded-full border border-input bg-muted transition-colors duration-200 outline-none before:absolute before:top-[2px] before:left-[2px] before:size-[22px] before:rounded-full before:bg-card before:shadow-sm before:transition-transform before:duration-200 checked:border-foreground checked:bg-foreground checked:before:translate-x-[18px] focus-visible:ring-[3px] focus-visible:ring-ring/30"
      />
    </label>
  );

  return (
    <>
      <header className="flex min-h-[52px] items-center gap-1.5">
        <Link
          to="/ajustes"
          replace
          aria-label="Voltar"
          className="flex size-11 items-center justify-center rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 [&_svg]:size-6"
        >
          <ChevronLeft />
        </Link>
        <div className="flex min-w-0 flex-col gap-[3px]">
          <span className="truncate text-xs leading-none font-semibold text-muted-foreground">
            {membership.companyName}
          </span>
          <h1 className="text-2xl leading-none">Empresa</h1>
        </div>
      </header>

      {readOnly && (
        <p className="rounded-[18px] bg-muted p-3.5 text-[13px] font-semibold text-muted-foreground">
          Só o admin da empresa edita a jornada.
        </p>
      )}

      <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3">
        <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-3 disabled:opacity-70">
          <Card title="Jornada">
            <div className="grid grid-cols-2 gap-2.5">
              {text("dailyMinutes", "Jornada diária", "text")}
              {text("expectedLunchMinutes", "Almoço esperado", "text")}
            </div>
            <fieldset
              aria-describedby={errors.has("workdays") ? "workdays-error" : undefined}
              className="flex flex-col gap-1.5"
            >
              <legend className="mb-1.5 text-[12.5px] font-bold text-muted-foreground">
                Dias de jornada
              </legend>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                  <label
                    key={day}
                    className="relative flex h-11 cursor-pointer items-center justify-center rounded-xl bg-muted text-[13px] font-bold text-muted-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:ring-[3px] has-focus-visible:ring-ring/30"
                  >
                    <input
                      type="checkbox"
                      className="absolute inset-0 cursor-pointer appearance-none rounded-[inherit] outline-none"
                      checked={form.workdays.includes(day)}
                      onChange={(e) =>
                        set(
                          "workdays",
                          WEEKDAYS.filter((d) =>
                            d === day ? e.target.checked : form.workdays.includes(d),
                          ),
                        )
                      }
                    />
                    {WEEKDAY_LABELS[day]}
                  </label>
                ))}
              </div>
              {errors.has("workdays") && (
                <ErrorText id="workdays-error">{ERRORS.workdays}</ErrorText>
              )}
            </fieldset>
            <div className="flex items-center justify-between text-[14.5px] font-semibold">
              <span>Horário</span>
              <span className="text-muted-foreground">Flexível</span>
            </div>
            {text("dailyToleranceMinutes", "Tolerância diária (min)", "numeric")}
          </Card>

          <Card title="Período e pagamento">
            <div className="grid grid-cols-2 gap-2.5">
              {text("closingDay", "Dia de fechamento", "numeric")}
              {text("payday", "Dia do pagamento", "numeric")}
            </div>
            {text("hourDivisor", "Divisor de horas", "numeric")}
          </Card>

          <Card title="Horas extras">
            {text("overtimeRateWeekday", "Extra em dia útil (%)", "decimal")}
            {text("overtimeRateSaturday", "Extra no sábado (%)", "decimal")}
            {text("overtimeRateSundayHoliday", "Extra em domingo e feriado (%)", "decimal")}
            {toggle("compensateWithinPeriod", "Compensar dentro do período")}
            {toggle("dsrOnOvertime", "DSR sobre horas extras")}
            {toggle("absenceDeductsDsr", "Falta desconta o DSR")}
          </Card>
        </fieldset>

        {!readOnly && (
          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving ? "Salvando…" : "Salvar regras"}
          </Button>
        )}
      </form>
    </>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="mx-1 mt-2 font-sans text-[11px] leading-none font-bold tracking-[0.08em] text-muted-foreground uppercase">
        {title}
      </h2>
      <div className="flex flex-col gap-3 rounded-[20px] border bg-card p-4">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[12.5px] font-bold text-muted-foreground">
        {label}
      </label>
      {children}
      {error && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
    </div>
  );
}

function ErrorText({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-[12.5px] font-bold text-negative">
      {children}
    </p>
  );
}
