import { JWT } from "google-auth-library";

const CALENDAR_ID = () => process.env.GOOGLE_CALENDAR_ID ?? "";
const SA_EMAIL = () => process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
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

const SA_KEY = () => normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);

function describeKeyShape(): {
  rawLength: number;
  normalizedLength: number;
  startsWithBeginMarker: boolean;
  endsWithEndMarker: boolean;
  newlineCount: number;
  containsLiteralBackslashN: boolean;
  hasSurroundingQuotes: boolean;
} {
  const raw = process.env.GOOGLE_PRIVATE_KEY ?? "";
  const trimmed = raw.trim();
  const hasSurroundingQuotes =
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")));
  const normalized = normalizePrivateKey(raw);
  return {
    rawLength: raw.length,
    normalizedLength: normalized.length,
    startsWithBeginMarker: normalized.startsWith(PEM_BEGIN),
    endsWithEndMarker:
      normalized.endsWith(PEM_END) || normalized.endsWith(`${PEM_END}\n`),
    newlineCount: (normalized.match(/\n/g) ?? []).length,
    containsLiteralBackslashN: /\\n/.test(raw),
    hasSurroundingQuotes,
  };
}

export function isGoogleConfigured(): boolean {
  return Boolean(CALENDAR_ID() && SA_EMAIL() && SA_KEY());
}

let cachedClient: JWT | null = null;
let cachedToken: { token: string; exp: number } | null = null;

async function getAuthToken(): Promise<string | null> {
  if (!isGoogleConfigured()) return null;
  const now = Date.now();
  if (cachedToken && cachedToken.exp - 60_000 > now) return cachedToken.token;
  if (!cachedClient) {
    cachedClient = new JWT({
      email: SA_EMAIL(),
      key: SA_KEY(),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
  }
  const res = await cachedClient.getAccessToken();
  const token = res?.token ?? null;
  if (!token) return null;
  // google-auth-library exposes expiry via credentials.expiry_date
  const exp = cachedClient.credentials.expiry_date ?? now + 55 * 60 * 1000;
  cachedToken = { token, exp };
  return token;
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
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type GoogleException = { message: string; stack: string | null };

function normalizeException(err: unknown): GoogleException {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack ?? null };
  }
  return { message: String(err), stack: null };
}

function freeBusyRequestBody(day: string) {
  // Generous UTC window that safely covers the full Zurich day regardless of DST.
  const timeMin = new Date(`${day}T00:00:00Z`);
  timeMin.setUTCHours(timeMin.getUTCHours() - 3);
  const timeMax = new Date(`${day}T23:59:59Z`);
  timeMax.setUTCHours(timeMax.getUTCHours() + 3);
  return {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    timeZone: "Europe/Zurich",
    items: [{ id: CALENDAR_ID() }],
  };
}

function parseJsonBody(text: string): JsonValue | null {
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return null;
  }
}

function deriveIntervalsFromFreeBusy(
  day: string,
  json: unknown,
): { time: string; duration: number }[] {
  if (!json || typeof json !== "object") return [];
  const calendarId = CALENDAR_ID();
  const root = json as {
    calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
  };
  const busy = root.calendars?.[calendarId]?.busy ?? [];
  const fmt = new Intl.DateTimeFormat("de-CH", {
    timeZone: "Europe/Zurich",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const out: { time: string; duration: number }[] = [];
  for (const b of busy) {
    const start = new Date(b.start);
    const end = new Date(b.end);
    const parts = fmt.formatToParts(start);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const localDay = `${get("year")}-${get("month")}-${get("day")}`;
    if (localDay !== day) continue;
    const hh = get("hour");
    const mm = get("minute");
    const duration = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 60000),
    );
    out.push({ time: `${hh}:${mm}`, duration });
  }
  return out;
}

function extractCalendarErrors(json: unknown): JsonValue | null {
  if (!json || typeof json !== "object") return null;
  const calendarId = CALENDAR_ID();
  const root = json as { calendars?: Record<string, { errors?: JsonValue }> };
  return root.calendars?.[calendarId]?.errors ?? null;
}

