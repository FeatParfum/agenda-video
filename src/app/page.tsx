import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getWeeksBookedMinutes } from "@/lib/db";
import {
  getWednesdaysOfMonth,
  isBookingOpen,
  recordingHappened,
  formatDateFull,
  MONTH_NAMES,
} from "@/lib/scheduling";
import { Badge, Card, PageHeader } from "@/components/ui";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const now = new Date();
  const year = Number(params.ano) || now.getFullYear();
  const month = Number(params.mes) || now.getMonth() + 1;

  const wednesdays = getWednesdaysOfMonth(year, month);
  const summaries = await getWeeksBookedMinutes(wednesdays);

  let prevYear = year, prevMonth = month - 1;
  if (prevMonth < 1) { prevMonth = 12; prevYear -= 1; }
  let nextYear = year, nextMonth = month + 1;
  if (nextMonth > 12) { nextMonth = 1; nextYear += 1; }

  return (
    <div className="mx-auto max-w-5xl w-full px-4 sm:px-6 py-8 sm:py-12">
      <PageHeader
        title="Calendário de gravações"
        subtitle="O videomaker grava às quartas-feiras, das 13:30 às 18:00."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/?ano=${prevYear}&mes=${prevMonth}`}
              className="rounded-xl border border-[#ece3d8] px-3 py-2 text-sm font-semibold hover:bg-bege"
            >
              ← {MONTH_NAMES[prevMonth - 1]}
            </Link>
            <span className="font-display text-lg px-2">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <Link
              href={`/?ano=${nextYear}&mes=${nextMonth}`}
              className="rounded-xl border border-[#ece3d8] px-3 py-2 text-sm font-semibold hover:bg-bege"
            >
              {MONTH_NAMES[nextMonth - 1]} →
            </Link>
          </div>
        }
      />

      {wednesdays.length === 0 ? (
        <p className="text-sm text-[#7a716a]">Não há quartas-feiras neste mês.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wednesdays.map((date) => {
            const summary = summaries[date];
            const open = isBookingOpen(date);
            const happened = recordingHappened(date);
            const remaining = Math.max(0, summary.total - summary.booked);

            let badge: { tone: "neutral" | "success" | "warning" | "danger" | "info"; label: string };
            if (summary.blocked) {
              badge = { tone: "danger", label: "Bloqueada" };
            } else if (happened) {
              badge = { tone: "neutral", label: "Já realizada" };
            } else if (!open) {
              badge = { tone: "warning", label: "Encerrada p/ agendamento" };
            } else if (remaining <= 0) {
              badge = { tone: "warning", label: "Sem horários livres" };
            } else {
              badge = { tone: "success", label: "Disponível" };
            }

            return (
              <Link key={date} href={`/quarta/${date}`} className="block">
                <Card className="p-5 h-full hover:border-laranja transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-lg text-preto leading-tight">
                        {formatDateFull(date).split(",")[1]?.trim()}
                      </p>
                      <p className="text-xs text-[#7a716a] capitalize mt-0.5">
                        {formatDateFull(date).split(",")[0]}
                      </p>
                    </div>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </div>

                  {!summary.blocked && (
                    <div className="mt-4 text-sm text-[#5b534d]">
                      <p>
                        {summary.count} reserva{summary.count === 1 ? "" : "s"} ·{" "}
                        {summary.booked} min reservados
                      </p>
                      <p className="mt-1">
                        {remaining > 0
                          ? `${remaining} min disponíveis`
                          : "Sem tempo livre"}
                      </p>
                    </div>
                  )}
                  {summary.blocked && (
                    <p className="mt-4 text-sm text-[#5b534d]">
                      Videomaker indisponível nesta semana.
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
