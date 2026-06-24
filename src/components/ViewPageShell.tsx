import { cn } from "@/lib/utils";

interface ViewPageShellProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ViewPageShell({
  title,
  description,
  action,
  children,
  className,
}: ViewPageShellProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
