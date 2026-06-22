import { Pool } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { DEFAULT_START_TIME, DEFAULT_END_TIME, computeSchedule } from "./scheduling";

// Banco de dados: Postgres (Neon, via integração de Storage da Vercel).
// As variáveis POSTGRES_URL / DATABASE_URL são adicionadas automaticamente
// ao projeto pela integração de Storage. Isso garante persistência real e
// compartilhada entre todas as instâncias serverless (resolve o problema do
// /tmp/app.db, que era efêmero por instância).
const DB_URL =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!DB_URL) {
  throw new Error(
    "Nenhuma variável de conexão com o banco encontrada (POSTGRES_URL/DATABASE_URL). " +
      "Configure a integração de Storage (Postgres) no projeto na Vercel."
  );
}

type ExecArg = string | { sql: string; args?: unknown[] };

/**
 * Wrapper fino sobre @neondatabase/serverless que reproduz a interface usada
 * neste arquivo (baseada em @libsql/client): db.execute(...) -> { rows },
 * db.executeMultiple(sql) executa várias declarações separadas por ";".
 * Os placeholders "?" são convertidos para "$1, $2, ..." (sintaxe Postgres).
 */
class Client {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async execute(arg: ExecArg): Promise<{ rows: Record<string, unknown>[] }> {
    if (typeof arg === "string") {
      const res = await this.pool.query(arg);
      return { rows: res.rows as Record<string, unknown>[] };
    }
    const { sql, args = [] } = arg;
    let i = 0;
    const text = sql.replace(/\?/g, () => `$${++i}`);
    const res = await this.pool.query(text, args as unknown[]);
    return { rows: res.rows as Record<string, unknown>[] };
  }

  async executeMultiple(sql: string): Promise<void> {
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await this.pool.query(stmt);
    }
  }
}

const globalForDb = globalThis as unknown as {
  __db?: Client;
  __dbInit?: Promise<void>;
};

function getClient(): Client {
  if (!globalForDb.__db) {
    globalForDb.__db = new Client(DB_URL!);
  }
  return globalForDb.__db;
}

