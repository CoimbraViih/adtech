"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completeOnboarding } from "@/lib/auth/actions";
import {
  Loader2,
  AlertCircle,
  Building2,
  LayoutDashboard,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

// ── Schemas ──────────────────────────────────────────────────────────────────

const orgSchema = z.object({
  orgName: z
    .string()
    .min(2, "Nome da organização deve ter ao menos 2 caracteres")
    .max(80, "Nome muito longo"),
  orgType: z
    .enum(["agency", "advertiser", "freelancer"])
    .refine((v) => v !== undefined, { message: "Selecione o tipo da organização" }),
});

const workspaceSchema = z.object({
  workspaceName: z
    .string()
    .min(2, "Nome do workspace deve ter ao menos 2 caracteres")
    .max(60, "Nome muito longo"),
  workspaceDescription: z.string().max(200, "Descrição muito longa").optional(),
});

type OrgData = z.infer<typeof orgSchema>;
type WorkspaceData = z.infer<typeof workspaceSchema>;

// ── Subcomponents ─────────────────────────────────────────────────────────────

const ORG_TYPES: { value: OrgData["orgType"]; label: string; hint: string }[] =
  [
    { value: "agency", label: "Agência", hint: "Gerencio múltiplos clientes" },
    {
      value: "advertiser",
      label: "Anunciante",
      hint: "Gerencio minha própria marca",
    },
    {
      value: "freelancer",
      label: "Freelancer",
      hint: "Trabalho de forma independente",
    },
  ];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-[color:var(--adflow-danger)]">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

// ── Step indicators ───────────────────────────────────────────────────────────

function StepBar({ current }: { current: 1 | 2 }) {
  const steps = [
    { n: 1, label: "Organização", icon: Building2 },
    { n: 2, label: "Workspace", icon: LayoutDashboard },
  ] as const;

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const done = current > step.n;
        const active = current === step.n;
        const Icon = step.icon;
        return (
          <div key={step.n} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  done
                    ? "border-[color:var(--adflow-success)] bg-[color:var(--adflow-success)]/10 text-[color:var(--adflow-success)]"
                    : active
                      ? "border-[color:var(--adflow-accent)] bg-[color:var(--adflow-accent)]/10 text-[color:var(--adflow-accent)]"
                      : "border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] text-[color:var(--adflow-fg-muted)]",
                ].join(" ")}
              >
                {done ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>
              <span
                className={[
                  "text-xs font-medium",
                  active
                    ? "text-[color:var(--adflow-fg)]"
                    : "text-[color:var(--adflow-fg-muted)]",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={[
                  "h-px w-8 transition-colors",
                  done
                    ? "bg-[color:var(--adflow-success)]/40"
                    : "bg-[color:var(--adflow-border)]",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Organização ───────────────────────────────────────────────────────

function StepOrg({
  onNext,
}: {
  onNext: (data: OrgData) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrgData>({ resolver: zodResolver(orgSchema) });

  const selectedType = watch("orgType");

  async function onSubmit(data: OrgData) {
    await new Promise((r) => setTimeout(r, 600));
    onNext(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[color:var(--adflow-fg-muted)]">
          Nome da organização
        </label>
        <Input
          placeholder="Agência Exemplo LTDA"
          disabled={isSubmitting}
          aria-invalid={!!errors.orgName}
          className={
            errors.orgName
              ? "border-[color:var(--adflow-danger)] focus-visible:ring-[color:var(--adflow-danger)]/30"
              : ""
          }
          {...register("orgName")}
        />
        <FieldError message={errors.orgName?.message} />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[color:var(--adflow-fg-muted)]">
          Tipo de organização
        </label>
        <div className="grid gap-2">
          {ORG_TYPES.map((type) => {
            const active = selectedType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                disabled={isSubmitting}
                onClick={() => setValue("orgType", type.value, { shouldValidate: true })}
                className={[
                  "flex items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                  active
                    ? "border-[color:var(--adflow-accent)] bg-[color:var(--adflow-accent)]/8"
                    : "border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] hover:border-[color:var(--adflow-border)]/80",
                ].join(" ")}
              >
                <div
                  className={[
                    "mt-0.5 h-3.5 w-3.5 rounded-full border-2 shrink-0",
                    active
                      ? "border-[color:var(--adflow-accent)] bg-[color:var(--adflow-accent)]"
                      : "border-[color:var(--adflow-fg-muted)]",
                  ].join(" ")}
                />
                <div>
                  <span
                    className={[
                      "block text-xs font-medium",
                      active
                        ? "text-[color:var(--adflow-fg)]"
                        : "text-[color:var(--adflow-fg-muted)]",
                    ].join(" ")}
                  >
                    {type.label}
                  </span>
                  <span className="block text-[11px] text-[color:var(--adflow-fg-muted)]">
                    {type.hint}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {/* hidden input para register funcionar com validação */}
        <input type="hidden" {...register("orgType")} />
        <FieldError message={errors.orgType?.message} />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[color:var(--adflow-accent)] hover:bg-[color:var(--adflow-accent)]/90 text-white disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando…
          </>
        ) : (
          <>
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}

// ── Step 2: Workspace ─────────────────────────────────────────────────────────

function StepWorkspace({
  orgName,
  onSubmit,
  isPending,
  serverError,
}: {
  orgName: string;
  onSubmit: (data: WorkspaceData) => void;
  isPending: boolean;
  serverError: string | null;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkspaceData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { workspaceName: orgName },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError && (
        <div className="flex items-start gap-2 rounded-md border border-[color:var(--adflow-danger)]/30 bg-[color:var(--adflow-danger)]/8 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--adflow-danger)]" />
          <p className="text-xs text-[color:var(--adflow-danger)]">{serverError}</p>
        </div>
      )}

      <div className="rounded-md border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] px-3 py-2.5">
        <p className="text-[11px] text-[color:var(--adflow-fg-muted)]">
          Organização criada com sucesso
        </p>
        <p className="mt-0.5 text-xs font-medium text-[color:var(--adflow-fg)]">
          {orgName}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[color:var(--adflow-fg-muted)]">
          Nome do workspace
        </label>
        <Input
          placeholder="Clientes principais"
          disabled={isPending}
          aria-invalid={!!errors.workspaceName}
          className={
            errors.workspaceName
              ? "border-[color:var(--adflow-danger)] focus-visible:ring-[color:var(--adflow-danger)]/30"
              : ""
          }
          {...register("workspaceName")}
        />
        <FieldError message={errors.workspaceName?.message} />
        <p className="text-[11px] text-[color:var(--adflow-fg-muted)]">
          Um workspace agrupa campanhas, criativos e pixels de um cliente ou marca.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[color:var(--adflow-fg-muted)]">
          Descrição{" "}
          <span className="font-normal text-[color:var(--adflow-fg-muted)]">
            (opcional)
          </span>
        </label>
        <textarea
          placeholder="Ex: Campanhas de performance para e-commerce"
          disabled={isPending}
          rows={3}
          className="w-full resize-none rounded-md border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] px-3 py-2 text-sm text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--adflow-accent)]/40 transition-shadow disabled:opacity-50"
          {...register("workspaceDescription")}
        />
        <FieldError message={errors.workspaceDescription?.message} />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-[color:var(--adflow-accent)] hover:bg-[color:var(--adflow-accent)]/90 text-white disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Criando workspace…
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Entrar no dashboard
          </>
        )}
      </Button>
    </form>
  );
}

// ── Wizard ────────────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const [step, setStep] = useState<1 | 2>(1);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOrgNext(data: OrgData) {
    setOrgData(data);
    setStep(2);
  }

  function handleWorkspaceSubmit(data: WorkspaceData) {
    if (!orgData) return;
    setServerError(null);
    startTransition(async () => {
      const result = await completeOnboarding({
        orgName: orgData.orgName,
        orgType: orgData.orgType,
        workspaceName: data.workspaceName,
        workspaceDescription: data.workspaceDescription,
      });
      if (result && "error" in result) {
        setServerError(result.error);
      }
      // On success, completeOnboarding calls redirect() server-side
    });
  }

  return (
    <div className="space-y-6">
      <StepBar current={step} />

      <div>
        {step === 1 && (
          <div>
            <h2 className="text-sm font-semibold text-[color:var(--adflow-fg)]">
              Sobre sua organização
            </h2>
            <p className="mt-1 text-xs text-[color:var(--adflow-fg-muted)]">
              Vamos configurar sua conta. Isso leva menos de 1 minuto.
            </p>
            <div className="mt-4">
              <StepOrg onNext={handleOrgNext} />
            </div>
          </div>
        )}

        {step === 2 && orgData && (
          <div>
            <h2 className="text-sm font-semibold text-[color:var(--adflow-fg)]">
              Crie seu primeiro workspace
            </h2>
            <p className="mt-1 text-xs text-[color:var(--adflow-fg-muted)]">
              Workspaces organizam seus clientes, campanhas e criativos.
            </p>
            <div className="mt-4">
              <StepWorkspace
                orgName={orgData.orgName}
                onSubmit={handleWorkspaceSubmit}
                isPending={isPending}
                serverError={serverError}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
