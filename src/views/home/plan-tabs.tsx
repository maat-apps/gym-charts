import type { Plan } from "../../lib/schemas";

/**
 * The plans as tabs along the bottom of the screen, within the thumb's
 * reach: one per plan, sharing the width, the chosen one marked by a bar
 * above its label.
 */
export function PlanTabs({
  plans,
  selectedId,
  label,
  onSelect,
}: {
  plans: Plan[];
  selectedId: string | undefined;
  label: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur">
      <div
        role="tablist"
        aria-label={label}
        className="mx-auto flex w-[min(100%,480px)] px-2 pb-[env(safe-area-inset-bottom)]"
      >
        {plans.map((plan) => {
          const selected = plan.id === selectedId;
          return (
            <button
              key={plan.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`relative flex h-16 min-w-0 flex-1 items-center justify-center px-2 text-base outline-none focus-visible:ring-3 ${selected ? "text-foreground font-semibold" : "text-muted-foreground"}`}
              onClick={() => onSelect(plan.id)}
            >
              <span
                aria-hidden="true"
                className={`absolute inset-x-4 top-0 h-0.5 rounded-full ${selected ? "bg-foreground" : "bg-transparent"}`}
              />
              <span className="truncate">{plan.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
