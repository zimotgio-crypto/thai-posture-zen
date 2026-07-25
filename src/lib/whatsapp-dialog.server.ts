// WhatsApp booking dialog for existing clients.
// Server-only via `.server.ts` filename suffix.

import { BUFFER_MIN, optionsForTreatment } from "@/lib/pricing";
import { phoneMatchKey } from "@/lib/client-records";
import {
  extractIncoming,
  isWhatsAppConfigured,
  loadSession,
  resetSession,
  saveSession,
  sendButtons,
  sendList,
  sendText,
  type Incoming,
  type Session,
  type SessionDraft,
  type SessionState,
} from "@/lib/whatsapp.server";

const TREATMENT_LABEL: Record<string, string> = {
  "deep-release": "Home-Office Deep Release",
  "thai-stretch-oil": "Traditional Thai Stretch",
  zuzwiler: "Sport Massage",
};

function treatmentLabel(id: string): string {
  return TREATMENT_LABEL[id] ?? id;
}

// weekday 0 = Sunday (closed), 1..5 Mon–Fri, 6 Saturday
function openingWindow(weekday: number): { open: number; close: number } | null {
  if (weekday === 0) return null;
  if (weekday === 6) return { open: 10 * 60, close: 18 * 60 };
  return { open: 9 * 60, close: 20 * 60 };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function zurichParts(d: Date): { y: number; m: number; day: number; weekday: number; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    day: Number(get("day")),
    weekday: weekdayMap[get("weekday")] ?? 0,
    hour: Number(get("hour") || "0"),
    minute: Number(get("minute") || "0"),
  };
}

