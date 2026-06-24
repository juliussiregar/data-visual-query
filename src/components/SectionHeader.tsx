import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div>
        <div className="flex items-center gap-2.5">
          <span className="h-5 w-1 shrink-0 rounded-full bg-indigo-500" />
          <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">{title}</h2>
        </div>
        {description && (
          <div className="mt-1 text-sm leading-relaxed text-slate-500">{description}</div>
        )}
      </div>
      {action}
    </div>
  );
}
