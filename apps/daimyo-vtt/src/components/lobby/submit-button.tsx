"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

interface SubmitButtonProps {
  idleLabel: string;
  pendingLabel: string;
  disabled?: boolean;
  className?: string;
}

export function SubmitButton({
  idleLabel,
  pendingLabel,
  disabled = false,
  className
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70",
        className
      )}
    >
      {pending && <LoaderCircle size={16} className="animate-spin" />}
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
