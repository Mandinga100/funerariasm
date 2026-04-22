import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface SelectionCheckboxProps {
  state: "none" | "some" | "all" | boolean;
  onChange: () => void;
  label?: string;
  className?: string;
}

/**
 * Checkbox tri-estado (none/some/all) o booleano.
 * Detiene la propagación del click para no disparar el row click de la tabla.
 */
export default function SelectionCheckbox({
  state,
  onChange,
  label,
  className,
}: SelectionCheckboxProps) {
  const checked = state === "all" || state === true ? true : state === "some" ? "indeterminate" : false;
  return (
    <div
      className={cn("inline-flex items-center", className)}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      data-no-row-click
    >
      <Checkbox
        checked={checked}
        aria-label={label ?? "Seleccionar"}
        onCheckedChange={() => {/* handled by wrapper */}}
      />
    </div>
  );
}
