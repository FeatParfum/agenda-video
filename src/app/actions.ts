"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE } from "@/lib/constants";
import { requireAdmin, requireUser } from "@/lib/session";
import { isAdminBookingOpen, isBookingOpen, recordingHappened } from "@/lib/scheduling";
import {
  createBooking,
  createRecordingReport,
  createTeamMember,
  deleteBooking,
  getBookingById,
  getOrCreateWeek,
  getTeamMemberById,
  getWeekById,
  listBookingsForWeek,
  reorderAndSchedule,
  setBookingVideoLink,
  setTeamMemberActive,
  setTeamMemberRole,
  setWeekBlocked,
  updateBooking,
  TUZUKI_ID,
  type BriefingInput,
} from "@/lib/db";

// ---------- Autenticação ----------

export async function loginAction(formData: FormData) {
  const memberId = String(formData.get("memberId") || "");
  const member = await getTeamMemberById(memberId);
  if (!member || !member.active) {
    redirect("/login?erro=invalido");
  }

  if (member.password) {
    const password = String(formData.get("password") || "");
    if (password !== member.password) {
      redirect(`/login?erro=senha&memberId=${member.id}`);
    }
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, member.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  redirect("/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}

// ---------- Reservas / briefing ----------

function readBriefing(formData: FormData): BriefingInput {
  return {
    videoCount: Math.max(1, Number(formData.get("videoCount") || 1)),
    theme: String(formData.get("theme") || "").trim(),
    subjects: String(formData.get("subjects") || "").trim(),
    requester: String(formData.get("requester") || "").trim(),
    logo: String(formData.get("logo") || "").trim(),
    musicStyle: String(formData.get("musicStyle") || "").trim(),
    tone: String(formData.get("tone") || "").trim(),
    extraNotes: String(formData.get("extraNotes") || "").trim() || undefined,
    scriptLinks: String(formData.get("scriptLinks") || "").trim(),
  };
}

export async function createBookingAction(formData: FormData) {
  const user = await requireUser();
  const weekDate = String(formData.get("weekDate") || "");
  const durationMin = Math.max(5, Number(formData.get("durationMin") || 0));
  const briefing = readBriefing(formData);

  if (!weekDate || !durationMin || !briefing.theme || !briefing.requester || !briefing.scriptLinks) {
    throw new Error("Preencha todos os campos obrigatórios, incluindo o link do roteiro.");
  }

  const week = await getOrCreateWeek(weekDate);
  if (user.role !== "admin") {
    if (week.is_blocked) throw new Error("Esta semana está bloqueada para gravações.");
    if (!isBookingOpen(weekDate)) {
      throw new Error("O prazo para agendar/alterar esta semana já encerrou (sexta-feira às 12h, horário de Brasília).");
    }
  } else if (!isAdminBookingOpen(weekDate)) {
    throw new Error(
      "O prazo excepcional do admin para esta semana já encerrou (segunda-feira às 12h, horário de Brasília)."
    );
  }

  const booking = await createBooking({
    weekDate,
    teamMemberId: user.id,
    durationMin,
    briefing,
  });

  revalidatePath(`/segunda/${weekDate}`);
  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/segunda/${weekDate}?reservado=${booking.id}`);
}

export async function createExtraBookingAction(formData: FormData) {
  const user = await requireUser();
  const weekDate = String(formData.get("weekDate") || "");
  const durationMin = Math.max(5, Number(formData.get("durationMin") || 0));
  const briefing = readBriefing(formData);

  if (!weekDate || !durationMin || !briefing.theme || !briefing.requester || !briefing.scriptLinks) {
    throw new Error("Preencha todos os campos obrigatórios, incluindo o link do roteiro.");
  }

  await createBooking({
    weekDate,
    teamMemberId: user.id,
    durationMin,
    briefing,
    isExtra: true,
  });

  revalidatePath("/minhas-reservas");
  revalidatePath(`/admin/segunda/${weekDate}`);
  redirect("/minhas-reservas?extra=1");
}

// ---------- Editar reserva ----------

export async function updateBookingAction(formData: FormData) {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") || "");
  const durationMin = Math.max(5, Number(formData.get("durationMin") || 0));
  const briefing = readBriefing(formData);

  if (!bookingId || !durationMin || !briefing.theme || !briefing.requester || !briefing.scriptLinks) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("Reserva não encontrada.");

  const isOwner = booking.team_member_id === user.id;
  if (!isOwner && user.role !== "admin") {
    throw new Error("Você não pode editar esta reserva.");
  }

  const week = await getWeekById(booking.week_id);
  if (!week) throw new Error("Semana não encontrada.");

  if (user.role === "admin") {
    if (!isAdminBookingOpen(week.date)) {
      throw new Error(
        "O prazo excepcional do admin para esta semana já encerrou (segunda-feira às 12h, horário de Brasília)."
      );
    }
  } else if (isOwner) {
    if (!isBookingOpen(week.date)) {
      throw new Error("O prazo para alterar esta reserva já encerrou (sexta-feira às 12h, horário de Brasília).");
    }
  }

  await updateBooking(bookingId, durationMin, briefing);

  // Se a semana já tinha horários organizados pelo admin, recalcula os horários
  // de todas as reservas para que continuem consistentes com a nova duração
  // (sem isso, o horário de início/fim ficava desatualizado e não somava com
  // a duração mostrada).
  const weekBookings = await listBookingsForWeek(week.id);
  const weekAlreadyScheduled = weekBookings.some((b) => b.start_time && b.end_time);
  if (weekAlreadyScheduled) {
    await reorderAndSchedule(week.id, weekBookings.map((b) => b.id));
  }

  revalidatePath(`/segunda/${week.date}`);
  revalidatePath(`/admin/segunda/${week.date}`);
  revalidatePath("/minhas-reservas");
  revalidatePath("/");

  if (!isOwner && user.role === "admin") {
    redirect(`/admin/segunda/${week.date}`);
  }
  redirect(`/minhas-reservas?editado=1`);
}

// ---------- Cancelamento de reserva ----------

export async function cancelBookingAction(formData: FormData) {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") || "");
  const redirectTo = String(formData.get("redirectTo") || "/minhas-reservas");

  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("Reserva não encontrada.");

  const isOwner = booking.team_member_id === user.id;
  if (!isOwner && user.role !== "admin") {
    throw new Error("Você não pode cancelar esta reserva.");
  }

  if (isOwner && user.role !== "admin") {
    const week = await getWeekById(booking.week_id);
    if (week && recordingHappened(week.date)) {
      throw new Error("Não é possível cancelar após o dia da gravação.");
    }
  }

  const week = await getWeekById(booking.week_id);
  await deleteBooking(bookingId);

  if (week) {
    revalidatePath(`/segunda/${week.date}`);
    revalidatePath(`/admin/segunda/${week.date}`);
  }
  revalidatePath("/minhas-reservas");
  revalidatePath("/");
  revalidatePath("/admin");
  redirect(redirectTo);
}

// ---------- Relatório pós-gravação ----------

export async function submitReportAction(formData: FormData) {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") || "");
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("Reserva não encontrada.");
  if (booking.team_member_id !== user.id && user.role !== "admin") {
    throw new Error("Você não pode enviar o relatório desta reserva.");
  }

  const reportType = String(formData.get("reportType") || "") as "all_recorded" | "missing" | "extra";
  const allRecorded = reportType !== "missing";
  const notes = String(formData.get("notes") || "").trim() || undefined;

  let missingDetails: { title: string; person: string; reason: string } | undefined;
  if (reportType === "missing") {
    missingDetails = {
      title: String(formData.get("missingTitle") || "").trim(),
      person: String(formData.get("missingPerson") || "").trim(),
      reason: String(formData.get("missingReason") || "").trim(),
    };
  }

  await createRecordingReport({
    bookingId,
    teamMemberId: user.id,
    allRecorded,
    notes,
    reportType,
    missingDetails,
  });

  const week = await getWeekById(booking.week_id);
  if (reportType === "extra" && week) {
    revalidatePath("/minhas-reservas");
    redirect(`/segunda/${week.date}/agendar-extra`);
  }

  revalidatePath("/minhas-reservas");
  redirect("/minhas-reservas?relatorio=1");
}

// ---------- Admin: semanas ----------

export async function toggleBlockWeekAction(formData: FormData) {
  await requireAdmin();
  const weekDate = String(formData.get("weekDate") || "");
  const blocked = formData.get("blocked") === "on";
  const reason = String(formData.get("reason") || "").trim() || undefined;
  await setWeekBlocked(weekDate, blocked, reason);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/segunda/${weekDate}`);
  redirect("/admin");
}

// ---------- Admin: reordenar / horários ----------

export async function reorderAction(
  weekId: string,
  weekDate: string,
  orderedIds: string[],
  gaps?: Record<string, number>
) {
  await requireAdmin();
  await reorderAndSchedule(weekId, orderedIds, gaps);
  revalidatePath(`/admin/segunda/${weekDate}`);
  revalidatePath(`/segunda/${weekDate}`);
  revalidatePath("/");
}

// ---------- Admin: link do vídeo final ----------

export async function setVideoLinkAction(formData: FormData) {
  await requireAdmin();
  const bookingId = String(formData.get("bookingId") || "");
  const weekDate = String(formData.get("weekDate") || "");
  const link = String(formData.get("videoLink") || "").trim();
  await setBookingVideoLink(bookingId, link);
  revalidatePath(`/admin/segunda/${weekDate}`);
  revalidatePath("/minhas-reservas");
  redirect(`/admin/segunda/${weekDate}`);
}

// ---------- Admin: equipe ----------

export async function addTeamMemberAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Informe um nome.");
  await createTeamMember(name, "member");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function toggleMemberActiveAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (id === TUZUKI_ID) throw new Error("O perfil do Tuzuki não pode ser alterado.");
  const member = await getTeamMemberById(id);
  if (!member) throw new Error("Pessoa não encontrada.");
  await setTeamMemberActive(id, !member.active);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function toggleMemberRoleAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (id === TUZUKI_ID) throw new Error("O perfil do Tuzuki não pode ser alterado.");
  const member = await getTeamMemberById(id);
  if (!member) throw new Error("Pessoa não encontrada.");
  await setTeamMemberRole(id, member.role === "admin" ? "member" : "admin");
  revalidatePath("/admin");
  redirect("/admin");
}
