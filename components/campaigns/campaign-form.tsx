"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "./platform-icon";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import type { CampaignPlatform, CampaignObjective } from "@/types/database";

// ── schema ─────────────────────────────────────────────────────────────────

const campaignSchema = z.object({
  // Step 1 — Config
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  platform: z.enum(["meta", "google", "tiktok", "linkedin", "programmatic"] as const),
  objective: z.enum(["awareness", "traffic", "engagement", "leads", "sales", "app_promotion"] as const),

  // Step 2 — Targeting
  age_min: z.coerce.number().min(18).max(65).optional(),
  age_max: z.coerce.number().min(18).max(65).optional(),
  locations: z.string().optional(),
  interests: z.string().optional(),

  // Step 3 — Budget
  daily_budget: z.coerce.number().min(1, "Orçamento deve ser pelo menos R$1"),
  lifetime_budget: z.coerce.number().optional().nullable(),
  start_date: z.string().min(1, "Data de início obrigatória"),
  end_date: z.string().optional().nullable(),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

// ── constants ──────────────────────────────────────────────────────────────

const PLATFORMS: { value: CampaignPlatform; label: string; description: string }[] = [
  { value: "meta", label: "Meta Ads", description: "Facebook, Instagram, Audience Network e Messenger" },
  { value: "google", label: "Google Ads", description: "Search, Display, YouTube e Performance Max" },
  { value: "tiktok", label: "TikTok Ads", description: "In-Feed, TopView, Spark Ads e Brand Takeover" },
  { value: "linkedin", label: "LinkedIn Ads", description: "Sponsored Content, Message Ads e Lead Gen Forms" },
  { value: "programmatic", label: "Programático", description: "OpenRTB 2.6 — DSP próprio com DMP" },
];

const OBJECTIVES: { value: CampaignObjective; label: string; group: string }[] = [
  { value: "awareness", label: "Reconhecimento de marca", group: "Topo de funil" },
  { value: "traffic", label: "Tráfego para site", group: "Topo de funil" },
  { value: "engagement", label: "Engajamento", group: "Meio de funil" },
  { value: "leads", label: "Geração de leads", group: "Meio de funil" },
  { value: "sales", label: "Vendas / Conversões", group: "Fundo de funil" },
  { value: "app_promotion", label: "Instalações de app", group: "Fundo de funil" },
];

const STEPS = [
  { id: 1, label: "Configuração" },
  { id: 2, label: "Público" },
  { id: 3, label: "Orçamento" },
  { id: 4, label: "Revisão" },
];

// ── components ─────────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-all",
                current > step.id
                  ? "bg-[color:var(--adflow-success)] border-[color:var(--adflow-success)] text-white"
                  : current === step.id
                  ? "bg-[color:var(--adflow-accent)] border-[color:var(--adflow-accent)] text-white"
                  : "bg-transparent border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)]"
              )}
            >
              {current > step.id ? <CheckCircle className="w-4 h-4" /> : step.id}
            </div>
            <span
              className={cn(
                "text-sm hidden sm:inline",
                current === step.id
                  ? "text-[color:var(--adflow-fg)] font-medium"
                  : "text-[color:var(--adflow-fg-muted)]"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "flex-1 h-px mx-2",
                current > step.id
                  ? "bg-[color:var(--adflow-success)]"
                  : "bg-[color:var(--adflow-border)]"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-[color:var(--adflow-danger)] mt-1">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {message}
    </p>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-[color:var(--adflow-fg)] mb-1.5">
      {children}
      {required && <span className="text-[color:var(--adflow-accent)] ml-0.5">*</span>}
    </label>
  );
}

function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full px-3 py-2 text-sm bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-md text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--adflow-accent)] transition",
        className
      )}
    />
  );
}

// ── step content ───────────────────────────────────────────────────────────

