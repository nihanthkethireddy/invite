import { promises as fs } from "node:fs";
import path from "node:path";

export type RsvpChoice = "yes" | "no" | "maybe";

export type Guest = {
  id: string;
  name: string;
  phone: string;
  rsvp: RsvpChoice | null;
  plusOnes: number;
  scope: "all" | "wedding";
  createdAt: string;
  updatedAt: string;
};

type GuestDb = {
  guests: Guest[];
};

const IS_VERCEL = process.env.VERCEL === "1";
const SOURCE_DB_PATH = path.join(process.cwd(), "data", "guests.json");
const DB_PATH = IS_VERCEL ? path.join("/tmp", "guests.json") : SOURCE_DB_PATH;

let writeQueue: Promise<unknown> = Promise.resolve();

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "").trim();
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return `g_${Math.random().toString(36).slice(2, 10)}`;
}

async function readDb(): Promise<GuestDb> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as GuestDb;
    if (!parsed.guests) {
      return { guests: [] };
    }
    parsed.guests = parsed.guests.map((guest) => ({
      ...guest,
      scope: guest.scope ?? "all",
    }));
    return parsed;
  } catch {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    let seed: GuestDb = { guests: [] };

    try {
      const rawSeed = await fs.readFile(SOURCE_DB_PATH, "utf8");
      const parsed = JSON.parse(rawSeed) as GuestDb;
      if (Array.isArray(parsed.guests)) {
        seed = parsed;
      }
    } catch {
      // No seed file available; start empty.
    }

    await fs.writeFile(DB_PATH, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
}

async function writeDb(db: GuestDb) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function withWriteLock<T>(task: () => Promise<T>) {
  const next = writeQueue.then(task, task);
  writeQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

function clampPlusOnes(value: number) {
  return Math.max(0, Math.min(10, Number.isFinite(value) ? Math.floor(value) : 0));
}

export async function getGuestByPhone(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return null;
  }
  const db = await readDb();
  return db.guests.find((guest) => guest.phone === normalized) ?? null;
}

export async function listGuests() {
  const db = await readDb();
  return [...db.guests].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function upsertGuestProfile(name: string, phone: string) {
  return withWriteLock(async () => {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      throw new Error("Invalid phone number");
    }

    const trimmedName = name.trim();
    const normalizedName = normalizeName(trimmedName);
    if (!trimmedName) {
      throw new Error("Name is required");
    }

    const db = await readDb();
    const existing =
      db.guests.find(
        (guest) =>
          guest.phone === normalized && normalizeName(guest.name) === normalizedName
      ) ?? db.guests.find((guest) => guest.phone === normalized);

    if (existing) {
      existing.name = trimmedName;
      existing.updatedAt = nowIso();
      await writeDb(db);
      return existing;
    }

    const timestamp = nowIso();
    const guest: Guest = {
      id: createId(),
      name: trimmedName,
      phone: normalized,
      rsvp: null,
      plusOnes: 0,
      scope: "all",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.guests.push(guest);
    await writeDb(db);
    return guest;
  });
}

export async function saveRsvp(params: {
  name: string;
  phone: string;
  rsvp: RsvpChoice;
  plusOnes: number;
  scope: "all" | "wedding";
}) {
  return withWriteLock(async () => {
    const normalized = normalizePhone(params.phone);
    const trimmedName = params.name.trim();
    const normalizedName = normalizeName(trimmedName);

    if (!normalized) {
      throw new Error("Invalid phone number");
    }

    if (!trimmedName) {
      throw new Error("Name is required");
    }

    const db = await readDb();
    let guest =
      db.guests.find(
        (item) =>
          item.phone === normalized && normalizeName(item.name) === normalizedName
      ) ?? db.guests.find((item) => item.phone === normalized);

    if (!guest) {
      const timestamp = nowIso();
      guest = {
        id: createId(),
        name: trimmedName,
        phone: normalized,
        rsvp: null,
        plusOnes: 0,
        scope: params.scope,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.guests.push(guest);
    }

    guest.name = trimmedName;
    guest.rsvp = params.rsvp;
    guest.plusOnes = clampPlusOnes(params.plusOnes);
    guest.scope = params.scope;
    guest.updatedAt = nowIso();

    await writeDb(db);
    return guest;
  });
}

export async function adminAddOrUpdateGuest(params: {
  name: string;
  phone: string;
  rsvp: RsvpChoice | null;
  plusOnes: number;
  scope: "all" | "wedding";
}) {
  return withWriteLock(async () => {
    const normalized = normalizePhone(params.phone);
    const trimmedName = params.name.trim();
    const normalizedName = normalizeName(trimmedName);

    if (!normalized) {
      throw new Error("Invalid phone number");
    }

    if (!trimmedName) {
      throw new Error("Name is required");
    }

    const db = await readDb();
    let guest =
      db.guests.find(
        (item) =>
          item.phone === normalized && normalizeName(item.name) === normalizedName
      ) ?? db.guests.find((item) => item.phone === normalized);

    if (!guest) {
      const timestamp = nowIso();
      guest = {
        id: createId(),
        name: trimmedName,
        phone: normalized,
        rsvp: params.rsvp,
        plusOnes: clampPlusOnes(params.plusOnes),
        scope: params.scope,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.guests.push(guest);
    } else {
      guest.name = trimmedName;
      guest.rsvp = params.rsvp;
      guest.plusOnes = clampPlusOnes(params.plusOnes);
      guest.scope = params.scope;
      guest.updatedAt = nowIso();
    }

    await writeDb(db);
    return guest;
  });
}

export async function deleteGuestById(id: string) {
  return withWriteLock(async () => {
    const db = await readDb();
    const before = db.guests.length;
    db.guests = db.guests.filter((guest) => guest.id !== id);

    if (db.guests.length === before) {
      return false;
    }

    await writeDb(db);
    return true;
  });
}
