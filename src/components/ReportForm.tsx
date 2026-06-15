"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import { submitReportAction } from "@/app/actions";

export default function ReportForm({ bookingId }: { bookingId: string }) {
  const [allRecorded, setAllRecorded] = useState<"sim" | "nao" | "">("");

  return (
    <form action={submitReportAction} className="mt-3 rounded-xl border border-[#ece3d8] p-4 flex flex-col gap-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <p className="text-sm font-semibold text-preto">Todos os vídeos previstos foram gravados?</p>
      <div className="flex gap-2">
        {(["sim", "nao"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setAllRecorded(opt)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold border transition-colors ${
              allRecorded === opt
                ? "bg-laranja text-white border-laranja"
                : "border-[#ece3d8] text-preto hover:bg-bege"
            }`}
          >
            {opt === "sim" ? "Sim, tudo certo" : "Não, faltou algo"}
          </button>
        ))}
      </div>
      <input type="hidden" name="allRecorded" value={allRecorded} />

      {allRecorded === "nao" && (
        <div>
          <label className="block text-sm font-semibold text-preto mb-1">O que ficou faltando?</label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Descreva quais vídeos não foram gravados e por quê"
            className="w-full rounded-xl border border-[#ece3d8] px-3 py-2 text-sm focus:border-laranja focus:outline-none"
          />
        </div>
      )}

      <SubmitButton disabled={allRecorded === ""} />
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={disabled || pending} className="self-start text-sm">
      {pending ? "Enviando..." : "Enviar relatório"}
    </Button>
  );
}
