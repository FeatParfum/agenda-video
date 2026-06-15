import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getOrCreateWeek, listBookingsForWeek } from "@/lib/db";
import {
  isBookingOpen,
  recordingHappened,
  bookingDeadline,
  windowDurationMinutes,
  totalBookedMinutes,
  formatDateFull,
} from "@/lib/scheduling";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import CancelBookingButton from "@/components/CancelBookingButton";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function WeekDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ data: string }>;
  searchParams: Promise<{ reservado?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { data } = await params;
  if (!ISO_DATE.test(data)) notFound();
  const { reservado } = await searchParams;

  const week = await getOrCreateWeek(data);
  const bookings = await listBookingsForWeek(week.id);
  const total = windowDurationMinutes(week.start_time, week.end_time);
  const booked = totalBookedMinutes(bookings.map((b) => ({ durationMin: b.duration_min })));
  const remaining = Math.max(0, total - booked);

  const open = isBookingOpen(data);
  const happened = recordingHappened(data);
  const deadline = bookingDeadline(data);
  const canBook = !week.is_blocked && (user.role === "admin" || open);

  return (
    <div className="mx-auto max-w-3xl w-full px-4 sm:px-6 py-8 sm:py-12">
      <p className="text-sm">
        <Link href="/" className="text-laranja font-semibold hover:underline">
          ← Voltar ao calendário
        </Link>
      </p>

      <PageHeader
        title={formatDateFull(data)}
        subtitle={`Janela de gravação: ${week.start_time} às ${week.end_time}`}
        actions={
          week.is_blocked ? (
            <Badge tone="danger">Bloqueada</Badge>
          ) : happened ? (
            <Badge tone="neutral">Gravação já realizada</Badge>
          ) : open ? (
            <Badge tone="success">Agendamento aberto</Badge>
          ) : (
            <Badge tone="warning">Agendamento encerrado</Badge>
          )
        }
      />

      {reservado && (
        <div className="mb-6 rounded-xl bg-[#e4f3e6] border border-[#bfe6c6] px-4 py-3 text-sm text-[#1f7a32]">
          Reserva enviada com sucesso! O administrador irá organizar o horário definitivo até segunda-feira.
        </div>
      )}

      {week.is_blocked && (
        <Card className="p-5 mb-6 bg-[#fde6e0] border-[#f7c6bb]">
          <p className="font-semibold text-vermelho">Nathan indisponível nesta semana.</p>
          {week.block_reason && <p className="text-sm text-[#7a716a] mt-1">{week.block_reason}</p>}
        </Card>
      )}

      {!week.is_blocked && (
        <Card className="p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <p className="text-[#7a716a]">Tempo reservado</p>
              <p className="font-display text-xl text-preto">{booked} / {total} min</p>
            </div>
            <div className="text-right">
              <p className="text-[#7a716a]">Tempo disponível</p>
              <p className="font-display text-xl text-preto">{remaining} min</p>
            </div>
          </div>
          {!happened && (
            <p className="mt-3 text-xs text-[#7a716a]">
              Agendamentos e alterações para esta terça podem ser feitos até{" "}
              <strong>segunda-feira, {deadline.toLocaleDateString("pt-BR")} às 12h</strong>.
            </p>
          )}
        </Card>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg text-preto">Reservas desta semana</h2>
        {canBook && (
          <LinkButton href={`/terca/${data}/agendar`} variant="primary">
            Solicitar gravação
          </LinkButton>
        )}
      </div>

      {bookings.length === 0 ? (
        <Card className="p-6 text-center text-sm text-[#7a716a]">
          Nenhuma reserva ainda para esta semana.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((b, idx) => (
            <Card key={b.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-preto">
                    {idx + 1}. {b.team_member_name}
                    {b.is_extra ? <span className="ml-2 text-xs font-normal text-laranja">extra</span> : null}
                  </p>
                  <p className="text-sm text-[#7a716a] mt-0.5">
                    {b.briefing?.theme} · {b.duration_min} min
                  </p>
                </div>
                <div className="text-right">
                  {b.start_time && b.end_time ? (
                    <p className="font-display text-base text-preto">{b.start_time} – {b.end_time}</p>
                  ) : (
                    <Badge tone="warning">Horário a definir</Badge>
                  )}
                  <p className="text-xs text-[#7a716a] mt-1 capitalize">{b.status}</p>
                </div>
              </div>
              {b.briefing?.subjects && (
                <p className="text-xs text-[#7a716a] mt-2">Quem grava: {b.briefing.subjects}</p>
              )}
              {b.video_link && (
                <a
                  href={b.video_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-2 text-sm font-semibold text-laranja hover:underline"
                >
                  Ver vídeo editado →
                </a>
              )}

              {(user.role === "admin" || (b.team_member_id === user.id && !happened)) && (
                <div className="mt-2">
                  <CancelBookingButton
                    bookingId={b.id}
                    redirectTo={`/terca/${data}`}
                    label={user.role === "admin" && b.team_member_id !== user.id ? "Remover reserva" : "Cancelar reserva"}
                    confirmMessage={
                      user.role === "admin" && b.team_member_id !== user.id
                        ? `Remover a reserva de ${b.team_member_name}? Essa ação não pode ser desfeita.`
                        : "Tem certeza que deseja cancelar esta reserva? Essa ação não pode ser desfeita."
                    }
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {user.role === "admin" && (
        <div className="mt-6">
          <LinkButton href={`/admin/terca/${data}`} variant="secondary">
            Gerenciar esta semana (admin)
          </LinkButton>
        </div>
      )}
    </div>
  );
}
