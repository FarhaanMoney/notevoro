import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  testId: string;
}

export function MetricCard({ icon: Icon, label, value, hint, testId }: Props) {
  return (
    <div
      className="nv-panel nv-hover-card animate-fade-up rounded-xl px-4 py-3.5"
      data-testid={testId}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary">
          <Icon className="size-4" />
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 font-heading text-2xl font-semibold leading-none">{value}</p>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  testId,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  testId: string;
}) {
  return (
    <div
      className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-border px-5 py-8"
      data-testid={testId}
    >
      <p className="font-heading text-sm font-semibold">{title}</p>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}
