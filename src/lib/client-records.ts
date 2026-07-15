import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ClientData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
};

type ClientRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string | null;
};

type DbClient = SupabaseClient<Database>;

export function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizeForMatch(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeClientData(clientData: ClientData) {
  return {
    firstName: normalizeText(clientData.firstName),
    lastName: normalizeText(clientData.lastName),
    email: normalizeText(clientData.email).toLowerCase(),
    phone: normalizePhone(clientData.phone),
    street: normalizeText(clientData.street),
    zip: normalizeText(clientData.zip),
    city: normalizeText(clientData.city),
  };
}

function sortByOldest(rows: ClientRecord[]) {
  return [...rows].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return aTime - bTime;
  });
}

export async function getOrCreateClient(supabase: DbClient, clientData: ClientData) {
  const client = normalizeClientData(clientData);
  const firstNameKey = normalizeForMatch(client.firstName);
  const lastNameKey = normalizeForMatch(client.lastName);

  async function updateExisting(id: string, mergedDuplicates = 0) {
    const update = await supabase
      .from("clients")
      .update({
        first_name: client.firstName,
        last_name: client.lastName,
        email: client.email,
        phone: client.phone,
        street: client.street,
        zip: client.zip,
        city: client.city,
      })
      .eq("id", id)
      .select("id")
      .single();

    if (update.error) throw new Error(update.error.message);
    return { id: update.data.id, created: false as const, mergedDuplicates };
  }

  const { data: possibleMatches, error: findError } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email, created_at")
    .ilike("first_name", `%${client.firstName}%`)
    .ilike("last_name", `%${client.lastName}%`)
    .order("created_at", { ascending: true });

  if (findError) throw new Error(findError.message);

  const matches = (possibleMatches ?? []).filter(
    (row) => normalizeForMatch(row.first_name) === firstNameKey && normalizeForMatch(row.last_name) === lastNameKey,
  );

  if (matches.length > 0) {
    const [keeper, ...duplicates] = sortByOldest(matches);
    const duplicateIds = duplicates.map((row) => row.id);

    if (duplicateIds.length > 0) {
      const bookingsMove = await supabase.from("bookings").update({ client_id: keeper.id }).in("client_id", duplicateIds);
      if (bookingsMove.error) throw new Error(bookingsMove.error.message);

      const logsMove = await supabase.from("session_logs").update({ client_id: keeper.id }).in("client_id", duplicateIds);
      if (logsMove.error) throw new Error(logsMove.error.message);

      const duplicateDelete = await supabase.from("clients").delete().in("id", duplicateIds);
      if (duplicateDelete.error) throw new Error(duplicateDelete.error.message);
    }

    return updateExisting(keeper.id, duplicateIds.length);
  }

  const insert = await supabase
    .from("clients")
    .insert({
      first_name: client.firstName,
      last_name: client.lastName,
      email: client.email,
      phone: client.phone,
      street: client.street,
      zip: client.zip,
      city: client.city,
    })
    .select("id")
    .single();

  if (insert.error) {
    if (insert.error.code === "23505") {
      const retry = await supabase
        .from("clients")
        .select("id, first_name, last_name, email, created_at")
        .ilike("first_name", `%${client.firstName}%`)
        .ilike("last_name", `%${client.lastName}%`)
        .order("created_at", { ascending: true });

      if (retry.error) throw new Error(retry.error.message);
      const existing = (retry.data ?? []).find(
        (row) => normalizeForMatch(row.first_name) === firstNameKey && normalizeForMatch(row.last_name) === lastNameKey,
      );
      if (existing) return updateExisting(existing.id);
    }
    throw new Error(insert.error.message);
  }
  return { id: insert.data.id, created: true as const, mergedDuplicates: 0 };
}