async function init(): Promise<void> {
  const db = getClient();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      password TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (now()::text)
    );

    CREATE TABLE IF NOT EXISTS weeks (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE NOT NULL,
      is_blocked INTEGER NOT NULL DEFAULT 0,
      block_reason TEXT,
      start_time TEXT NOT NULL DEFAULT '${DEFAULT_START_TIME}',
      end_time TEXT NOT NULL DEFAULT '${DEFAULT_END_TIME}'
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      week_id TEXT NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
      team_member_id TEXT NOT NULL REFERENCES team_members(id),
      "order" INTEGER NOT NULL DEFAULT 0,
      duration_min INTEGER NOT NULL,
      gap_before_min INTEGER NOT NULL DEFAULT 0,
      suggested_time TEXT,
      start_time TEXT,
      end_time TEXT,
      status TEXT NOT NULL DEFAULT 'pendente',
      is_extra INTEGER NOT NULL DEFAULT 0,
      video_link TEXT,
      created_at TEXT NOT NULL DEFAULT (now()::text)
    );

    CREATE TABLE IF NOT EXISTS briefings (
      id TEXT PRIMARY KEY,
      booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      video_count INTEGER NOT NULL,
      theme TEXT NOT NULL,
      subjects TEXT NOT NULL,
      requester TEXT NOT NULL,
      logo TEXT NOT NULL,
      music_style TEXT NOT NULL,
      tone TEXT NOT NULL,
      extra_notes TEXT,
      script_links TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (now()::text)
    );

    CREATE TABLE IF NOT EXISTS recording_reports (
      id TEXT PRIMARY KEY,
      booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      team_member_id TEXT NOT NULL REFERENCES team_members(id),
      all_recorded INTEGER NOT NULL,
      notes TEXT,
      submitted_at TEXT NOT NULL DEFAULT (now()::text)
    );
  `);

  // migrações leves
  await db.execute("ALTER TABLE team_members ADD COLUMN IF NOT EXISTS password TEXT");
  await db.execute("ALTER TABLE recording_reports ADD COLUMN IF NOT EXISTS missing_details TEXT");
  await db.execute("ALTER TABLE recording_reports ADD COLUMN IF NOT EXISTS report_type TEXT");
  await db.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gap_before_min INTEGER NOT NULL DEFAULT 0");

  // migração: corrige nome "Camilla" -> "Camila" em bancos já existentes
  await db.execute("UPDATE team_members SET name = 'Camila' WHERE id = 'seed-camilla' AND name = 'Camilla'");

  // seed da equipe: IDs fixos para que as sessões (cookie) continuem válidas
  // mesmo em instâncias serverless diferentes.
  const seedMembers: { id: string; name: string; role: "admin" | "member"; password?: string }[] = [
    { id: "seed-tuzuki", name: "Tuzuki", role: "admin", password: "@01Nutella" },
    { id: "seed-grace-botelho", name: "Grace Botelho", role: "admin", password: "botelho" },
    { id: "seed-joao-vitor", name: "João Vitor", role: "member" },
    { id: "seed-camilla", name: "Camila", role: "member" },
    { id: "seed-dino", name: "Dino", role: "member" },
    { id: "seed-gabriela-airy", name: "Gabriela Airy", role: "member" },
    { id: "seed-gabriela-lima", name: "Gabriela Lima", role: "member" },
    { id: "seed-gustavo", name: "Gustavo", role: "member" },
    { id: "seed-ingrid", name: "Ingrid", role: "member" },
    { id: "seed-keila", name: "Keila", role: "member" },
    { id: "seed-madu", name: "Madu", role: "member" },
    { id: "seed-marcelo", name: "Marcelo", role: "member" },
    { id: "seed-tabata", name: "Tábata", role: "member" },
  ];

  for (const m of seedMembers) {
    await db.execute({
      sql: `INSERT INTO team_members (id, name, role, password)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET role = excluded.role, password = excluded.password`,
      args: [m.id, m.name, m.role, m.password ?? null],
    });
  }
}

async function getDb(): Promise<Client> {
  if (!globalForDb.__dbInit) {
    globalForDb.__dbInit = init();
  }
  await globalForDb.__dbInit;
  return getClient();
}

// ---------- Tipos ----------

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  password: string | null;
  active: number;
  created_at: string;
};

export type Week = {
  id: string;
  date: string;
  is_blocked: number;
  block_reason: string | null;
  start_time: string;
  end_time: string;
};

export type Briefing = {
  id: string;
  booking_id: string;
  video_count: number;
  theme: string;
  subjects: string;
  requester: string;
  logo: string;
  music_style: string;
  tone: string;
  extra_notes: string | null;
  script_links: string;
  created_at: string;
};

export type RecordingReport = {
  id: string;
  booking_id: string;
  team_member_id: string;
  all_recorded: number;
  notes: string | null;
  submitted_at: string;
};

export type Booking = {
  id: string;
  week_id: string;
  team_member_id: string;
  order: number;
  duration_min: number;
  gap_before_min: number;
  suggested_time: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  is_extra: number;
  video_link: string | null;
  created_at: string;
  team_member_name?: string;
  briefing?: Briefing | null;
  report?: RecordingReport | null;
};

// ---------- Team members ----------

export async function listTeamMembers(onlyActive = true): Promise<TeamMember[]> {
  const db = await getDb();
  const sql = onlyActive
    ? "SELECT * FROM team_members WHERE active = 1 ORDER BY name"
    : "SELECT * FROM team_members ORDER BY name";
  const res = await db.execute(sql);
  return res.rows as unknown as TeamMember[];
}

export async function getTeamMemberById(id: string): Promise<TeamMember | undefined> {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT * FROM team_members WHERE id = ?", args: [id] });
  return (res.rows[0] as unknown as TeamMember) ?? undefined;
}

export async function createTeamMember(name: string, role: "member" | "admin" = "member"): Promise<TeamMember> {
  const db = await getDb();
  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO team_members (id, name, role) VALUES (?, ?, ?)",
    args: [id, name.trim(), role],
  });
  return (await getTeamMemberById(id))!;
}

export async function setTeamMemberActive(id: string, active: boolean) {
  const db = await getDb();
  await db.execute({ sql: "UPDATE team_members SET active = ? WHERE id = ?", args: [active ? 1 : 0, id] });
}

export async function setTeamMemberRole(id: string, role: "member" | "admin") {
  const db = await getDb();
  await db.execute({ sql: "UPDATE team_members SET role = ? WHERE id = ?", args: [role, id] });
}

// ---------- Weeks ----------

export async function getWeekByDate(date: string): Promise<Week | undefined> {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT * FROM weeks WHERE date = ?", args: [date] });
  return (res.rows[0] as unknown as Week) ?? undefined;
}

export async function getOrCreateWeek(date: string): Promise<Week> {
  const existing = await getWeekByDate(date);
  if (existing) return existing;
  const db = await getDb();
  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO weeks (id, date, start_time, end_time) VALUES (?, ?, ?, ?)",
    args: [id, date, DEFAULT_START_TIME, DEFAULT_END_TIME],
  });
  return (await getWeekByDate(date))!;
}

export async function setWeekBlocked(date: string, blocked: boolean, reason?: string) {
  const week = await getOrCreateWeek(date);
  const db = await getDb();
  await db.execute({
    sql: "UPDATE weeks SET is_blocked = ?, block_reason = ? WHERE id = ?",
    args: [blocked ? 1 : 0, reason ?? null, week.id],
  });
}

/** Retorna todas as semanas já criadas (usado para manutenção/backfill). */
export async function listAllWeeks(): Promise<Week[]> {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT * FROM weeks ORDER BY date ASC", args: [] });
  return res.rows as unknown as Week[];
}

export async function getWeeksBookedMinutes(
  dates: string[]
): Promise<Record<string, { booked: number; blocked: boolean; total: number; count: number }>> {
  const db = await getDb();
  const result: Record<string, { booked: number; blocked: boolean; total: number; count: number }> = {};
  for (const date of dates) {
    const week = await getWeekByDate(date);
    if (!week) {
      result[date] = { booked: 0, blocked: false, total: 270, count: 0 };
      continue;
    }
    const res = await db.execute({ sql: "SELECT duration_min FROM bookings WHERE week_id = ?", args: [week.id] });
    const rows = res.rows as unknown as { duration_min: number }[];
    const booked = rows.reduce((acc, r) => acc + r.duration_min, 0);
    const total = timeToMin(week.end_time) - timeToMin(week.start_time);
    result[date] = { booked, blocked: !!week.is_blocked, total, count: rows.length };
  }
  return result;
}

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// ---------- Bookings ----------

async function attachRelations(db: Client, booking: Booking): Promise<Booking> {
  const memberRes = await db.execute({
    sql: "SELECT name FROM team_members WHERE id = ?",
    args: [booking.team_member_id],
  });
  const member = memberRes.rows[0] as unknown as { name: string } | undefined;
  booking.team_member_name = member?.name;

  const briefingRes = await db.execute({ sql: "SELECT * FROM briefings WHERE booking_id = ?", args: [booking.id] });
  booking.briefing = (briefingRes.rows[0] as unknown as Briefing | undefined) ?? null;

  const reportRes = await db.execute({
    sql: "SELECT * FROM recording_reports WHERE booking_id = ?",
    args: [booking.id],
  });
  booking.report = (reportRes.rows[0] as unknown as RecordingReport | undefined) ?? null;

  return booking;
}

export async function listBookingsForWeek(weekId: string): Promise<Booking[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: 'SELECT * FROM bookings WHERE week_id = ? ORDER BY "order" ASC, created_at ASC',
    args: [weekId],
  });
  const rows = res.rows as unknown as Booking[];
  const result: Booking[] = [];
  for (const row of rows) {
    result.push(await attachRelations(db, row));
  }
  return result;
}

export async function getBookingById(id: string): Promise<Booking | undefined> {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT * FROM bookings WHERE id = ?", args: [id] });
  const row = res.rows[0] as unknown as Booking | undefined;
  return row ? await attachRelations(db, row) : undefined;
}

export async function listBookingsForMember(
  teamMemberId: string
): Promise<(Booking & { weekDate: string })[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT b.* FROM bookings b
       JOIN weeks w ON w.id = b.week_id
       WHERE b.team_member_id = ?
       ORDER BY w.date DESC, b."order" ASC`,
    args: [teamMemberId],
  });
  const rows = res.rows as unknown as Booking[];
  const result: (Booking & { weekDate: string })[] = [];
  for (const row of rows) {
    const withRelations = await attachRelations(db, row);
    const weekRes = await db.execute({ sql: "SELECT * FROM weeks WHERE id = ?", args: [row.week_id] });
    const week = weekRes.rows[0] as unknown as Week;
    result.push({ ...withRelations, weekDate: week.date });
  }
  return result;
}

