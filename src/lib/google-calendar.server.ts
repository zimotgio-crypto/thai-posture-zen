// Per-studio calendar id, with the platform-wide env var as fallback.
function calId(explicit?: string | null): string {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed;
  return process.env.GOOGLE_CALENDAR_ID ?? "";
}
const PEM_BEGIN = "-----BEGIN PRIVATE KEY-----";
const PEM_END = "-----END PRIVATE KEY-----";

function normalizePrivateKey(raw: string | undefined): string {
  if (!raw) return "";
  let value = raw.trim();
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      value = value.slice(1, -1);
    }
  }
  value = value.replace(/\\n/g, "\n");
  if (!value.includes("\n")) {
    const beginIdx = value.indexOf(PEM_BEGIN);
    const endIdx = value.indexOf(PEM_END);
    if (beginIdx !== -1 && endIdx !== -1) {
      const body = value.slice(beginIdx + PEM_BEGIN.length, endIdx).replace(/\s+/g, "");
      const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? "";
      value = `${PEM_BEGIN}\n${wrapped}\n${PEM_END}\n`;
    }
  }
  if (!value.endsWith("\n")) value = `${value}\n`;
  return value;
}

function parseServiceAccountJson(): { email: string; key: string } | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  let value = raw.trim();
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      value = value.slice(1, -1);
    }
  }
  try {
    const parsed = JSON.parse(value) as { client_email?: string; private_key?: string };
    const email = parsed.client_email?.trim() ?? "";
    const key = normalizePrivateKey(parsed.private_key);
    if (!email || !key) return null;
    return { email, key };
  } catch {
    return null;
  }
}

function getCredentials(): { email: string; key: string } {
  const fromJson = parseServiceAccountJson();
  if (fromJson) return fromJson;
  return {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
    key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
  };
}

const SA_EMAIL = () => getCredentials().email;
const SA_KEY = () => getCredentials().key;

// Shown in the studio settings so the therapist knows which address the
// Google calendar must be shared with. Never exposes the private key.
export function serviceAccountEmail(): string {
  return getCredentials().email;
}

export function isGoogleConfigured(calendarId?: string | null): boolean {
  return Boolean(calId(calendarId) && SA_EMAIL() && SA_KEY());
}

let cachedToken: { token: string; exp: number } | null = null;
let cachedCryptoKey: { pem: string; key: CryptoKey } | null = null;

function base64UrlEncode(input: string | Uint8Array): string {
  let binary = "";
  if (typeof input === "string") {
    const bytes = new TextEncoder().encode(input);
    for (const b of bytes) binary += String.fromCharCode(b);
  } else {
    for (const b of input) binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(PEM_BEGIN, "")
    .replace(PEM_END, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function importSigningKey(pem: string): Promise<CryptoKey> {
  if (cachedCryptoKey && cachedCryptoKey.pem === pem) return cachedCryptoKey.key;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  cachedCryptoKey = { pem, key };
  return key;
}

async function createSignedJwt(): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: SA_EMAIL(),
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: iat + 3600,
    iat,
  };
  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
  const key = await importSigningKey(SA_KEY());
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function getAuthToken(): Promise<string | null> {
  if (!isGoogleConfigured()) return null;
  const now = Date.now();
  if (cachedToken && cachedToken.exp - 60_000 > now) return cachedToken.token;
  try {
    const assertion = await createSignedJwt();
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }).toString(),
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.error(`[google-calendar] token exchange failed ${res.status}: ${text}`);
      return null;
    }
    const json = parseJsonBody(text) as { access_token?: string; expires_in?: number } | null;
    const token = json?.access_token ?? null;
    if (!token) {
      console.error("[google-calendar] token exchange returned no access_token");
      return null;
    }
    const expiresIn = typeof json?.expires_in === "number" ? json.expires_in : 3300;
    cachedToken = { token, exp: now + expiresIn * 1000 };
    return token;
  } catch (err) {
    console.error("[google-calendar] token exchange error", normalizeException(err));
    return null;
  }
}

function addMinutesIso(day: string, time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const eh = Math.floor(total / 60);
  const em = total % 60;
  return `${day}T${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}:00`;
}

