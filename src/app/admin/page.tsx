import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getWeeksBookedMinutes, listTeamMembers } from "@/lib/db";
import { getUpcomingTuesdays, isBookingOpen, recordingHappened, formatDateFull } from "@/lib/scheduling";
import {
  addTeamMemberAction,
  toggleBlockWeekAction,
  toggleMemberActiveAction,
  toggleMemberRoleAction,
} from "@/app/actions";
import { Badge, Button, Card, LinkButton, PageHeader } from "@/components/ui";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const tuesdays = getUpcomingTuesdays(8);
  const summaries = await getWeeksBookedMinutes(tuesdays);
  const members = await listTeamMembers(false);

  return (
    <div className="mx-auto max-w-4xl w-full px-4 sm:px-6 py-8 sm:py-12">
      <PageHeader
        title="Painel do administrador"
        subtitle="Organize os horários, bloqueie semanas e gerencie a equipe."
      />

      <h2 className="font-display text-lg text-preto mb-3">Próximas semanas</h2>
      <div className="flex flex-col gap-3 mb-10">
        {tuesdays.map((date) => {
          const summary = summaries[date];
          const open = isBookingOpen(date);
          const happened = recordingHappened(date);

          let badge: { tone: "neutral" | "success" | "warning" | "danger" | "info"; label: string };
          if (summary.blocked) badge = { tone: "danger", label: "Bloqueada" };
          else if (happened) badge = { tone: "neutral", label: "Já realizada" };
          else if (!open) badge = { tone: "warning", label: "Encerrada p/ agendamento" };
          else badge = { tone: "success", label: "Agendamento aberto" };

          return (
            <Card key={date} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-preto capitalize">{formatDateFull(date)}</p>
                  <p className="text-sm text-[#7a716a] mt-0.5">
                    {summary.count} reserva{summary.count === 1 ? "" : "s"} · {summary.booked}/{summary.total} min
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                  <LinkButton href={`/admin/terca/${date}`} variant="secondary">
                    Gerenciar
                  </LinkButton>
                </div>
              </div>

              <form action={toggleBlockWeekAction} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="weekDate" value={date} />
                <input type="hidden" name="blocked" value={summary.blocked ? "" : "on"} />
                {!summary.blocked && (
                  <input
                    type="text"
                    name="reason"
                    placeholder="Motivo do bloqueio (opcional)"
                    className="rounded-lg border border-[#ece3d8] px-3 py-1.5 text-sm flex-1 min-w-[180px] focus:border-laranja focus:outline-none"
                  />
                )}
                <Button type="submit" variant={summary.blocked ? "secondary" : "ghost"} className="text-xs px-3 py-1.5">
                  {summary.blocked ? "Desbloquear semana" : "Bloquear semana"}
                </Button>
              </form>
            </Card>
          );
        })}
      </div>

      <h2 className="font-display text-lg text-preto mb-3">Equipe</h2>
      <Card className="p-4 sm:p-5 mb-4">
        <form action={addTeamMemberAction} className="flex gap-2">
          <input
            type="text"
            name="name"
            placeholder="Nome da nova pessoa"
            required
            className="flex-1 rounded-lg border border-[#ece3d8] px-3 py-2 text-sm focus:border-laranja focus:outline-none"
          />
          <Button type="submit" variant="primary" className="text-sm px-4 py-2">
            Adicionar
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-2">
        {members.map((m) => (
          <Card key={m.id} className="p-3 sm:p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-preto">
                {m.name}
                {m.role === "admin" && <span className="ml-2 text-xs font-normal text-laranja">admin</span>}
                {!m.active && <span className="ml-2 text-xs font-normal text-vermelho">inativo</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <form action={toggleMemberRoleAction}>
                <input type="hidden" name="id" value={m.id} />
                <Button type="submit" variant="ghost" className="text-xs px-3 py-1.5">
                  {m.role === "admin" ? "Remover admin" : "Tornar admin"}
                </Button>
              </form>
              <form action={toggleMemberActiveAction}>
                <input type="hidden" name="id" value={m.id} />
                <Button type="submit" variant={m.active ? "ghost" : "secondary"} className="text-xs px-3 py-1.5">
                  {m.active ? "Desativar" : "Reativar"}
                </Button>
              </form>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-sm mt-8">
        <Link href="/" className="text-laranja font-semibold hover:underline">
          ← Voltar ao calendário
        </Link>
      </p>
    </div>
  );
}
