"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import { submitReportAction } from "@/app/actions";

type ReportType = "all_recorded" | "missing" | "extra" | "";

export default function ReportForm({ bookingId }: { bookingId: string }) {
  const [reportType, setReportType] = useState<ReportType>("");

  return (
    <form action={submitReportAction} className="mt-3 rounded-xl border border-[#ece3d8] p-4 flex flex-col gap-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="reportType" value={reportType} />

      <p className="text-sm font-semibold text-preto">Como foi a gravação desta segunda-feira?</p>

      <div className="flex flex-col gap-2">
        {/* Opção 1: Tudo gravado */}
        <button
          type="button"
          onClick={() => setReportType("all_recorded")}
          className={`rounded-xl px-4 py-3 text-sm text-left border transition-colors ${
            reportType === "all_recorded"
              ? "bg-[#e4f3e6] border-[#bfe6c6] text-[#1f7a32]"
              : "border-[#ece3d8] text-preto hover:bg-bege"
          }`}
        >
          <p className="font-semibold">✅ Todos os vídeos previstos foram gravados</p>
          <p className="text-xs mt-0.5 text-[#5b534d]">Gravação ocorreu conforme planejado.</p>
        </button>

        {/* Opção 2: Faltou algo */}
        <button
          type="button"
          onClick={() => setReportType("missing")}
          className={`rounded-xl px-4 py-3 text-sm text-left border transition-colors ${
            reportType === "missing"
              ? "bg-[#fef3e2] border-[#f7d98a] text-[#7a4f00]"
              : "border-[#ece3d8] text-preto hover:bg-bege"
          }`}
        >
          <p className="font-semibold">⚠️ Faltou gravar algum vídeo</p>
          <p className="text-xs mt-0.5 text-[#5b534d]">Um ou mais vídeos previstos não foram gravados.</p>
        </button>

        {/* Opção 3: Gravei extras */}
        <button
          type="button"
          onClick={() => setReportType("extra")}
          className={`rounded-xl px-4 py-3 text-sm text-left border transition-colors ${
            reportType === "extra"
              ? "bg-[#fff0e6] border-[#f5c29a] text-[#a05000]"
              : "border-[#ece3d8] text-preto hover:bg-bege"
          }`}
        >
          <p className="font-semibold">➕ Gravei vídeos extras além do previsto</p>
          <p className="text-xs mt-0.5 text-[#5b534d]">Vídeos fora do planejamento original foram gravados.</p>
        </button>
      </div>

      {/* Detalhes: faltou algo */}
      {reportType === "missing" && (
        <div className="flex flex-col gap-3 rounded-xl bg-[#fef3e2] border border-[#f7d98a] p-4">
          <p className="text-sm font-semibold text-[#7a4f00]">Detalhe o que ficou pendente:</p>
          <div>
            <label className="block text-xs font-semibold text-preto mb-1">Qual vídeo não foi gravado?</label>
            <input
              type="text"
              name="missingTitle"
              required
              placeholder="Título ou tema do vídeo"
              className="w-full rounded-lg border border-[#ece3d8] px-3 py-2 text-sm focus:border-laranja focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-preto mb-1">Quem iria gravar?</label>
            <input
              type="text"
              name="missingPerson"
              required
              placeholder="Nome da pessoa"
              className="w-full rounded-lg border border-[#ece3d8] px-3 py-2 text-sm focus:border-laranja focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-preto mb-1">Motivo da pendência</label>
            <textarea
              name="missingReason"
              required
              rows={2}
              placeholder="Por que não foi gravado?"
              className="w-full rounded-lg border border-[#ece3d8] px-3 py-2 text-sm focus:border-laranja focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-preto mb-1">Observações adicionais (opcional)</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Qualquer detalhe relevante"
              className="w-full rounded-lg border border-[#ece3d8] px-3 py-2 text-sm focus:border-laranja focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Detalhes: extras */}
      {reportType === "extra" && (
        <div className="rounded-xl bg-[#fff0e6] border border-[#f5c29a] p-4 text-sm text-[#a05000]">
          <p className="font-semibold">Registre o briefing do vídeo extra</p>
          <p className="text-xs mt-1 text-[#5b534d]">
            Ao confirmar, você será redirecionado para preencher o briefing completo do vídeo extra gravado.
          </p>
        </div>
      )}

      {reportType !== "" && (
        <SubmitButton
          reportType={reportType}
          disabled={
            reportType === "missing"
              ? false // campos required no form já validam
              : false
          }
        />
      )}
    </form>
  );
}

function SubmitButton({ reportType, disabled }: { reportType: ReportType; disabled: boolean }) {
  const { pending } = useFormStatus();
  const label =
    reportType === "extra"
      ? "Continuar e registrar vídeo extra →"
      : reportType === "missing"
      ? "Registrar pendência"
      : "Confirmar relatório";
  return (
    <Button type="submit" variant="primary" disabled={disabled || pending} className="self-start text-sm">
      {pending ? "Enviando..." : label}
    </Button>
  );
}
