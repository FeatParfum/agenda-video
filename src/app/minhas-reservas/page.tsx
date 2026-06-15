import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listBookingsForMember } from "@/lib/db";
import { recordingHappened, formatDateFull } from "@/lib/scheduling";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import ReportForm from "@/components/ReportForm";

export default async function MinhasReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ relatorio?: string; extra?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { relatorio, extra } = await searchParams;
  const bookings = await listBookingsForMember(user.id);

  return (
    <div className="mx-auto max-w-3xl w-full px-4 sm:px-6 py-8 sm:py-12">
      <PageHeader title="Minhas reservas" subtitle="Acompanhe suas gravações, links finais e relatórios." />

      {relatorio && (
        <div className="mb-6 rounded-xl bg-[#e4f3e6] border border-[#bfe6c6] px-4 py-3 text-sm text-[#1f7a32]">
          Relatório enviado, obrigado!
        </div>
      )}
      {extra && (
        <div className="mb-6 rounded-xl bg-[#e4f3e6] border border-[#bfe6c6] px-4 py-3 text-sm text-[#1f7a32]">
          Vídeo extra registrado. O administrador irá organizar o horário.
        </div>
      )}

      {bookings.length === 0 ? (
        <Card className="p-6 text-center text-sm text-[#7a716a]">
          Você ainda não tem reservas. <Link href="/" className="text-laranja font-semibold hover:underline">Ver calendário</Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((b) => {
            const happened = recordingHappened(b.weekDate);
            return (
              <Card key={b.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link href={`/quarta/${b.weekDate}`} className="font-semibold text-preto hover:text-laranja capitalize">
                      {formatDateFull(b.weekDate)}
                    </Link>
                    <p className="text-sm text-[#7a716a] mt-0.5">
                      {b.briefing?.theme} · {b.duration_min} min
                      {b.is_extra ? <span className="ml-2 text-xs text-laranja">extra</span> : null}
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

                {happened && !b.report && <ReportForm bookingId={b.id} />}

                {happened && b.report && (
                  <div className="mt-3 rounded-xl bg-bege px-4 py-3 text-sm">
                    <p className="font-semibold text-preto">
                      Relatório enviado:{" "}
                      {b.report.all_recorded ? (
                        <Badge tone="success">Tudo gravado</Badge>
                      ) : (
                        <Badge tone="warning">Houve pendências</Badge>
                      )}
                    </p>
                    {b.report.notes && <p className="mt-1 text-[#5b534d]">{b.report.notes}</p>}
                  </div>
                )}

                {happened && (
                  <div className="mt-3">
                    <LinkButton href={`/quarta/${b.weekDate}/agendar-extra`} variant="ghost" className="text-xs px-3 py-1.5">
                      Registrar vídeo extra gravado nesta sessão
                    </LinkButton>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