export type BriefingInput = {
  videoCount: number;
  theme: string;
  subjects: string;
  requester: string;
  logo: string;
  musicStyle: string;
  tone: string;
  extraNotes?: string;
  scriptLinks: string;
};

export async function createBooking(params: {
  weekDate: string;
  teamMemberId: string;
  durationMin: number;
  suggestedTime?: string;
  isExtra?: boolean;
  briefing: BriefingInput;
}): Promise<Booking> {
  const db = await getDb();
  const week = await getOrCreateWeek(params.weekDate);
  const maxOrderRes = await db.execute({
    sql: 'SELECT COALESCE(MAX("order"), -1) as m FROM bookings WHERE week_id = ?',
    args: [week.id],
  });
  const maxOrder = maxOrderRes.rows[0] as unknown as { m: number };

  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO bookings (id, week_id, team_member_id, "order", duration_min, suggested_time, status, is_extra)
     VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?)`,
    args: [
      id,
      week.id,
      params.teamMemberId,
      Number(maxOrder.m) + 1,
      params.durationMin,
      params.suggestedTime ?? null,
      params.isExtra ? 1 : 0,
    ],
  });

  const b = params.briefing;
  await db.execute({
    sql: `INSERT INTO briefings (id, booking_id, video_count, theme, subjects, requester, logo, music_style, tone, extra_notes, script_links)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      randomUUID(),
      id,
      b.videoCount,
      b.theme,
      b.subjects,
      b.requester,
      b.logo,
      b.musicStyle,
      b.tone,
      b.extraNotes ?? null,
      b.scriptLinks,
    ],
  });

  return (await getBookingById(id))!;
}

