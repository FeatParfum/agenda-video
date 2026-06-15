import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getOrCreateWeek, listBookingsForWeek } from "@/lib/db";
import { windowDurationMinutes, totalBookedMinutes, formatDateFull } from "@/lib/scheduling";
import { toggleBlockWeekAction } from "@/app/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import ReorderList from "@/components/ReorderList";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminWeekPage({ params }: { params: Promise<{ data: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const { data } = await params;
  if (!ISO_DATE.test(data)) notFound();

  const week = await getOrCreateWeek(data);
  const bookings = await listBookingsForWeek(week.id);
  const total = windowDurationMinutes(week.start_time, week.end_time);
  const booked = totalBookedMinutes(bookings.map((b) => ({ durationMin: b.duration_min })));

  return (
    <div className="mx-auto max-w-3xl w-full px-4 sm:px-6 py-8 sm:py-12">
      <p className="text-sm mb-2">
        <Link href="/admin" className="text-laranja font-semibold hover:underline">
          ← Painel admin
        </Link>
      </p>

      <PageHeader
        title={formatDateFull(data)}
        subtitle={`Janela: ${week.start_time} às ${week.end_time} · ${booked}/${total} min reservados`}
        actions={week.is_blocked ? <Badge tone="danger">Bloqueada</Badge> : <Badge tone="success">Disponível</Badge>}
      />

      <Card className="p-4 sm:p-5 mb-6">
        <form action={toggleBlockWeekAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="weekDate" value={data} />
          <input type="hidden" name="blocked" value={week.is_blocked ? "" : "on"} />
          {!week.is_blocked && (
            <input
              type="text"
              name="reason"
              placeholder="Motivo do bloqueio (opcional)"
              className="flex-1 min-w-[180px] rounded-lg border border-[#ece3d8] px-3 py-2 text-sm focus:border-laranja focus:outline-none"
            />
          )}
          <Button type="submit" variant={week.is_blocked ? "secondary" : "danger"}>
            {week.is_blocked ? "Desbloquear semana" : "Bloquear semana"}
          </Button>
          {week.is_blocked && week.block_reason && (
            <span className="text-sm text-[#7a716a]">Motivo: {week.block_reason}</span>
          )}
        </form>
      </Card>

      <h2 className="font-display text-lg text-preto mb-3">Reservas e ordem de gravação</h2>
      <ReorderList bookings={bookings} weekId={week.id} weekDate={data} startTime={week.start_time} />

      <p className="text-sm mt-6">
        <Link href={`/quarta/${data}`} className="text-laranja font-semibold hover:underline">
          Ver como os usuários veem esta semana →
        </Link>
      </p>
    </div>
  );
}
