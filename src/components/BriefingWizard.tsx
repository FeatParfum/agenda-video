"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import { TONE_OPTIONS, DURATION_SUGESTOES } from "@/lib/constants";

const LOGO_OPTIONS = [
  "UniFatecie",
  "Fatecie",
  "Faculdade parceira (especificar)",
  "Sem logo / padrão institucional",
];

const MUSIC_OPTIONS = [
  "Institucional / corporativa",
  "Animada / moderna",
  "Emocional / suave",
  "Eletrônica / upbeat",
  "Sem trilha sonora",
  "A critério da edição",
];

type InitialValues = {
  videoCount?: number;
  durationMin?: number;
  theme?: string;
  subjects?: string;
  requester?: string;
  logo?: string;
  musicStyle?: string;
  tone?: string;
  extraNotes?: string;
  scriptLinks?: string;
};

type Props = {
  action: (formData: FormData) => void;
  weekDate: string;
  bookingId?: string;
  startTime: string;
  bookedMinutes: number;
  totalMinutes: number;
  isExtra?: boolean;
  submitLabel?: string;
  initialValues?: InitialValues;
};

export default function BriefingWizard({
  action,
  weekDate,
  bookingId,
  startTime: _startTime,
  bookedMinutes: _bookedMinutes,
  totalMinutes,
  isExtra = false,
  submitLabel = "Confirmar solicitação",
  initialValues = {},
}: Props) {
  const [step, setStep] = useState(0);
  const [videoCount, setVideoCount] = useState(initialValues.videoCount ?? 1);
  const [durationMin, setDurationMin] = useState(initialValues.durationMin ?? 30);
  const [theme, setTheme] = useState(initialValues.theme ?? "");
  const [subjects, setSubjects] = useState(initialValues.subjects ?? "");
  const [requester, setRequester] = useState(initialValues.requester ?? "");
  const [logo, setLogo] = useState(initialValues.logo ?? "");
  const [musicStyle, setMusicStyle] = useState(initialValues.musicStyle ?? "");
  const [tone, setTone] = useState(initialValues.tone ?? "");
  const [extraNotes, setExtraNotes] = useState(initialValues.extraNotes ?? "");
  const [scriptLinks, setScriptLinks] = useState(initialValues.scriptLinks ?? "");

  const remaining = Math.max(0, totalMinutes - _bookedMinutes);
  const maxDuration = isExtra ? undefined : (remaining > 0 ? remaining : undefined);

  const steps = [
    {
      title: "Sobre a gravação",
      description: "Conte o básico para reservarmos o tempo certo na agenda do videomaker.",
      valid:
        durationMin >= 5 &&
        videoCount >= 1 &&
        (maxDuration === undefined || durationMin <= maxDuration),
    },
    {
      title: "Conteúdo do vídeo",
      description: "Qual o tema e quem aparecerá nas gravações?",
      valid: theme.trim().length > 0 && subjects.trim().length > 0,
    },
    {
      title: "Identidade visual",
      description: "Quem está solicitando e qual identidade visual usar.",
      valid: requester.trim().length > 0 && logo.trim().length > 0,
    },
    {
      title: "Trilha e tom do vídeo",
      description: "Ajuda a equipe de edição a acertar o clima do material.",
      valid: musicStyle.trim().length > 0 && tone.trim().length > 0,
    },
    {
      title: "Observações finais",
      description: "Algo específico sobre vinheta, cortes, inserção de nomes, etc.? (opcional)",
      valid: true,
    },
    {
      title: "Roteiro e revisão",
      description: "O link do roteiro é obrigatório para concluir a solicitação.",
      valid: scriptLinks.trim().length > 0,
    },
  ];

  const isLast = step === steps.length - 1;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-6">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-laranja" : "bg-[#ece3d8]"}`}
          />
        ))}
      </div>

      <div className="mb-1 text-xs font-semibold text-laranja uppercase tracking-wide">
        Etapa {step + 1} de {steps.length}
      </div>
      <h2 className="font-display text-xl text-preto mb-1">{steps[step].title}</h2>
      <p className="text-sm text-[#7a716a] mb-6">{steps[step].description}</p>

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="weekDate" value={weekDate} />
        {bookingId && <input type="hidden" name="bookingId" value={bookingId} />}

        {/* Etapa 0 */}
        <div className={step === 0 ? "flex flex-col gap-5" : "hidden"}>
          <div>
            <label className="block text-sm font-semibold text-preto mb-2">
              Quantos vídeos serão gravados nesta sessão?
            </label>
            <input
              type="number"
              name="videoCount"
              min={1}
              value={videoCount}
              onChange={(e) => setVideoCount(Math.max(1, Number(e.target.value) || 1))}
              className="w-32 rounded-xl border border-[#ece3d8] px-4 py-2.5 focus:border-laranja focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-preto mb-2">
              Duração estimada da gravação (minutos)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {DURATION_SUGESTOES.map((d) => {
                const disabled = maxDuration !== undefined && d > maxDuration;
                return (
                  <button
                    type="button"
                    key={d}
                    disabled={disabled}
                    onClick={() => setDurationMin(d)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold border transition-colors ${
                      disabled
                        ? "border-[#ece3d8] text-[#c9c0b8] cursor-not-allowed"
                        : durationMin === d
                        ? "bg-laranja text-white border-laranja"
                        : "border-[#ece3d8] text-preto hover:bg-bege"
                    }`}
                  >
                    {d} min
                  </button>
                );
              })}
            </div>
            <input
              type="number"
              name="durationMin"
              min={5}
              max={maxDuration}
              step={5}
              value={durationMin}
              onChange={(e) => {
                const val = Math.max(5, Number(e.target.value) || 5);
                setDurationMin(maxDuration !== undefined ? Math.min(val, maxDuration) : val);
              }}
              className="w-32 rounded-xl border border-[#ece3d8] px-4 py-2.5 focus:border-laranja focus:outline-none"
            />
          </div>

          {!isExtra && remaining > 0 && (
            <div className="rounded-xl bg-bege px-4 py-3 text-sm text-[#5b534d]">
              <p>Tempo disponível na semana: <strong>{remaining} min</strong></p>
              <p className="mt-1 text-xs">O administrador confirma e organiza o horário definitivo.</p>
              {durationMin > remaining && (
                <p className="mt-1 text-xs font-semibold text-vermelho">
                  Só restam {remaining} min nesta semana — reduza a duração.
                </p>
              )}
            </div>
          )}
          {!isExtra && remaining <= 0 && totalMinutes > 0 && (
            <div className="rounded-xl bg-[#fde6e0] border border-[#f7c6bb] px-4 py-3 text-sm text-vermelho">
              Não há mais tempo disponível nesta semana. Escolha outra data.
            </div>
          )}
        </div>

        {/* Etapa 1 */}
        <div className={step === 1 ? "flex flex-col gap-5" : "hidden"}>
          <div>
            <label className="block text-sm font-semibold text-preto mb-2">
              Tema / assunto principal
            </label>
            <input
              type="text"
              name="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex.: Apresentação do curso de CPA"
              className="w-full rounded-xl border border-[#ece3d8] px-4 py-2.5 focus:border-laranja focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-preto mb-2">
              Quem será gravado?
            </label>
            <textarea
              name="subjects"
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              placeholder="Nomes e cargos das pessoas que aparecerão no vídeo"
              rows={3}
              className="w-full rounded-xl border border-[#ece3d8] px-4 py-2.5 focus:border-laranja focus:outline-none"
            />
          </div>
        </div>

        {/* Etapa 2 */}
        <div className={step === 2 ? "flex flex-col gap-5" : "hidden"}>
          <div>
            <label className="block text-sm font-semibold text-preto mb-2">
              Quem está solicitando esta gravação?
            </label>
            <input
              type="text"
              name="requester"
              value={requester}
              onChange={(e) => setRequester(e.target.value)}
              placeholder="Seu nome ou setor"
              className="w-full rounded-xl border border-[#ece3d8] px-4 py-2.5 focus:border-laranja focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-preto mb-2">
              Qual logo/identidade visual deve ser usada?
            </label>
            <input
              type="text"
              name="logo"
              list="logo-options"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="Selecione ou digite"
              className="w-full rounded-xl border border-[#ece3d8] px-4 py-2.5 focus:border-laranja focus:outline-none"
            />
            <datalist id="logo-options">
              {LOGO_OPTIONS.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Etapa 3 */}
        <div className={step === 3 ? "flex flex-col gap-5" : "hidden"}>
          <div>
            <label className="block text-sm font-semibold text-preto mb-2">
              Estilo de trilha sonora
            </label>
            <input
              type="text"
              name="musicStyle"
              list="music-options"
              value={musicStyle}
              onChange={(e) => setMusicStyle(e.target.value)}
              placeholder="Selecione ou digite"
              className="w-full rounded-xl border border-[#ece3d8] px-4 py-2.5 focus:border-laranja focus:outline-none"
            />
            <datalist id="music-options">
              {MUSIC_OPTIONS.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-semibold text-preto mb-2">
              Tom do vídeo
            </label>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setTone(opt)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold border transition-colors ${
                    tone === opt
                      ? "bg-laranja text-white border-laranja"
                      : "border-[#ece3d8] text-preto hover:bg-bege"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <input type="hidden" name="tone" value={tone} />
          </div>
        </div>

        {/* Etapa 4 */}
        <div className={step === 4 ? "flex flex-col gap-5" : "hidden"}>
          <div>
            <label className="block text-sm font-semibold text-preto mb-2">
              Observações extras
            </label>
            <textarea
              name="extraNotes"
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="Vinheta de abertura/encerramento, cortes específicos, inserção de nomes/cargos na tela, formato (vertical/horizontal), prazo de entrega etc."
              rows={4}
              className="w-full rounded-xl border border-[#ece3d8] px-4 py-2.5 focus:border-laranja focus:outline-none"
            />
          </div>
        </div>

        {/* Etapa 5 */}
        <div className={step === 5 ? "flex flex-col gap-5" : "hidden"}>
          <div>
            <label className="block text-sm font-semibold text-preto mb-2">
              Link do roteiro <span className="text-vermelho">*</span>
            </label>
            <input
              type="url"
              name="scriptLinks"
              value={scriptLinks}
              onChange={(e) => setScriptLinks(e.target.value)}
              placeholder="https://docs.google.com/..."
              className="w-full rounded-xl border border-[#ece3d8] px-4 py-2.5 focus:border-laranja focus:outline-none"
            />
            <p className="mt-1 text-xs text-[#7a716a]">
              Obrigatório. A reserva não pode ser concluída sem o roteiro.
            </p>
          </div>

          <div className="rounded-xl border border-[#ece3d8] p-4 text-sm text-[#5b534d]">
            <p className="font-semibold text-preto mb-2">Resumo</p>
            <p>Vídeos: {videoCount} · Duração: {durationMin} min</p>
            <p>Tema: {theme || "—"}</p>
            <p>Quem grava: {subjects || "—"}</p>
            <p>Solicitante: {requester || "—"} · Logo: {logo || "—"}</p>
            <p>Trilha: {musicStyle || "—"} · Tom: {tone || "—"}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Voltar
          </Button>

          {isLast ? (
            <SubmitButton label={submitLabel} disabled={!steps[step].valid} />
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              disabled={!steps[step].valid}
            >
              Avançar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function SubmitButton({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={disabled || pending}>
      {pending ? "Enviando..." : label}
    </Button>
  );
}