/**
 * Recalcula horários sequenciais de acordo com a ordem e marca como confirmados.
 * `gaps` (opcional) permite definir, por reserva, quantos minutos de intervalo livre
 * devem ser deixados antes dela (em relação ao término da reserva anterior). Útil
 * para abrir uma lacuna na agenda quando, por exemplo, um professor só está
 * disponível mais tarde.
 */
export async function reorderAndSchedule(
  weekId: string,
  orderedBookingIds: string[],
  gaps?: Record<string, number>
) {
  const db = await getDb();
  const weekRes = await db.execute({ sql: "SELECT * FROM weeks WHERE id = ?", args: [weekId] });
  const week = weekRes.rows[0] as unknown as Week;
  const bookings = await listBookingsForWeek(weekId);
  const byId = new Map(bookings.map((b) => [b.id, b]));

  const items = orderedBookingIds.map((id) => ({
    id,
    durationMin: byId.get(id)?.duration_min ?? 0,
    gapBeforeMin: gaps?.[id] ?? byId.get(id)?.gap_before_min ?? 0,
  }));
  const schedule = computeSchedule(items, week.start_time);

  for (const [idx, s] of schedule.entries()) {
    const gapBeforeMin = items[idx].gapBeforeMin ?? 0;
    await db.execute({
      sql: `UPDATE bookings SET "order" = ?, gap_before_min = ?, start_time = ?, end_time = ?, status = 'confirmado' WHERE id = ?`,
      args: [idx, gapBeforeMin, s.startTime, s.endTime, s.id],
    });
  }
}

export async function setBookingVideoLink(bookingId: string, link: string) {
  const db = await getDb();
  await db.execute({ sql: "UPDATE bookings SET video_link = ? WHERE id = ?", args: [link, bookingId] });
}

export async function getWeekById(id: string): Promise<Week | undefined> {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT * FROM weeks WHERE id = ?", args: [id] });
  return (res.rows[0] as unknown as Week) ?? undefined;
}

export async function deleteBooking(bookingId: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM bookings WHERE id = ?", args: [bookingId] });
}

export async function createRecordingReport(params: {
  bookingId: string;
  teamMemberId: string;
  allRecorded: boolean;
  notes?: string;
  reportType?: "all_recorded" | "missing" | "extra";
  missingDetails?: { title: string; person: string; reason: string };
}) {
  const db = await getDb();
  const missingJson = params.missingDetails ? JSON.stringify(params.missingDetails) : null;
  await db.execute({
    sql: `INSERT INTO recording_reports (id, booking_id, team_member_id, all_recorded, notes, report_type, missing_details)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(booking_id) DO UPDATE
       SET all_recorded = excluded.all_recorded,
           notes = excluded.notes,
           report_type = excluded.report_type,
           missing_details = excluded.missing_details,
           submitted_at = now()::text`,
    args: [
      randomUUID(),
      params.bookingId,
      params.teamMemberId,
      params.allRecorded ? 1 : 0,
      params.notes ?? null,
      params.reportType ?? null,
      missingJson,
    ],
  });
}

export async function updateBooking(
  bookingId: string,
  durationMin: number,
  briefing: BriefingInput
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE bookings SET duration_min = ? WHERE id = ?",
    args: [durationMin, bookingId],
  });
  await db.execute({
    sql: `UPDATE briefings SET video_count = ?, theme = ?, subjects = ?, requester = ?, logo = ?,
          music_style = ?, tone = ?, extra_notes = ?, script_links = ? WHERE booking_id = ?`,
    args: [
      briefing.videoCount,
      briefing.theme,
      briefing.subjects,
      briefing.requester,
      briefing.logo,
      briefing.musicStyle,
      briefing.tone,
      briefing.extraNotes ?? null,
      briefing.scriptLinks,
      bookingId,
    ],
  });
}

/** Constante com o ID fixo do Tuzuki para proteção especial */
export const TUZUKI_ID = "seed-tuzuki";
