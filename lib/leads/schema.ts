import { z } from "zod";

const AGENCY_SIZES = ["solo", "small", "medium", "large"] as const;

export const LeadInputSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(100),
  email: z.string().email("E-mail inválido"),
  agency_size: z.enum(AGENCY_SIZES, {
    error: () => ({ message: "Tamanho de agência inválido" }),
  }),
});

export type LeadInput = z.infer<typeof LeadInputSchema>;

export function parseLeadInput(raw: unknown) {
  return LeadInputSchema.safeParse(raw);
}
