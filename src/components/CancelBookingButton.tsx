"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { cancelBookingAction } from "@/app/actions";

export default function CancelBookingButton({
  bookingId,
  redirectTo,
  label = "Cancelar reserva",
  confirmMessage = "Tem certeza que deseja cancelar esta reserva? Essa ação não pode ser desfeita.",
  className = "text-xs px-3 py-1.5",
}: {
  bookingId: string;
  redirectTo: string;
  label?: string;
  confirmMessage?: string;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(() => cancelBookingAction(formData));
      }}
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Button type="submit" variant="danger" className={className} disabled={isPending}>
        {isPending ? "Cancelando..." : label}
      </Button>
    </form>
  );
}
