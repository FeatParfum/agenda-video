import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getOrCreateWeek } from "@/lib/db";
import { formatDateFull } from "@/lib/scheduling";
import { createExtraBookingAction } from "@/app/actions";
import { Card, PageHeader } from "@/components/ui";
import BriefingWizard from "@/components/BriefingWizard";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function NovaGravacaoExtraPage({ params }: { params: Promise<{ data: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { data } = await params;
  if (!ISO_DATE.test(data)) notFound();

  const week = await getOrCreateWeek(data);

  return (
    <div className="mx-auto max-w-2xl w-full px-4 sm:px-6 py-8 sm:py-12">
      <p className="text-sm mb-2">
        <Link href="/minhas-reservas" className="text-laranja font-semibold hover:underline">
          ← Minhas reservas
        </Link>
      </p>
      <PageHeader
        title="Registrar vídeo extra gravado"
        subtitle={`Briefing para um vídeo extra gravado em ${formatDateFull(data)}, fora do planejamento original.`}
      />

      <Card className="p-5 sm:p-8">
        <BriefingWizard
          action={createExtraBookingAction}
          weekDate={data}
          startTime={week.start_time}
          bookedMinutes={0}
          totalMinutes={0}
          isExtra
          submitLabel="Registrar vídeo extra"
        />
      </Card>
    </div>
  );
}
