import { Building2 } from "lucide-react";

type OrgSwitcherProps = {
  orgName?: string;
};

export function OrgSwitcher({ orgName = "Workspace" }: OrgSwitcherProps) {
  return (
    <div className="inline-flex items-center gap-2 h-8 px-2 rounded-md text-sm max-w-[200px]">
      <Building2 className="w-3.5 h-3.5 shrink-0 text-[color:var(--adflow-accent)]" />
      <span className="truncate font-medium text-[color:var(--adflow-fg)]">
        {orgName}
      </span>
    </div>
  );
}
