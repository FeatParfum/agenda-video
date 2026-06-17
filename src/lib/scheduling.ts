import {
  addDays,
  addMinutes,
  format,
  getDay,
  isBefore,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns";

export const DEFAULT_START_TIME = "13:30";
export const DEFAULT_END_TIME = "18:00";

/** Formata uma data (Date) para "yyyy-MM-dd" */
export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Converte "yyyy-MM-dd" em Date (meia-noite local) */
export function fromISODate(iso: string): Date {
  return parseISO(iso);
}

/** Retorna todas as segundas-feiras (yyyy-MM-dd) de um determinado mês/ano */
export function getMondaysOfMonth(year: number, month1to12: number): string[] {
  const start = startOfMonth(new Date(year, month1to12 - 1, 1));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });
  return days.filter((d) => getDay(d) === 1).map(toISODate);
}

/** Alias para compatibilidade */
export const getTuesdaysOfMonth = getMondaysOfMonth;

/** Retorna as próximas N segundas-feiras (yyyy-MM-dd), incluindo a desta semana caso ainda não tenha passado */
export function getUpcomingMondays(count: number, from: Date = new Date()): string[] {
  const result: string[] = [];
  let cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (result.length < count) {
    if (getDay(cursor) === 1) {
      result.push(toISODate(cursor));
    }
    cursor = addDays(cursor, 1);
  }
  return result;
}

/** Alias para compatibilidade */
export const getUpcomingTuesdays = getUpcomingMondays;

/** "HH:mm" -> minutos desde meia-noite */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** minutos desde meia-noite -> "HH:mm" */
export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const m = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Duração total da janela em minutos */
export function windowDurationMinutes(startTime: string, endTime: string): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

/** Data/hora do prazo limite para agendar (sexta-feira anterior às 12:00) */
export function bookingDeadline(mondayISO: string): Date {
  const monday = fromISODate(mondayISO);
  const friday = addDays(monday, -3); // sexta-feira anterior
  let d = setHours(friday, 12);
  d = setMinutes(d, 0);
  d = setSeconds(d, 0);
  d = setMilliseconds(d, 0);
  return d;
}

/** Verifica se ainda é possível agendar/alterar para essa semana (antes de sexta 12h) */
export function isBookingOpen(mondayISO: string, now: Date = new Date()): boolean {
  const deadline = bookingDeadline(mondayISO);
  return isBefore(now, deadline);
}

/** A data da segunda já chegou/passou? (gravação ocorrendo ou já ocorreu) */
export function recordingHappened(mondayISO: string, now: Date = new Date()): boolean {
  const monday = fromISODate(mondayISO);
  // Popup aparece a partir de terça (dia seguinte à gravação)
  const tuesday = addDays(monday, 1);
  return !isBefore(now, tuesday);
}

export type ScheduleItem = {
  id: string;
  durationMin: number;
};

export type ScheduledResult = {
  id: string;
  startTime: string;
  endTime: string;
};

/** Calcula horários sequenciais a partir de startTime, dada a ordem dos itens */
export function computeSchedule(
  items: ScheduleItem[],
  startTime: string = DEFAULT_START_TIME
): ScheduledResult[] {
  let cursor = timeToMinutes(startTime);
  const result: ScheduledResult[] = [];
  for (const item of items) {
    const start = cursor;
    const end = cursor + item.durationMin;
    result.push({ id: item.id, startTime: minutesToTime(start), endTime: minutesToTime(end) });
    cursor = end;
  }
  return result;
}

/** Soma a duração de uma lista de agendamentos */
export function totalBookedMinutes(items: { durationMin: number }[]): number {
  return items.reduce((acc, i) => acc + i.durationMin, 0);
}

/** Nome do mês em português */
export const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const WEEKDAY_NAMES_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function formatDateLong(iso: string): string {
  const d = fromISODate(iso);
  return format(d, "dd/MM/yyyy");
}

export function formatDateFull(iso: string): string {
  const d = fromISODate(iso);
  const weekdays = [
    "domingo",
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
  ];
  return `${weekdays[getDay(d)]}, ${format(d, "dd/MM/yyyy")}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const base = setMinutes(setHours(new Date(2000, 0, 1), timeToMinutes(time) / 60), 0);
  const result = addMinutes(base, timeToMinutes(time) + minutes - timeToMinutes(time));
  return format(result, "HH:mm");
}
