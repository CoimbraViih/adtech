export type CredentialField = {
  key: string;
  label: string;
  placeholder: string;
  helpText?: string;
  secret: boolean;
};

export type TestResult = {
  ok: boolean;
  message: string;
};

export type ProviderCategory = "ads" | "ai" | "communication" | "programmatic";

export type ProviderDef = {
  key: string;
  label: string;
  description: string;
  category: ProviderCategory;
  docsUrl: string;
  fields: CredentialField[];
  testConnection: (creds: Record<string, string>) => Promise<TestResult>;
};
