import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PolicyItem } from "@/types/database";

type PolicyCheckerProps = {
  items: PolicyItem[];
  className?: string;
};

export function PolicyChecker({ items, className }: PolicyCheckerProps) {
  const passed = items.filter((i) => i.passed).length;
  const total = items.length;
  const allPassed = passed === total;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Summary line */}
      <div className="flex items-center gap-2">
        {allPassed ? (
          <CheckCircle2 className="w-4 h-4 text-[color:var(--adflow-success)] shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-[color:var(--adflow-warning)] shrink-0" />
        )}
        <span className="text-xs text-[color:var(--adflow-fg-muted)]">
          {passed}/{total} regras aprovadas
        </span>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2.5">
            {item.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-[color:var(--adflow-success)] shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 mt-0.5 text-[color:var(--adflow-danger)] shrink-0" />
            )}
            <div>
              <p className="text-xs text-[color:var(--adflow-fg)]">{item.rule}</p>
              {item.detail && (
                <p className="text-xs text-[color:var(--adflow-warning)] mt-0.5">{item.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