function Step1Config({ form }: { form: ReturnType<typeof useForm<CampaignFormValues>> }) {
  const { register, watch, setValue, formState: { errors } } = form;
  const selectedPlatform = watch("platform");
  const selectedObjective = watch("objective");

  return (
    <div className="space-y-6">
      <div>
        <Label required>Nome da campanha</Label>
        <Input
          {...register("name")}
          placeholder="Ex.: Black Friday 2025 — Meta Sales"
          autoFocus
        />
        <FieldError message={errors.name?.message} />
      </div>

      <div>
        <Label required>Plataforma</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setValue("platform", p.value, { shouldValidate: true })}
              className={cn(
                "flex flex-col gap-2 p-4 rounded-lg border text-left transition-all",
                selectedPlatform === p.value
                  ? "border-[color:var(--adflow-accent)] bg-[color:var(--adflow-accent)]/5"
                  : "border-[color:var(--adflow-border)] hover:border-[color:var(--adflow-fg-muted)]"
              )}
            >
              <PlatformIcon platform={p.value} size={28} />
              <div>
                <p className="text-sm font-medium text-[color:var(--adflow-fg)]">{p.label}</p>
                <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-0.5">{p.description}</p>
              </div>
            </button>
          ))}
        </div>
        <FieldError message={errors.platform?.message} />
      </div>

      <div>
        <Label required>Objetivo</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          {OBJECTIVES.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setValue("objective", o.value, { shouldValidate: true })}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                selectedObjective === o.value
                  ? "border-[color:var(--adflow-accent)] bg-[color:var(--adflow-accent)]/5"
                  : "border-[color:var(--adflow-border)] hover:border-[color:var(--adflow-fg-muted)]"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 mt-0.5 rounded-full border-2 shrink-0 transition-all",
                  selectedObjective === o.value
                    ? "border-[color:var(--adflow-accent)] bg-[color:var(--adflow-accent)]"
                    : "border-[color:var(--adflow-border)]"
                )}
              />
              <div>
                <p className="text-sm font-medium text-[color:var(--adflow-fg)]">{o.label}</p>
                <p className="text-xs text-[color:var(--adflow-fg-muted)]">{o.group}</p>
              </div>
            </button>
          ))}
        </div>
        <FieldError message={errors.objective?.message} />
      </div>
    </div>
  );
}

function Step2Targeting({ form }: { form: ReturnType<typeof useForm<CampaignFormValues>> }) {
  const { register, formState: { errors } } = form;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Idade mínima</Label>
          <Input type="number" {...register("age_min")} min={18} max={65} placeholder="18" />
          <FieldError message={errors.age_min?.message} />
        </div>
        <div>
          <Label>Idade máxima</Label>
          <Input type="number" {...register("age_max")} min={18} max={65} placeholder="65" />
          <FieldError message={errors.age_max?.message} />
        </div>
      </div>

      <div>
        <Label>Localizações</Label>
        <Input
          {...register("locations")}
          placeholder="São Paulo, Rio de Janeiro, Brasil..."
        />
        <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-1">Separe por vírgula</p>
      </div>

      <div>
        <Label>Interesses</Label>
        <Input
          {...register("interests")}
          placeholder="Marketing digital, E-commerce, Tecnologia..."
        />
        <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-1">Separe por vírgula</p>
      </div>

      <div className="p-3 rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)]">
        <p className="text-xs text-[color:var(--adflow-fg-muted)]">
          <strong className="text-[color:var(--adflow-fg)]">Audiências personalizadas e lookalike</strong> serão configuradas após a criação da campanha, na página de detalhes.
        </p>
      </div>
    </div>
  );
}

function Step3Budget({ form }: { form: ReturnType<typeof useForm<CampaignFormValues>> }) {
  const { register, formState: { errors } } = form;

  return (
    <div className="space-y-6">
      <div>
        <Label required>Orçamento diário (R$)</Label>
        <Input
          type="number"
          {...register("daily_budget")}
          min={1}
          step={0.01}
          placeholder="300.00"
        />
        <FieldError message={errors.daily_budget?.message} />
      </div>

      <div>
        <Label>Orçamento total (R$) — opcional</Label>
        <Input
          type="number"
          {...register("lifetime_budget")}
          min={0}
          step={0.01}
          placeholder="Deixe em branco para sem limite"
        />
        <FieldError message={errors.lifetime_budget?.message} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label required>Data de início</Label>
          <Input type="date" {...register("start_date")} />
          <FieldError message={errors.start_date?.message} />
        </div>
        <div>
          <Label>Data de fim — opcional</Label>
          <Input type="date" {...register("end_date")} />
        </div>
      </div>
    </div>
  );
}

