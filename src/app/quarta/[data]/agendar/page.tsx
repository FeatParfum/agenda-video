import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getOrCreateWeek, listBookingsForWeek } from "@/lib/db";
import { isBookingOpen, windowDurationMinutes, totalBookedMinutes, formatDateFull } from "@/lib/scheduling";
import { createBookingAction } from "@/app/actions";
import { Card, PageHeader } from "@/components/ui";
import BriefingWizard from "@/components/BriefingWizard";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function NovaReservaPage({ params }: { params: Promise<{ data: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { data } = await params;
  if (!ISO_DATE.test(data)) notFound();

  const week = await getOrCreateWeek(data);
  const bookings = await listBookingsForWeek(week.id);
  const total = windowDurationMinutes(week.start_time, week.end_time);
  const booked = totalBookedMinutes(bookings.map((b) => ({ durationMin: b.duration_min })));

  const canBook = !week.is_blocked && (user.role === "admin" || isBookingOpen(data));
  if (!canBook) {
    return (
      <div className="mx-auto max-w-2xl w-full px-4 sm:px-6 py-12">
        <Card className="p-6 text-center">
          <p className="font-semibold text-preto">Não é possível agendar para esta semana.</p>
          <p className="text-sm text-[#7a716a] mt-1">
            {week.is_blocked
              ? "O videomaker está indisponível nesta semana."
              : "O prazo de agendamento (segunda-feira às 12h) já encerrou."}
          </p>
          <Link href={`/quarta/${data}`} className="inline-block mt-4 text-laranja font-semibold hover:underline">
            ← Voltar
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl w-full px-4 sm:px-6 py-8 sm:py-12">
      <p className="text-sm mb-2">
        <Link href={`/quarta/${data}`} className="text-laranja font-semibold hover:underline">
          ← Voltar
        </Link>
      </p>
      <PageHeader title="Solicitar gravação" subtitle={formatDateFull(data)} />

      <Card className="p-5 sm:p-8">
        <BriefingWizard
          action={createBookingAction}
          weekDate={data}
          startTime={week.start_time}
          bookedMinutes={booked}
          totalMinutes={total}
        />
      </Card>
    </div>
  );
}