export async function createGoogleEvent(input: CreateInput): Promise<string | null> {
  if (!isGoogleConfigured()) return null;
  try {
    const token = await getAuthToken();
    if (!token) return null;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID())}/events`;
    const body = {
      summary:
        input.source === "block"
          ? "Blockiert"
          : `${input.treatment} — ${input.clientName}`,
      description: `Thai Posture Lab Buchung\nTelefon: ${input.clientPhone ?? "—"}\nQuelle: ${input.source}`,
      start: { dateTime: `${input.day}T${input.time}:00`, timeZone: "Europe/Zurich" },
      end: {
        dateTime: addMinutesIso(input.day, input.time, input.durationMinutes),
        timeZone: "Europe/Zurich",
      },
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

export async function deleteGoogleEvent(eventId: string): Promise<void> {
  if (!isGoogleConfigured() || !eventId) return;
  try {
    const token = await getAuthToken();
    if (!token) return;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID())}/events/${encodeURIComponent(eventId)}`;
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
): Promise<{ time: string; duration: number }[]> {
  if (!isGoogleConfigured()) return [];
  try {
    const token = await getAuthToken();
    if (!token) return [];
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(freeBusyRequestBody(day)),
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text().catch(() => "");
    const json = parseJsonBody(text);
    if (!res.ok) {
      console.error(`[google-calendar] freeBusy failed ${res.status}: ${text}`);
      return [];
    }
    const calendarErrors = extractCalendarErrors(json);
    if (calendarErrors) {
      console.error("[google-calendar] freeBusy calendar errors", {
        calendarErrors,
        rawResponse: json ?? text,
      });
    }
    return deriveIntervalsFromFreeBusy(day, json);
  } catch (err) {
    console.error("[google-calendar] freeBusy error", normalizeException(err));
    return [];
  }
}

export async function debugGoogleCalendarDay(day: string): Promise<{
  configured: boolean;
  accessTokenOk: boolean;
  keyShape: ReturnType<typeof describeKeyShape>;
  freeBusyRaw: {
    ok: boolean;
    status: number;
    statusText: string;
    bodyText: string;
    bodyJson: JsonValue | null;
  } | null;
  derivedIntervals: { time: string; duration: number }[];
  exceptions: GoogleException[];
}> {
  const exceptions: GoogleException[] = [];
  const configured = isGoogleConfigured();
  const keyShape = describeKeyShape();
  let accessTokenOk = false;
  let freeBusyRaw: {
    ok: boolean;
    status: number;
    statusText: string;
    bodyText: string;
    bodyJson: JsonValue | null;
  } | null = null;
  let derivedIntervals: { time: string; duration: number }[] = [];

  try {
    const token = await getAuthToken();
    accessTokenOk = Boolean(token);
    if (!token) {
      return { configured, accessTokenOk, keyShape, freeBusyRaw, derivedIntervals, exceptions };
    }

    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(freeBusyRequestBody(day)),
      signal: AbortSignal.timeout(5000),
    });
    const bodyText = await res.text();
    const bodyJson = parseJsonBody(bodyText);
    freeBusyRaw = {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      bodyText,
      bodyJson,
    };

    if (!res.ok) {
      console.error(`[google-calendar] debug freeBusy failed ${res.status}: ${bodyText}`);
    }
    const calendarErrors = extractCalendarErrors(bodyJson);
    if (calendarErrors) {
      console.error("[google-calendar] debug freeBusy calendar errors", {
        calendarErrors,
        rawResponse: bodyJson ?? bodyText,
      });
    }
    if (res.ok && bodyJson) {
      derivedIntervals = deriveIntervalsFromFreeBusy(day, bodyJson);
    }
  } catch (err) {
    const normalized = normalizeException(err);
    exceptions.push(normalized);
    console.error("[google-calendar] debug freeBusy exception", normalized);
  }

  return { configured, accessTokenOk, keyShape, freeBusyRaw, derivedIntervals, exceptions };
}