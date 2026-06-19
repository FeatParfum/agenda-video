import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBookingById, getOrCreateWeek, listBookingsForWeek } from "@/lib/db";
import {
  isAdminBookingOpen,
  isBookingOpen,
  windowDurationMinutes,
  totalBookedMinutes,
  formatDateFull,
} from "@/lib/scheduling";
import { updateBookingAction } from "@/app/actions";
import { Card, PageHeader } from "@/components/ui";
import BriefingWizard from "@/components/BriefingWizard";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function EditarReservaPage({
  params,
}: {
  params: Promise<{ data: string; bookingId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { data, bookingId } = await params;
  if (!ISO_DATE.test(data)) notFound();

  const booking = await getBookingById(bookingId);
  if (!booking) notFound();

  // Apenas o dono (ou admin) pode editar
  const isOwner = booking.team_member_id === user.id;
  if (!isOwner && user.role !== "admin") redirect(`/segunda/${data}`);

  const week = await getOrCreateWeek(data);
  const allBookings = await listBookingsForWeek(week.id);
  const total = windowDurationMinutes(week.start_time, week.end_time);
  // Exclui a duração da própria reserva sendo editada para calcular o disponível
  const bookedExcludingSelf = allBookings
    .filter((b) => b.id !== bookingId)
    .reduce((acc, b) => acc + b.duration_min, 0);

  const canEdit = user.role === "admin" ? isAdminBookingOpen(data) : isBookingOpen(data);
  if (!canEdit) {
    return (
      <div className="mx-auto max-w-2xl w-full px-4 sm:px-6 py-12">
        <Card className="p-6 text-center">
          <p className="font-semibold text-preto">Prazo de alteração encerrado.</p>
          <p className="text-sm text-[#7a716a] mt-1">
            {user.role === "admin"
              ? "O prazo excepcional do admin (segunda-feira às 12h) já passou."
              : "O prazo para alterar esta semana (sexta-feira às 12h) já passou."}
          </p>
          <Link href={`/segunda/${data}`} className="inline-block mt-4 text-laranja font-semibold hover:underline">
            ← Voltar
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl w-full px-4 sm:px-6 py-8 sm:py-12">
      <p className="text-sm mb-2">
        <Link href={`/segunda/${data}`} className="text-laranja font-semibold hover:underline">
          ← Voltar
        </Link>
      </p>
      <PageHeader title="Editar reserva" subtitle={formatDateFull(data)} />

      <Card className="p-5 sm:p-8">
        <BriefingWizard
          action={updateBookingAction}
          weekDate={data}
          bookingId={bookingId}
          startTime={week.start_time}
          bookedMinutes={bookedExcludingSelf}
          totalMinutes={total}
          submitLabel="Salvar alterações"
          initialValues={{
            videoCount: booking.briefing?.video_count ?? 1,
            durationMin: booking.duration_min,
            theme: booking.briefing?.theme ?? "",
            subjects: booking.briefing?.subjects ?? "",
            requester: booking.briefing?.requester ?? "",
            logo: booking.briefing?.logo ?? "",
            musicStyle: booking.briefing?.music_style ?? "",
            tone: booking.briefing?.tone ?? "",
            extraNotes: booking.briefing?.extra_notes ?? "",
            scriptLinks: booking.briefing?.script_links ?? "",
          }}
        />
      </Card>
    </div>
  );
}
