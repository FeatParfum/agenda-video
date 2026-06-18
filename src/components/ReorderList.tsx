"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Booking } from "@/lib/db";
import { computeSchedule } from "@/lib/scheduling";
import { Badge, Button } from "@/components/ui";
import { reorderAction, setVideoLinkAction } from "@/app/actions";
import CancelBookingButton from "@/components/CancelBookingButton";

export default function ReorderList({
  bookings,
  weekId,
  weekDate,
  startTime,
}: {
  bookings: Booking[];
  weekId: string;
  weekDate: string;
  startTime: string;
}) {
  const [items, setItems] = useState(bookings);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setItems(bookings);
  }, [bookings]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const preview = useMemo(
    () =>
      computeSchedule(
        items.map((b) => ({ id: b.id, durationMin: b.duration_min })),
        startTime
      ),
    [items, startTime]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((current) => {
      const oldIndex = current.findIndex((i) => i.id === active.id);
      const newIndex = current.findIndex((i) => i.id === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await reorderAction(weekId, weekDate, items.map((i) => i.id));
      setSaved(true);
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-[#7a716a]">Nenhuma reserva para esta semana.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-[#7a716a]">
          Arraste para reorganizar a ordem. Os horários são recalculados automaticamente a
          partir das {startTime}.
        </p>
        <Button onClick={handleSave} disabled={isPending} variant="primary" className="text-sm shrink-0">
          {isPending ? "Salvando..." : "Salvar ordem e horários"}
        </Button>
      </div>
      {saved && (
        <p className="mb-3 text-sm text-[#1f7a32] bg-[#e4f3e6] border border-[#bfe6c6] rounded-lg px-3 py-2">
          Ordem salva! Horários confirmados.
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {items.map((booking, idx) => (
              <SortableItem
                key={booking.id}
                booking={booking}
                index={idx}
                schedule={preview[idx]}
                weekDate={weekDate}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableItem({
  booking,
  index,
  schedule,
  weekDate,
}: {
  booking: Booking;
  index: number;
  schedule: { startTime: string; endTime: string };
  weekDate: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: booking.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-2xl border border-[#ece3d8] bg-white shadow-sm p-4"
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="mt-1 cursor-grab select-none rounded-lg border border-[#ece3d8] px-2 py-1 text-[#a39a92] hover:bg-bege active:cursor-grabbing"
          aria-label="Arrastar para reordenar"
        >
          ⠿
        </button>

        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-preto">
                {index + 1}. {booking.team_member_name}
                {booking.is_extra ? <span className="ml-2 text-xs font-normal text-laranja">extra</span> : null}
              </p>
              <p className="text-sm text-[#7a716a] mt-0.5">
                {booking.briefing?.theme} · {booking.duration_min} min
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-base text-preto">
                {schedule.startTime} – {schedule.endTime}
              </p>
              <p className="text-xs text-[#7a716a] mt-1 capitalize">{booking.status}</p>
            </div>
          </div>

          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-laranja font-semibold">Ver briefing completo</summary>
            {booking.briefing && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#5b534d]">
                <p><strong>Vídeos:</strong> {booking.briefing.video_count}</p>
                <p><strong>Tema:</strong> {booking.briefing.theme}</p>
                <p className="sm:col-span-2"><strong>Quem grava:</strong> {booking.briefing.subjects}</p>
                <p><strong>Solicitante:</strong> {booking.briefing.requester}</p>
                <p><strong>Logo:</strong> {booking.briefing.logo}</p>
                <p><strong>Trilha:</strong> {booking.briefing.music_style}</p>
                <p><strong>Tom:</strong> {booking.briefing.tone}</p>
                {booking.briefing.extra_notes && (
                  <p className="sm:col-span-2"><strong>Observações:</strong> {booking.briefing.extra_notes}</p>
                )}
                <p className="sm:col-span-2">
                  <strong>Roteiro:</strong>{" "}
                  <a href={booking.briefing.script_links} target="_blank" rel="noreferrer" className="text-laranja hover:underline break-all">
                    {booking.briefing.script_links}
                  </a>
                </p>
              </div>
            )}
            {booking.report && (
              <div className="mt-2 rounded-lg bg-bege px-3 py-2">
                <p className="font-semibold text-preto">
                  Relatório: {booking.report.all_recorded ? <Badge tone="success">Tudo gravado</Badge> : <Badge tone="warning">Pendências</Badge>}
                </p>
                {booking.report.notes && <p className="mt-1 text-[#5b534d]">{booking.report.notes}</p>}
              </div>
            )}
          </details>

          <form action={setVideoLinkAction} className="mt-3 flex flex-wrap gap-2 items-center">
            <input type="hidden" name="bookingId" value={booking.id} />
            <input type="hidden" name="weekDate" value={weekDate} />
            <input
              type="url"
              name="videoLink"
              defaultValue={booking.video_link ?? ""}
              placeholder="Link do vídeo editado"
              className="flex-1 min-w-[180px] rounded-lg border border-[#ece3d8] px-3 py-1.5 text-sm focus:border-laranja focus:outline-none"
            />
            <Button type="submit" variant="secondary" className="text-xs px-3 py-1.5">
              Salvar link
            </Button>
          </form>

          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <Link
              href={`/segunda/${weekDate}/editar/${booking.id}`}
              className="inline-flex items-center rounded-xl border border-laranja px-3 py-1.5 text-xs font-semibold text-laranja hover:bg-[#fff5ec] transition-colors"
            >
              ✏️ Editar reserva
            </Link>
            <CancelBookingButton
              bookingId={booking.id}
              redirectTo={`/admin/segunda/${weekDate}`}
              label="Remover reserva"
              confirmMessage={`Remover a reserva de ${booking.team_member_name}? Essa ação não pode ser desfeita.`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