type CreateInput = {
  day: string;
  time: string;
  durationMinutes: number;
  treatment: string;
  clientName: string;
  clientPhone?: string | null;
  source: "online" | "manual" | "block";
  calendarId?: string | null;
  studioName?: string | null;
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type GoogleException = { message: string; stack: string | null };

function normalizeException(err: unknown): GoogleException {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack ?? null };
  }
  return { message: String(err), stack: null };
}

const DEFAULT_TIMEZONE = "Europe/Zurich";

function studioTimeZone(timeZone?: string | null): string {
  return timeZone?.trim() || DEFAULT_TIMEZONE;
}

const dayTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function dayTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = dayTimeFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    dayTimeFormatters.set(timeZone, fmt);
  }
  return fmt;
}

function localDayTime(date: Date, timeZone: string): { day: string; time: string } {
  const parts = dayTimeFormatter(timeZone).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

// Offset between the wall clock in `timeZone` and UTC at the given instant.
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = dayTimeFormatter(timeZone).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - date.getTime();
}

// Wall-clock time in `timeZone` → UTC instant. The second probe corrects the
// guess when the first one lands on the other side of a DST transition.
function wallTimeToUtc(day: string, time: string, timeZone: string): Date {
  const naive = Date.parse(`${day}T${time}:00Z`);
  const first = naive - timeZoneOffsetMs(new Date(naive), timeZone);
  return new Date(naive - timeZoneOffsetMs(new Date(first), timeZone));
}

function nextDayYmd(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// A busy period can span several studio-local days (vacations, overnight
// blocks). Emit one segment per touched local day so day-keyed slot filters
// see every affected day, not just the start day.
export function splitBusyIntervalIntoDaySegments(
  start: Date,
  end: Date,
  timeZone?: string | null,
): { day: string; time: string; duration: number }[] {
  const tz = studioTimeZone(timeZone);
  const endMs = end.getTime();
  const out: { day: string; time: string; duration: number }[] = [];
  let cursor = start.getTime();
  if (!Number.isFinite(cursor) || !Number.isFinite(endMs)) return out;
  // 400-day guard against malformed events.
  for (let guard = 0; cursor < endMs && guard < 400; guard += 1) {
    const { day, time } = localDayTime(new Date(cursor), tz);
    const nextMidnight = wallTimeToUtc(nextDayYmd(day), "00:00", tz).getTime();
    if (nextMidnight <= cursor) break;
    const segmentEnd = Math.min(endMs, nextMidnight);
    out.push({
      day,
      time,
      duration: Math.max(1, Math.round((segmentEnd - cursor) / 60000)),
    });
    cursor = nextMidnight;
  }
  return out;
}

function freeBusyRangeRequestBody(
  from: string,
  to: string,
  calendarId?: string | null,
  timeZone?: string | null,
) {
  // Exact studio-local day window. Google clamps busy periods to it, so a
  // multi-day event queried mid-range still yields segments for these days.
  const tz = studioTimeZone(timeZone);
  return {
    timeMin: wallTimeToUtc(from, "00:00", tz).toISOString(),
    timeMax: wallTimeToUtc(nextDayYmd(to), "00:00", tz).toISOString(),
    timeZone: tz,
    items: [{ id: calId(calendarId) }],
  };
}

export function deriveRangeIntervalsFromFreeBusy(
  json: unknown,
  calendarId?: string | null,
  timeZone?: string | null,
): { day: string; time: string; duration: number }[] {
  if (!json || typeof json !== "object") return [];
  const target = calId(calendarId);
  const root = json as {
    calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
  };
  const busy = root.calendars?.[target]?.busy ?? [];
  const out: { day: string; time: string; duration: number }[] = [];
  for (const b of busy) {
    out.push(...splitBusyIntervalIntoDaySegments(new Date(b.start), new Date(b.end), timeZone));
  }
  return out;
}

export async function getGoogleBusyIntervalsInRange(
  from: string,
  to: string,
  calendarId?: string | null,
  timeZone?: string | null,
): Promise<{ day: string; time: string; duration: number }[]> {
  if (!isGoogleConfigured(calendarId)) return [];
  try {
    const token = await getAuthToken();
    if (!token) return [];
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(freeBusyRangeRequestBody(from, to, calendarId, timeZone)),
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text().catch(() => "");
    const json = parseJsonBody(text);
    if (!res.ok) {
      console.error(`[google-calendar] freeBusy range failed ${res.status}: ${text}`);
      return [];
    }
    const calendarErrors = extractCalendarErrors(json, calendarId);
    if (calendarErrors) {
      console.error("[google-calendar] freeBusy range calendar errors", {
        calendarErrors,
        rawResponse: json ?? text,
      });
    }
    return deriveRangeIntervalsFromFreeBusy(json, calendarId, timeZone);
  } catch (err) {
    console.error("[google-calendar] freeBusy range error", normalizeException(err));
    return [];
  }
}

function parseJsonBody(text: string): JsonValue | null {
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return null;
  }
}

