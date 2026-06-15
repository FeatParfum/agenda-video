import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getOrCreateWeek, listBookingsForWeek } from "@/lib/db";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function csvEscape(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(_req: Request, { params }: { params: Promise<{ data: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return new NextResponse("Não autorizado.", { status: 403 });
  }

  const { data } = await params;
  if (!ISO_DATE.test(data)) {
    return new NextResponse("Data inválida.", { status: 400 });
  }

  const week = await getOrCreateWeek(data);
  const bookings = await listBookingsForWeek(week.id);

  const header = [
    "Ordem",
    "Horário início",
    "Horário fim",
    "Pessoa",
    "Status",
    "Vídeos",
    "Tema",
    "Quem grava",
    "Solicitante",
    "Logo",
    "Trilha sonora",
    "Tom",
    "Observações",
    "Link do roteiro",
  ];

  const rows = bookings.map((b, idx) => [
    String(idx + 1),
    b.start_time ?? b.suggested_time ?? "",
    b.end_time ?? "",
    b.team_member_name ?? "",
    b.status,
    b.briefing?.video_count ?? "",
    b.briefing?.theme ?? "",
    b.briefing?.subjects ?? "",
    b.briefing?.requester ?? "",
    b.briefing?.logo ?? "",
    b.briefing?.music_style ?? "",
    b.briefing?.tone ?? "",
    b.briefing?.extra_notes ?? "",
    b.briefing?.script_links ?? "",
  ]);

  const lines = [header, ...rows].map((cols) => cols.map(csvEscape).join(";"));
  const csv = "﻿" + lines.join("\r\n") + "\r\n";

  const filename = `gravacoes-${data}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