function Step4Review({ form }: { form: ReturnType<typeof useForm<CampaignFormValues>> }) {
  const values = form.getValues();

  const rows: { label: string; value: string }[] = [
    { label: "Nome", value: values.name },
    { label: "Plataforma", value: values.platform },
    { label: "Objetivo", value: OBJECTIVES.find((o) => o.value === values.objective)?.label ?? "" },
    { label: "Orçamento diário", value: `R$ ${Number(values.daily_budget).toFixed(2)}` },
    { label: "Orçamento total", value: values.lifetime_budget ? `R$ ${Number(values.lifetime_budget).toFixed(2)}` : "Sem limite" },
    { label: "Início", value: values.start_date },
    { label: "Fim", value: values.end_date ?? "Sem data de término" },
    ...(values.locations ? [{ label: "Localizações", value: values.locations }] : []),
    ...(values.interests ? [{ label: "Interesses", value: values.interests }] : []),
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--adflow-fg-muted)]">
        Confirme os dados antes de criar a campanha.
      </p>

      <div className="rounded-lg border border-[color:var(--adflow-border)] overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-4 px-4 py-3 text-sm",
              i % 2 === 0 ? "bg-[color:var(--adflow-surface)]" : ""
            )}
          >
            <span className="w-36 shrink-0 text-[color:var(--adflow-fg-muted)]">{row.label}</span>
            <span className="text-[color:var(--adflow-fg)] font-medium capitalize">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── main form ──────────────────────────────────────────────────────────────

export function CampaignForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CampaignFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(campaignSchema) as Resolver<CampaignFormValues>,
    defaultValues: {
      name: "",
      platform: "meta",
      objective: "sales",
      age_min: 18,
      age_max: 65,
      locations: "",
      interests: "",
      daily_budget: 100,
      lifetime_budget: null,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: null,
    },
  });

  const STEP_FIELDS: Record<number, (keyof CampaignFormValues)[]> = {
    1: ["name", "platform", "objective"],
    2: ["age_min", "age_max", "locations", "interests"],
    3: ["daily_budget", "lifetime_budget", "start_date", "end_date"],
  };

  async function handleNext() {
    const fields = STEP_FIELDS[step];
    const valid = await form.trigger(fields);
    if (valid) setStep((s) => s + 1);
  }

  async function handleSubmit(values: CampaignFormValues) {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          platform: values.platform,
          objective: values.objective,
          daily_budget: values.daily_budget,
          lifetime_budget: values.lifetime_budget ?? null,
          start_date: values.start_date,
          end_date: values.end_date ?? null,
          targeting: {
            age_min: values.age_min,
            age_max: values.age_max,
            locations: values.locations?.split(",").map((s) => s.trim()).filter(Boolean),
            interests: values.interests?.split(",").map((s) => s.trim()).filter(Boolean),
          },
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setServerError(data.error ?? "Erro ao criar campanha.");
        setIsSubmitting(false);
        return;
      }

      const created = (await res.json()) as { id: string };
      router.push(`/campaigns/${created.id}`);
    } catch {
      setServerError("Erro de conexão. Tente novamente.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
      <StepBar current={step} />

      <div className="min-h-[360px]">
        {step === 1 && <Step1Config form={form} />}
        {step === 2 && <Step2Targeting form={form} />}
        {step === 3 && <Step3Budget form={form} />}
        {step === 4 && <Step4Review form={form} />}
      </div>

      {serverError && (
        <div className="mt-4 p-3 rounded-md bg-[color:var(--adflow-danger)]/10 border border-[color:var(--adflow-danger)]/30 flex items-center gap-2 text-sm text-[color:var(--adflow-danger)]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {serverError}
        </div>
      )}

      <div className="flex justify-between mt-8 pt-6 border-t border-[color:var(--adflow-border)]">
        <Button
          type="button"
          variant="outline"
          onClick={() => (step > 1 ? setStep((s) => s - 1) : router.push("/campaigns"))}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {step > 1 ? "Anterior" : "Cancelar"}
        </Button>

        {step < 4 ? (
          <Button type="button" onClick={handleNext}>
            Próximo
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              "Criar campanha"
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