export function deriveIntervalsFromFreeBusy(
  day: string,
  json: unknown,
  calendarId?: string | null,
  timeZone?: string | null,
): { time: string; duration: number }[] {
  const out: { time: string; duration: number }[] = [];
  for (const seg of deriveRangeIntervalsFromFreeBusy(json, calendarId, timeZone)) {
    if (seg.day === day) out.push({ time: seg.time, duration: seg.duration });
  }
  return out;
}

function extractCalendarErrors(json: unknown, calendarId?: string | null): JsonValue | null {
  if (!json || typeof json !== "object") return null;
  const target = calId(calendarId);
  const root = json as { calendars?: Record<string, { errors?: JsonValue }> };
  return root.calendars?.[target]?.errors ?? null;
}

export async function createGoogleEvent(input: CreateInput): Promise<string | null> {
  if (!isGoogleConfigured(input.calendarId)) return null;
  try {
    const token = await getAuthToken();
    if (!token) return null;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId(input.calendarId))}/events`;
    const body = {
      summary:
        input.source === "block"
          ? "Blockiert"
          : `${input.treatment} — ${input.clientName}`,
      description: `${input.studioName ?? "Thai Posture Lab"} Buchung\nTelefon: ${input.clientPhone ?? "—"}\nQuelle: ${input.source}`,
      start: { dateTime: `${input.day}T${input.time}:00`, timeZone: "Europe/Zurich" },
      end: {
        dateTime: addMinutesIso(input.day, input.time, input.durationMinutes),
        timeZone: "Europe/Zurich",
      },
      colorId: input.source === "block" ? "8" : "5",
    };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[google-calendar] createEvent failed ${res.status}: ${text}`);
      return null;
    }
    const json = (await res.json()) as { id?: string };
    return json.id ?? null;
  } catch (err) {
    console.error("[google-calendar] createEvent error", normalizeException(err));
    return null;
  }
}

export async function deleteGoogleEvent(
  eventId: string,
  calendarId?: string | null,
): Promise<void> {
  if (!isGoogleConfigured(calendarId) || !eventId) return;
  try {
    const token = await getAuthToken();
    if (!token) return;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId(calendarId))}/events/${encodeURIComponent(eventId)}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      const text = await res.text().catch(() => "");
      console.error(`[google-calendar] deleteEvent failed ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error("[google-calendar] deleteEvent error", normalizeException(err));
  }
}

export async function getGoogleBusyIntervals(
  day: string,
  calendarId?: string | null,
  timeZone?: string | null,
): Promise<{ time: string; duration: number }[]> {
  if (!isGoogleConfigured(calendarId)) return [];
  try {
    const token = await getAuthToken();
    if (!token) return [];
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(freeBusyRangeRequestBody(day, day, calendarId, timeZone)),
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text().catch(() => "");
    const json = parseJsonBody(text);
    if (!res.ok) {
      console.error(`[google-calendar] freeBusy failed ${res.status}: ${text}`);
      return [];
    }
    const calendarErrors = extractCalendarErrors(json, calendarId);
    if (calendarErrors) {
      console.error("[google-calendar] freeBusy calendar errors", {
        calendarErrors,
        rawResponse: json ?? text,
      });
    }
    return deriveIntervalsFromFreeBusy(day, json, calendarId, timeZone);
  } catch (err) {
    console.error("[google-calendar] freeBusy error", normalizeException(err));
    return [];
  }
}
