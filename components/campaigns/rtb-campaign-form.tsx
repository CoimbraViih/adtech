"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Globe,
  Lock,
  Star,
  Shield,
  X,
} from "lucide-react";
import type { Audience } from "@/types/database";

// ── schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  deal_type: z.enum(["open", "private", "preferred", "guaranteed"]),
  deal_id: z.string().optional(),
  audience_id: z.string().optional(),
  targeting_domains: z.array(z.string()).default([]),
  targeting_language: z.string().default("pt"),
  targeting_devices: z
    .array(z.enum(["desktop", "mobile", "tablet"]))
    .default([]),
  floor_cpm: z.coerce.number().min(0, "CPM piso inválido"),
  max_cpm: z.coerce.number().min(0.01, "CPM máximo obrigatório"),
  daily_budget: z.coerce.number().min(1, "Budget diário obrigatório"),
  total_budget: z.coerce.number().optional(),
  pacing: z.enum(["even", "asap"]),
  frequency_cap: z.coerce.number().min(1).default(3),
  frequency_cap_hours: z.coerce.number().min(1).default(24),
  start_date: z.string().min(1, "Data de início obrigatória"),
  end_date: z.string().optional(),
});

type RtbFormValues = z.infer<typeof schema>;

// ── constants ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Deal" },
  { id: 2, label: "Audiência" },
  { id: 3, label: "Bid & Orçamento" },
  { id: 4, label: "Revisão" },
];

type DealTypeOption = {
  value: "open" | "private" | "preferred" | "guaranteed";
  label: string;
  description: string;
  icon: React.ReactNode;
};

const DEAL_TYPES: DealTypeOption[] = [
  {
    value: "open",
    label: "Open Auction",
    description: "Leilão aberto com todos os SSPs",
    icon: <Globe className="w-5 h-5" />,
  },
  {
    value: "private",
    label: "Private Marketplace",
    description: "Inventário premium selecionado",
    icon: <Lock className="w-5 h-5" />,
  },
  {
    value: "preferred",
    label: "Preferred Deal",
    description: "Preço fixo negociado",
    icon: <Star className="w-5 h-5" />,
  },
  {
    value: "guaranteed",
    label: "Programmatic Guaranteed",
    description: "Volume garantido",
    icon: <Shield className="w-5 h-5" />,
  },
];

const STEP_FIELDS: Record<number, (keyof RtbFormValues)[]> = {
  1: ["name", "deal_type", "deal_id"],
  2: ["audience_id", "targeting_domains", "targeting_language", "targeting_devices"],
  3: [
    "floor_cpm",
    "max_cpm",
    "daily_budget",
    "total_budget",
    "pacing",
    "frequency_cap",
    "frequency_cap_hours",
  ],
  4: ["start_date", "end_date"],
};

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
              {current > step.id ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                step.id
              )}
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

function FormLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-[color:var(--adflow-fg)] mb-1.5">
      {children}
      {required && (
        <span className="text-[color:var(--adflow-accent)] ml-0.5">*</span>
      )}
    </label>
  );
}