function ymd(p: { y: number; m: number; day: number }): string {
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function weekdayFromYmd(iso: string): number {
  const d = new Date(`${iso}T12:00:00+01:00`);
  return zurichParts(d).weekday;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00+01:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return ymd(zurichParts(d));
}

function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00+01:00`);
  const fmt = new Intl.DateTimeFormat("de-CH", {
    timeZone: "Europe/Zurich",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return fmt.format(d).replace(".,", ",");
}

const SLOT_STEP = 15;

type Busy = { day: string; time: string; duration: number };

async function loadBusyRange(from: string, to: string): Promise<Busy[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getGoogleBusyIntervalsInRange } = await import("@/lib/google-calendar.server");
  const [{ data: rows, error }, google] = await Promise.all([
    supabaseAdmin.from("bookings").select("day, time, duration_minutes").gte("day", from).lte("day", to),
    getGoogleBusyIntervalsInRange(from, to).catch((err) => {
      console.error("[whatsapp-dialog] google range error", err);
      return [] as Busy[];
    }),
  ]);
  if (error) console.error("[whatsapp-dialog] loadBusyRange db error", error.message);
  const dbBusy: Busy[] = (rows ?? []).map((r) => ({
    day: r.day as string,
    time: r.time as string,
    duration: (r as { duration_minutes?: number | null }).duration_minutes ?? 60,
  }));
  return [...dbBusy, ...(google as Busy[])];
}

function freeStartsForDay(day: string, duration: number, busy: Busy[], now: Date): string[] {
  const weekday = weekdayFromYmd(day);
  const win = openingWindow(weekday);
  if (!win) return [];

  const nowParts = zurichParts(now);
  const today = ymd(nowParts);
  const isToday = day === today;
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;

  const dayBusy = busy.filter((b) => b.day === day);
  const out: string[] = [];
  const latestStart = win.close - duration;
  for (let t = win.open; t <= latestStart; t += SLOT_STEP) {
    if (isToday && t <= nowMinutes) continue;
    const newEnd = t + duration + BUFFER_MIN;
    const conflict = dayBusy.some((b) => {
      const s = toMinutes(b.time);
      const e = s + b.duration + BUFFER_MIN;
      return t < e && newEnd > s;
    });
    if (!conflict) out.push(fromMinutes(t));
  }
  return out;
}

async function availableDays(duration: number): Promise<string[]> {
  const now = new Date();
  const start = ymd(zurichParts(now));
  const end = addDays(start, 60);
  const busy = await loadBusyRange(start, end);
  const out: string[] = [];
  for (let i = 0; i < 60 && out.length < 10; i++) {
    const day = addDays(start, i);
    if (freeStartsForDay(day, duration, busy, now).length > 0) out.push(day);
  }
  return out;
}

async function availableTimes(day: string, duration: number): Promise<string[]> {
  const { listBookedTimesForDay } = await import("@/lib/booking-availability.server");
  const rows = await listBookedTimesForDay(day);
  const busy: Busy[] = rows.map((r) => ({ day, time: r.time, duration: r.duration }));
  return freeStartsForDay(day, duration, busy, new Date());
}

type MessageContext = { from: string; incoming: Incoming };

export async function handleIncomingMessage(msg: Record<string, unknown>): Promise<void> {
  if (!isWhatsAppConfigured()) {
    console.error("[whatsapp-dialog] not configured, ignoring");
    return;
  }
  const from = String(msg.from ?? "");
  if (!from) return;
  const incoming = extractIncoming(msg);
  await route({ from, incoming });
}

async function route(ctx: MessageContext): Promise<void> {
  const session = await loadSession(ctx.from);
  const raw = ctx.incoming.kind === "text" ? ctx.incoming.text.trim().toLowerCase() : "";

  if (
    raw === "abbrechen" ||
    raw === "stopp" ||
    (ctx.incoming.kind === "button" && ctx.incoming.id === "cancel")
  ) {
    await resetSession(ctx.from);
    await sendText(
      ctx.from,
      "Alles klar, wir haben die Buchung abgebrochen. Wenn du später buchen möchtest, schreib einfach wieder.",
    );
    return;
  }

  const client = await findClientByPhone(ctx.from);
  if (!client) {
    const url = process.env.PUBLIC_SITE_URL || "https://thaiposturelab.ch";
    await sendText(
      ctx.from,
      `Hallo! Für die Terminbuchung nutze bitte unser Buchungsformular: ${url}. Nach dem ersten Termin kannst du künftig direkt hier per WhatsApp buchen.`,
    );
    await resetSession(ctx.from);
    return;
  }

  session.draft.clientId = client.id;
  session.draft.clientFirstName = client.first_name ?? undefined;

  try {
    await step(session, ctx, client);
  } catch (err) {
    console.error("[whatsapp-dialog] step failed", err);
    await sendText(ctx.from, "Da ist leider etwas schiefgelaufen. Bitte versuch es später erneut.");
    await resetSession(ctx.from);
  }
}

type ClientRecord = { id: string; first_name: string | null; last_name: string | null };

async function findClientByPhone(phone: string): Promise<ClientRecord | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const key = phoneMatchKey(phone);
  if (key.length < 6) return null;
  const suffix = key.slice(-8);
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("id, first_name, last_name, phone")
    .ilike("phone", `%${suffix}%`)
    .limit(20);
  if (error) {
    console.error("[whatsapp-dialog] client lookup error", error.message);
    return null;
  }
  const match = (data ?? []).find(
    (row) => phoneMatchKey((row as { phone?: string }).phone ?? "") === key,
  );
  return match ? { id: match.id, first_name: match.first_name, last_name: match.last_name } : null;
}

async function step(session: Session, ctx: MessageContext, client: ClientRecord): Promise<void> {
  const { from, incoming } = ctx;

  if (incoming.kind === "button") {
    if (incoming.id === "menu:book") return showTreatmentList(from, session, client);
    if (incoming.id === "menu:appointments") {
      await sendUpcomingAppointments(from, client);
      await resetSession(from);
      return;
    }
  }

  switch (session.state) {
    case "idle":
    case "menu":
      return greet(from, session, client);
    case "choose_treatment":
      return handleChooseTreatment(from, session, client, incoming);
    case "choose_duration":
      return handleChooseDuration(from, session, client, incoming);
    case "choose_date":
      return handleChooseDate(from, session, client, incoming);
    case "choose_time":
      return handleChooseTime(from, session, client, incoming);
    case "confirm":
      return handleConfirm(from, session, client, incoming);
    default:
      return greet(from, session, client);
  }
}

async function greet(from: string, _session: Session, client: ClientRecord): Promise<void> {
  const name = client.first_name?.trim() || "";
  const body = name ? `Hallo ${name}! Was möchtest du tun?` : `Hallo! Was möchtest du tun?`;
  await saveSession(from, "menu", { clientId: client.id, clientFirstName: name });
  await sendButtons(from, body, [
    { id: "menu:book", title: "Termin buchen" },
    { id: "menu:appointments", title: "Meine Termine" },
    { id: "cancel", title: "Abbrechen" },
  ]);
}

async function showTreatmentList(from: string, session: Session, client: ClientRecord): Promise<void> {
  const rows = Object.keys(TREATMENT_LABEL).map((id) => ({
    id: `treatment:${id}`,
    title: TREATMENT_LABEL[id],
  }));
  await saveSession(from, "choose_treatment", { ...session.draft, clientId: client.id });
  await sendList(from, "Welche Behandlung möchtest du buchen?", "Behandlung wählen", rows, "Behandlungen");
}

async function handleChooseTreatment(
  from: string,
  session: Session,
  client: ClientRecord,
  incoming: Incoming,
): Promise<void> {
  if (incoming.kind === "list" && incoming.id.startsWith("treatment:")) {
    const id = incoming.id.slice("treatment:".length);
    if (!TREATMENT_LABEL[id]) return showTreatmentList(from, session, client);
    const draft: SessionDraft = { ...session.draft, clientId: client.id, treatmentId: id };
    await saveSession(from, "choose_duration", draft);
    return sendDurationList(from, id);
  }
  return showTreatmentList(from, session, client);
}

async function sendDurationList(from: string, treatmentId: string): Promise<void> {
  const opts = optionsForTreatment(treatmentId);
  const rows = opts.map((o) => ({
    id: `duration:${o.minutes}`,
    title: `${o.minutes} Min.`,
    description: `CHF ${o.price}.–`,
  }));
  await sendList(
    from,
    `Wie lange soll die Behandlung dauern? (${treatmentLabel(treatmentId)})`,
    "Dauer wählen",
    rows,
    "Dauer",
  );
}

async function handleChooseDuration(
  from: string,
  session: Session,
  client: ClientRecord,
  incoming: Incoming,
): Promise<void> {
  const treatmentId = session.draft.treatmentId;
  if (!treatmentId) return showTreatmentList(from, session, client);
  if (incoming.kind === "list" && incoming.id.startsWith("duration:")) {
    const minutes = Number(incoming.id.slice("duration:".length));
    const opts = optionsForTreatment(treatmentId);
    if (!opts.some((o) => o.minutes === minutes)) return sendDurationList(from, treatmentId);
    const draft: SessionDraft = { ...session.draft, durationMinutes: minutes, timePage: 0 };
    await saveSession(from, "choose_date", draft);
    return sendDateList(from, minutes);
  }
  return sendDurationList(from, treatmentId);
}

async function sendDateList(from: string, duration: number): Promise<void> {
  const days = await availableDays(duration);
  if (days.length === 0) {
    await sendText(from, "Aktuell gibt es leider keine freien Tage. Bitte versuch es später erneut.");
    await resetSession(from);
    return;
  }
  const rows = days.map((d) => ({ id: `date:${d}`, title: formatDayLabel(d) }));
  await sendList(from, "An welchem Tag?", "Tag wählen", rows, "Verfügbare Tage");
}

async function handleChooseDate(
  from: string,
  session: Session,
  _client: ClientRecord,
  incoming: Incoming,
): Promise<void> {
  const duration = session.draft.durationMinutes;
  if (!duration) return sendDurationList(from, session.draft.treatmentId ?? "");
  if (incoming.kind === "list" && incoming.id.startsWith("date:")) {
    const day = incoming.id.slice("date:".length);
    const draft: SessionDraft = { ...session.draft, day, timePage: 0 };
    await saveSession(from, "choose_time", draft);
    return sendTimeList(from, day, duration, 0);
  }
  return sendDateList(from, duration);
}

const TIMES_PER_PAGE = 9;

async function sendTimeList(from: string, day: string, duration: number, page: number): Promise<void> {
  const all = await availableTimes(day, duration);
  if (all.length === 0) {
    await sendText(from, "Für diesen Tag sind keine Zeiten mehr frei. Bitte wähl einen anderen Tag.");
    const session = await loadSession(from);
    await saveSession(from, "choose_date", { ...session.draft, timePage: 0 });
    return sendDateList(from, duration);
  }
  const start = page * TIMES_PER_PAGE;
  const slice = all.slice(start, start + TIMES_PER_PAGE);
  const hasMore = start + TIMES_PER_PAGE < all.length;
  const rows: { id: string; title: string }[] = slice.map((t) => ({
    id: `time:${t}`,
    title: `${t} – ${fromMinutes(toMinutes(t) + duration)}`,
  }));
  if (hasMore) rows.push({ id: "time:more", title: "Weitere Zeiten anzeigen" });
  await sendList(
    from,
    `Freie Zeiten am ${formatDayLabel(day)}:`,
    "Zeit wählen",
    rows,
    "Verfügbare Zeiten",
  );
}

async function handleChooseTime(
  from: string,
  session: Session,
  client: ClientRecord,
  incoming: Incoming,
): Promise<void> {
  const { day, durationMinutes: duration, treatmentId } = session.draft;
  const page = session.draft.timePage ?? 0;
  if (!day || !duration || !treatmentId) return greet(from, session, client);
  if (incoming.kind === "list" && incoming.id.startsWith("time:")) {
    const rest = incoming.id.slice("time:".length);
    if (rest === "more") {
      const nextPage = page + 1;
      await saveSession(from, "choose_time", { ...session.draft, timePage: nextPage });
      return sendTimeList(from, day, duration, nextPage);
    }
    const time = rest;
    const draft: SessionDraft = { ...session.draft, time };
    await saveSession(from, "confirm", draft);
    return sendConfirmation(from, draft);
  }
  return sendTimeList(from, day, duration, page);
}

async function sendConfirmation(from: string, draft: SessionDraft): Promise<void> {
  const { treatmentId, durationMinutes, day, time } = draft;
  if (!treatmentId || !durationMinutes || !day || !time) return;
  const opts = optionsForTreatment(treatmentId);
  const price = opts.find((o) => o.minutes === durationMinutes)?.price ?? 0;
  const endTime = fromMinutes(toMinutes(time) + durationMinutes);
  const summary =
    `Bitte prüfe deine Buchung:\n\n` +
    `Behandlung: ${treatmentLabel(treatmentId)}\n` +
    `Datum: ${formatDayLabel(day)}\n` +
    `Zeit: ${time} – ${endTime}\n` +
    `Dauer: ${durationMinutes} Min.\n` +
    `Preis: CHF ${price}.–`;
  await sendButtons(from, summary, [
    { id: "confirm:yes", title: "Bestätigen" },
    { id: "cancel", title: "Abbrechen" },
  ]);
}

async function handleConfirm(
  from: string,
  session: Session,
  client: ClientRecord,
  incoming: Incoming,
): Promise<void> {
  if (incoming.kind !== "button" || incoming.id !== "confirm:yes") {
    return sendConfirmation(from, session.draft);
  }
  const { treatmentId, durationMinutes, day, time } = session.draft;
  if (!treatmentId || !durationMinutes || !day || !time) return greet(from, session, client);

  const stillFree = (await availableTimes(day, durationMinutes)).includes(time);
  if (!stillFree) {
    await sendText(
      from,
      "Diese Zeit ist inzwischen leider vergeben. Ich zeige dir aktuelle Zeiten für diesen Tag.",
    );
    await saveSession(from, "choose_time", { ...session.draft, timePage: 0 });
    return sendTimeList(from, day, durationMinutes, 0);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const insert = await supabaseAdmin
    .from("bookings")
    .insert({
      client_id: client.id,
      treatment: treatmentId,
      day,
      time,
      duration_minutes: durationMinutes,
      silent: false,
      source: "online",
    })
    .select("id")
    .single();
  if (insert.error) {
    console.error("[whatsapp-dialog] booking insert failed", insert.error.message);
    await sendText(from, "Die Buchung konnte nicht gespeichert werden. Bitte versuch es später erneut.");
    await resetSession(from);
    return;
  }

  try {
    const { createGoogleEvent } = await import("@/lib/google-calendar.server");
    const eventId = await createGoogleEvent({
      day,
      time,
      durationMinutes,
      treatment: treatmentLabel(treatmentId),
      clientName: `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim(),
      clientPhone: from,
      source: "online",
    });
    if (eventId && insert.data?.id) {
      await supabaseAdmin.from("bookings").update({ google_event_id: eventId }).eq("id", insert.data.id);
    }
  } catch (err) {
    console.error("[whatsapp-dialog] google mirror failed", err);
  }

  const endTime = fromMinutes(toMinutes(time) + durationMinutes);
  await sendText(
    from,
    `Danke! Dein Termin ist gebucht.\n\n` +
      `${treatmentLabel(treatmentId)}\n` +
      `${formatDayLabel(day)}, ${time} – ${endTime}\n\n` +
      `Wir freuen uns auf dich. Falls du absagen musst, melde dich bitte mindestens 24 Std. vorher.`,
  );
  await resetSession(from);
}

async function sendUpcomingAppointments(from: string, client: ClientRecord): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const today = ymd(zurichParts(new Date()));
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("day, time, duration_minutes, treatment")
    .eq("client_id", client.id)
    .gte("day", today)
    .order("day", { ascending: true })
    .order("time", { ascending: true })
    .limit(10);
  if (error) {
    console.error("[whatsapp-dialog] upcoming query error", error.message);
    await sendText(from, "Deine Termine konnten nicht geladen werden. Bitte versuch es später erneut.");
    return;
  }
  const rows = data ?? [];
  if (rows.length === 0) {
    await sendText(from, "Du hast aktuell keine anstehenden Termine.");
    return;
  }
  const lines = rows.map((r) => {
    const t = r.time as string;
    const dur = (r as { duration_minutes?: number | null }).duration_minutes ?? 60;
    const end = fromMinutes(toMinutes(t) + dur);
    return `• ${formatDayLabel(r.day as string)}, ${t} – ${end} · ${treatmentLabel((r as { treatment: string }).treatment)}`;
  });
  await sendText(from, `Deine nächsten Termine:\n\n${lines.join("\n")}`);
}

export type { SessionState };