function FormInput({
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

function Step1Deal({
  form,
}: {
  form: ReturnType<typeof useForm<RtbFormValues>>;
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const selectedDeal = watch("deal_type");
  const showDealId = selectedDeal !== "open";

  return (
    <div className="space-y-6">
      <div>
        <FormLabel required>Nome da campanha</FormLabel>
        <FormInput
          {...register("name")}
          placeholder="Ex.: Branding Q3 2026 — Open Market"
          autoFocus
        />
        <FieldError message={errors.name?.message} />
      </div>

      <div>
        <FormLabel required>Tipo de Deal</FormLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          {DEAL_TYPES.map((dt) => (
            <button
              key={dt.value}
              type="button"
              onClick={() =>
                setValue("deal_type", dt.value, { shouldValidate: true })
              }
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                selectedDeal === dt.value
                  ? "border-[color:var(--adflow-accent)] bg-[color:var(--adflow-accent)]/5"
                  : "border-[color:var(--adflow-border)] hover:border-[color:var(--adflow-fg-muted)]"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0",
                  selectedDeal === dt.value
                    ? "text-[color:var(--adflow-accent)]"
                    : "text-[color:var(--adflow-fg-muted)]"
                )}
              >
                {dt.icon}
              </span>
              <div>
                <p className="text-sm font-medium text-[color:var(--adflow-fg)]">
                  {dt.label}
                </p>
                <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-0.5">
                  {dt.description}
                </p>
              </div>
            </button>
          ))}
        </div>
        <FieldError message={errors.deal_type?.message} />
      </div>

      {showDealId && (
        <div>
          <FormLabel>Deal ID (negociado com o SSP)</FormLabel>
          <FormInput
            {...register("deal_id")}
            placeholder="Ex.: deal_globo_rtb_2026"
          />
          <FieldError message={errors.deal_id?.message} />
        </div>
      )}
    </div>
  );
}

function Step2Audience({
  form,
  audiences,
}: {
  form: ReturnType<typeof useForm<RtbFormValues>>;
  audiences: Audience[];
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const [domainInput, setDomainInput] = useState("");
  const domains = watch("targeting_domains") ?? [];
  const devices = watch("targeting_devices") ?? [];

  function addDomain() {
    const trimmed = domainInput.trim();
    if (trimmed && !domains.includes(trimmed)) {
      setValue("targeting_domains", [...domains, trimmed], {
        shouldValidate: true,
      });
    }
    setDomainInput("");
  }

  function removeDomain(domain: string) {
    setValue(
      "targeting_domains",
      domains.filter((d) => d !== domain),
      { shouldValidate: true }
    );
  }

  function toggleDevice(device: "desktop" | "mobile" | "tablet") {
    if (devices.includes(device)) {
      setValue(
        "targeting_devices",
        devices.filter((d) => d !== device),
        { shouldValidate: true }
      );
    } else {
      setValue("targeting_devices", [...devices, device], {
        shouldValidate: true,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <FormLabel>Audiência</FormLabel>
        <select
          {...register("audience_id")}
          className="w-full px-3 py-2 text-sm bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-md text-[color:var(--adflow-fg)] focus:outline-none focus:ring-1 focus:ring-[color:var(--adflow-accent)] transition"
        >
          <option value="">Sem audiência</option>
          {audiences.map((aud) => (
            <option key={aud.id} value={aud.id}>
              {aud.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.audience_id?.message} />
      </div>

      <div>
        <FormLabel>Domínios permitidos (opcional)</FormLabel>
        <div className="flex gap-2">
          <FormInput
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDomain();
              }
            }}
            placeholder="Ex.: globo.com"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addDomain}
            className="shrink-0"
          >
            Adicionar
          </Button>
        </div>
        {domains.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {domains.map((domain) => (
              <span
                key={domain}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)]"
              >
                {domain}
                <button
                  type="button"
                  onClick={() => removeDomain(domain)}
                  className="text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-danger)] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <FieldError message={errors.targeting_domains?.message} />
      </div>

      <div>
        <FormLabel>Idioma</FormLabel>
        <FormInput
          {...register("targeting_language")}
          placeholder="pt"
        />
        <FieldError message={errors.targeting_language?.message} />
      </div>

      <div>
        <FormLabel>Dispositivos</FormLabel>
        <div className="flex flex-wrap gap-4 mt-1">
          {(
            [
              { value: "desktop", label: "Desktop" },
              { value: "mobile", label: "Mobile" },
              { value: "tablet", label: "Tablet" },
            ] as const
          ).map((device) => (
            <label
              key={device.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={devices.includes(device.value)}
                onChange={() => toggleDevice(device.value)}
                className="w-4 h-4 rounded border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] accent-[color:var(--adflow-accent)]"
              />
              <span className="text-sm text-[color:var(--adflow-fg)]">
                {device.label}
              </span>
            </label>
          ))}
        </div>
        <FieldError message={errors.targeting_devices?.message} />
      </div>
    </div>
  );
}

function Step3BidBudget({
  form,
}: {
  form: ReturnType<typeof useForm<RtbFormValues>>;
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const selectedPacing = watch("pacing");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormLabel>CPM Piso (R$)</FormLabel>
          <FormInput
            type="number"
            {...register("floor_cpm")}
            min={0}
            step={0.01}
            placeholder="0.00"
          />
          <FieldError message={errors.floor_cpm?.message} />
        </div>
        <div>
          <FormLabel required>CPM Máximo (R$)</FormLabel>
          <FormInput
            type="number"
            {...register("max_cpm")}
            min={0.01}
            step={0.01}
            placeholder="20.00"
          />
          <FieldError message={errors.max_cpm?.message} />
        </div>
      </div>

      <div>
        <FormLabel required>Budget Diário (R$)</FormLabel>
        <FormInput
          type="number"
          {...register("daily_budget")}
          min={1}
          step={0.01}
          placeholder="500.00"
        />
        <FieldError message={errors.daily_budget?.message} />
      </div>

      <div>
        <FormLabel>Budget Total (R$) — opcional</FormLabel>
        <FormInput
          type="number"
          {...register("total_budget")}
          min={0}
          step={0.01}
          placeholder="Deixe em branco para sem limite"
        />
        <FieldError message={errors.total_budget?.message} />
      </div>

      <div>
        <FormLabel required>Pacing</FormLabel>
        <div className="flex flex-col gap-2 mt-1">
          {(
            [
              {
                value: "even" as const,
                label: "Even (distribuído ao longo do dia)",
              },
              { value: "asap" as const, label: "ASAP (o mais rápido possível)" },
            ]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                setValue("pacing", opt.value, { shouldValidate: true })
              }
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                selectedPacing === opt.value
                  ? "border-[color:var(--adflow-accent)] bg-[color:var(--adflow-accent)]/5"
                  : "border-[color:var(--adflow-border)] hover:border-[color:var(--adflow-fg-muted)]"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full border-2 shrink-0 transition-all",
                  selectedPacing === opt.value
                    ? "border-[color:var(--adflow-accent)] bg-[color:var(--adflow-accent)]"
                    : "border-[color:var(--adflow-border)]"
                )}
              />
              <span className="text-sm text-[color:var(--adflow-fg)]">
                {opt.label}
              </span>
            </button>
          ))}
        </div>
        <FieldError message={errors.pacing?.message} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormLabel>Freq. Cap (impressões por usuário)</FormLabel>
          <FormInput
            type="number"
            {...register("frequency_cap")}
            min={1}
            placeholder="3"
          />
          <FieldError message={errors.frequency_cap?.message} />
        </div>
        <div>
          <FormLabel>Janela (horas)</FormLabel>
          <FormInput
            type="number"
            {...register("frequency_cap_hours")}
            min={1}
            placeholder="24"
          />
          <FieldError message={errors.frequency_cap_hours?.message} />
        </div>
      </div>
    </div>
  );
}

function Step4Review({
  form,
  audiences,
}: {
  form: ReturnType<typeof useForm<RtbFormValues>>;
  audiences: Audience[];
}) {
  const {
    register,
    getValues,
    formState: { errors },
  } = form;
  const values = getValues();

  const audience = audiences.find((a) => a.id === values.audience_id);
  const dealType = DEAL_TYPES.find((d) => d.value === values.deal_type);

  const sections: Array<{ heading: string; rows: { label: string; value: string }[] }> = [
    {
      heading: "Deal",
      rows: [
        { label: "Nome", value: values.name || "—" },
        { label: "Tipo de Deal", value: dealType?.label ?? values.deal_type },
        ...(values.deal_id ? [{ label: "Deal ID", value: values.deal_id }] : []),
      ],
    },
    {
      heading: "Audiência",
      rows: [
        { label: "Audiência", value: audience?.name ?? "Sem audiência" },
        { label: "Idioma", value: values.targeting_language || "pt" },
        {
          label: "Dispositivos",
          value:
            values.targeting_devices?.length
              ? values.targeting_devices.join(", ")
              : "Nenhum selecionado",
        },
        ...(values.targeting_domains?.length
          ? [{ label: "Domínios", value: values.targeting_domains.join(", ") }]
          : []),
      ],
    },
    {
      heading: "Bid & Orçamento",
      rows: [
        { label: "CPM Piso", value: `R$ ${Number(values.floor_cpm || 0).toFixed(2)}` },
        { label: "CPM Máximo", value: `R$ ${Number(values.max_cpm || 0).toFixed(2)}` },
        { label: "Budget Diário", value: `R$ ${Number(values.daily_budget || 0).toFixed(2)}` },
        {
          label: "Budget Total",
          value: values.total_budget
            ? `R$ ${Number(values.total_budget).toFixed(2)}`
            : "Sem limite",
        },
        { label: "Pacing", value: values.pacing === "even" ? "Even" : "ASAP" },
        {
          label: "Freq. Cap",
          value: `${values.frequency_cap ?? 3}x / ${values.frequency_cap_hours ?? 24}h`,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-[color:var(--adflow-fg-muted)]">
        Confirme os dados e defina as datas antes de criar a campanha.
      </p>

      {sections.map((section) => (
        <div key={section.heading}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--adflow-fg-muted)] mb-2">
            {section.heading}
          </p>
          <div className="rounded-lg border border-[color:var(--adflow-border)] overflow-hidden">
            {section.rows.map((row, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-4 px-4 py-3 text-sm",
                  i % 2 === 0 ? "bg-[color:var(--adflow-surface)]" : ""
                )}
              >
                <span className="w-36 shrink-0 text-[color:var(--adflow-fg-muted)]">
                  {row.label}
                </span>
                <span className="text-[color:var(--adflow-fg)] font-medium">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--adflow-fg-muted)] mb-2">
          Período
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel required>Data de início</FormLabel>
            <FormInput type="date" {...register("start_date")} />
            <FieldError message={errors.start_date?.message} />
          </div>
          <div>
            <FormLabel>Data de fim (opcional)</FormLabel>
            <FormInput type="date" {...register("end_date")} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── main form ──────────────────────────────────────────────────────────────

export default function RtbCampaignForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [audiences, setAudiences] = useState<Audience[]>([]);

  useEffect(() => {
    fetch("/api/audiences")
      .then((r) => r.json())
      .then((d: { data?: Audience[] }) => {
        if (Array.isArray(d.data)) setAudiences(d.data);
      })
      .catch(() => {/* silently ignore */});
  }, []);

  const form = useForm<RtbFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as Resolver<RtbFormValues>,
    defaultValues: {
      name: "",
      deal_type: "open",
      deal_id: "",
      audience_id: "",
      targeting_domains: [],
      targeting_language: "pt",
      targeting_devices: ["desktop", "mobile", "tablet"],
      floor_cpm: 0,
      max_cpm: 0,
      daily_budget: 0,
      total_budget: undefined,
      pacing: "even",
      frequency_cap: 3,
      frequency_cap_hours: 24,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: "",
    },
  });

  async function handleNext() {
    const fields = STEP_FIELDS[step];
    // For step 1, only validate deal_id when required
    const fieldsToValidate =
      step === 1 && form.getValues("deal_type") === "open"
        ? fields.filter((f) => f !== "deal_id")
        : fields;
    const valid = await form.trigger(
      fieldsToValidate as (keyof RtbFormValues)[]
    );
    if (valid) setStep((s) => s + 1);
  }

  async function handleSubmit(values: RtbFormValues) {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/rtb/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          deal_type: values.deal_type,
          deal_id: values.deal_id || null,
          audience_id: values.audience_id || null,
          targeting: {
            domains: values.targeting_domains,
            language: values.targeting_language,
            devices: values.targeting_devices,
          },
          floor_cpm: values.floor_cpm,
          max_cpm: values.max_cpm,
          daily_budget: values.daily_budget,
          total_budget: values.total_budget ?? null,
          pacing: values.pacing,
          frequency_cap: values.frequency_cap,
          frequency_cap_hours: values.frequency_cap_hours,
          start_date: values.start_date,
          end_date: values.end_date || null,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setServerError(data.error ?? "Erro ao criar campanha RTB.");
        setIsSubmitting(false);
        return;
      }

      router.push("/campaigns/programmatic");
    } catch {
      setServerError("Erro de conexão. Tente novamente.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-6">
      <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
        <StepBar current={step} />

        <div className="min-h-[360px]">
          {step === 1 && <Step1Deal form={form} />}
          {step === 2 && <Step2Audience form={form} audiences={audiences} />}
          {step === 3 && <Step3BidBudget form={form} />}
          {step === 4 && <Step4Review form={form} audiences={audiences} />}
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
            onClick={() =>
              step > 1
                ? setStep((s) => s - 1)
                : router.push("/campaigns/programmatic")
            }
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {step > 1 ? "Voltar" : "Cancelar"}
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
                "Criar Campanha RTB"
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
