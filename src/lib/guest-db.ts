import { promises as fs } from "node:fs";
import path from "node:path";
import { google } from "googleapis";

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

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

type SheetMeta = {
  sheetName: string;
  sheetId: number;
};

type SheetSnapshot = {
  sheetName: string;
  sheetId: number;
  header: string[];
  headerMap: Map<string, number>;
  rows: string[][];
};

const EXPECTED_HEADERS = [
  "id",
  "name",
  "phone",
  "rsvp",
  "plusOnes",
  "scope",
  "createdAt",
  "updatedAt",
];

const SHEET_ID = process.env.GOOGLE_SHEET_ID ?? "";
const SHEET_NAME_ENV = process.env.GOOGLE_SHEET_NAME ?? "";
const USE_SHEETS = Boolean(SHEET_ID);

const IS_VERCEL = process.env.VERCEL === '1';
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

let sheetsClientPromise: Promise<ReturnType<typeof google.sheets>> | null = null;
let sheetMetaPromise: Promise<SheetMeta> | null = null;

async function loadServiceAccount(): Promise<ServiceAccount> {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (email && key) {
    return {
      client_email: email,
      private_key: key.replace(/\\n/g, "\n"),
    };
  }

  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEYFILE;
  if (keyFile) {
    const raw = await fs.readFile(keyFile, "utf8");
    const parsed = JSON.parse(raw) as ServiceAccount;
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), "saki-key.json"), "utf8");
      const parsed = JSON.parse(raw) as ServiceAccount;
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      };
    } catch {
      // Ignore missing local dev key.
    }
  }

  throw new Error(
    "Missing Google service account credentials. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
  );
}

async function getSheetsClient() {
  if (!sheetsClientPromise) {
    sheetsClientPromise = (async () => {
      const serviceAccount = await loadServiceAccount();
      const auth = new google.auth.JWT({
        email: serviceAccount.client_email,
        key: serviceAccount.private_key.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      return google.sheets({ version: "v4", auth });
    })();
  }
  return sheetsClientPromise;
}

async function getSheetMeta(): Promise<SheetMeta> {
  if (!sheetMetaPromise) {
    sheetMetaPromise = (async () => {
      if (!SHEET_ID) {
        throw new Error("GOOGLE_SHEET_ID is not configured.");
      }
      const sheets = await getSheetsClient();
      const res = await sheets.spreadsheets.get({
        spreadsheetId: SHEET_ID,
        fields: "sheets(properties(sheetId,title))",
      });
      const available = res.data.sheets?.map((sheet) => sheet.properties) ?? [];
      const target =
        (SHEET_NAME_ENV
          ? available.find((sheet) => sheet?.title === SHEET_NAME_ENV)
          : available[0]) ?? null;
      if (!target?.title || typeof target.sheetId !== "number") {
        throw new Error("Unable to resolve Google Sheet tab name.");
      }
      return { sheetName: target.title, sheetId: target.sheetId };
    })();
  }
  return sheetMetaPromise;
}

function toHeaderMap(header: string[]) {
  const map = new Map<string, number>();
  header.forEach((value, index) => {
    const key = value.trim();
    if (key) {
      map.set(key, index);
      map.set(key.toLowerCase(), index);
    }
  });
  return map;
}

async function initializeSheetIfNeeded(
  sheets: ReturnType<typeof google.sheets>,
  meta: SheetMeta,
  rows: string[][]
) {
  const headerRow = rows[0] ?? [];
  const normalized = headerRow.map((value) => value.trim().toLowerCase());
  const hasRequired = EXPECTED_HEADERS.every((key) => normalized.includes(key.toLowerCase()));

  if (rows.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${meta.sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [EXPECTED_HEADERS] },
    });
    return true;
  }

  if (!hasRequired) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: meta.sheetId,
                dimension: "ROWS",
                startIndex: 0,
                endIndex: 1,
              },
              inheritFromBefore: false,
            },
          },
        ],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${meta.sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [EXPECTED_HEADERS] },
    });
    return true;
  }

  return false;
}

async function readSheet(allowInit = true): Promise<SheetSnapshot> {
  const sheets = await getSheetsClient();
  const meta = await getSheetMeta();
  const range = `${meta.sheetName}!A1:H`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  });
  const rows = (res.data.values ?? []) as string[][];
  if (allowInit) {
    const didInit = await initializeSheetIfNeeded(sheets, meta, rows);
    if (didInit) {
      return readSheet(false);
    }
  }
  const header = rows[0] ?? EXPECTED_HEADERS;
  const headerMap = toHeaderMap(header);
  return { sheetName: meta.sheetName, sheetId: meta.sheetId, header, headerMap, rows };
}

function getCell(row: string[], headerMap: Map<string, number>, key: string) {
  const index = headerMap.get(key) ?? headerMap.get(key.toLowerCase());
  if (typeof index !== "number") {
    return "";
  }
  return row[index] ?? "";
}

function rowToGuest(row: string[], headerMap: Map<string, number>, rowNumber: number): Guest {
  const id = getCell(row, headerMap, "id") || `row_${rowNumber}`;
  const name = getCell(row, headerMap, "name");
  const phone = getCell(row, headerMap, "phone");
  const rsvpValue = getCell(row, headerMap, "rsvp").toLowerCase();
  const rsvp =
    rsvpValue === "yes" || rsvpValue === "no" || rsvpValue === "maybe"
      ? (rsvpValue as RsvpChoice)
      : null;
  const plusOnes = Number(getCell(row, headerMap, "plusOnes") ?? 0);
  const scopeRaw = getCell(row, headerMap, "scope");
  const scope = scopeRaw === "wedding" ? "wedding" : "all";
  const createdAt = getCell(row, headerMap, "createdAt") || nowIso();
  const updatedAt = getCell(row, headerMap, "updatedAt") || nowIso();
  return {
    id,
    name,
    phone,
    rsvp,
    plusOnes: clampPlusOnes(plusOnes),
    scope,
    createdAt,
    updatedAt,
  };
}

function guestToRow(guest: Guest) {
  return [
    guest.id,
    guest.name,
    guest.phone,
    guest.rsvp ?? "",
    String(guest.plusOnes ?? 0),
    guest.scope,
    guest.createdAt,
    guest.updatedAt,
  ];
}

async function updateSheetRow(rowNumber: number, guest: Guest) {
  const sheets = await getSheetsClient();
  const meta = await getSheetMeta();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${meta.sheetName}!A${rowNumber}:H${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [guestToRow(guest)] },
  });
}

async function appendSheetRow(guest: Guest) {
  const sheets = await getSheetsClient();
  const meta = await getSheetMeta();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${meta.sheetName}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [guestToRow(guest)] },
  });
}

async function deleteSheetRow(rowNumber: number) {
  const sheets = await getSheetsClient();
  const meta = await getSheetMeta();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: meta.sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
}

type SheetRow = {
  guest: Guest;
  rowNumber: number;
};

async function listSheetRows(): Promise<SheetRow[]> {
  const snapshot = await readSheet();
  const dataRows = snapshot.rows.slice(1);
  const rows: SheetRow[] = [];
  dataRows.forEach((row, index) => {
    if (!row.some((cell) => String(cell).trim() !== "")) {
      return;
    }
    const rowNumber = index + 2;
    rows.push({
      guest: rowToGuest(row, snapshot.headerMap, rowNumber),
      rowNumber,
    });
  });
  return rows;
}

async function ensurePersistentId(row: SheetRow) {
  if (row.guest.id.startsWith("row_")) {
    row.guest.id = createId();
    row.guest.updatedAt = nowIso();
    await updateSheetRow(row.rowNumber, row.guest);
  }
  return row.guest;
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
  if (USE_SHEETS) {
    const rows = await listSheetRows();
    const match = rows.find((row) => row.guest.phone === normalized) ?? null;
    return match ? await ensurePersistentId(match) : null;
  }
  const db = await readDb();
  return db.guests.find((guest) => guest.phone === normalized) ?? null;
}

export async function listGuests() {
  if (USE_SHEETS) {
    const rows = await listSheetRows();
    const guests: Guest[] = [];
    for (const row of rows) {
      guests.push(await ensurePersistentId(row));
    }
    return guests.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
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

    if (USE_SHEETS) {
      const rows = await listSheetRows();
      const match =
        rows.find(
          (row) =>
            row.guest.phone === normalized &&
            normalizeName(row.guest.name) === normalizedName
        ) ?? rows.find((row) => row.guest.phone === normalized);

      if (match) {
        const guest = {
          ...match.guest,
          id: match.guest.id.startsWith("row_") ? createId() : match.guest.id,
          name: trimmedName,
          updatedAt: nowIso(),
        };
        await updateSheetRow(match.rowNumber, guest);
        return guest;
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
      await appendSheetRow(guest);
      return guest;
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

    if (USE_SHEETS) {
      const rows = await listSheetRows();
      let match =
        rows.find(
          (row) =>
            row.guest.phone === normalized &&
            normalizeName(row.guest.name) === normalizedName
        ) ?? rows.find((row) => row.guest.phone === normalized);

      if (!match) {
        const timestamp = nowIso();
        const guest: Guest = {
          id: createId(),
          name: trimmedName,
          phone: normalized,
          rsvp: params.rsvp,
          plusOnes: clampPlusOnes(params.plusOnes),
          scope: params.scope,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        await appendSheetRow(guest);
        return guest;
      }

      const guest: Guest = {
        ...match.guest,
        id: match.guest.id.startsWith("row_") ? createId() : match.guest.id,
        name: trimmedName,
        rsvp: params.rsvp,
        plusOnes: clampPlusOnes(params.plusOnes),
        scope: params.scope,
        updatedAt: nowIso(),
      };
      await updateSheetRow(match.rowNumber, guest);
      return guest;
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

    if (USE_SHEETS) {
      const rows = await listSheetRows();
      let match =
        rows.find(
          (row) =>
            row.guest.phone === normalized &&
            normalizeName(row.guest.name) === normalizedName
        ) ?? rows.find((row) => row.guest.phone === normalized);

      if (!match) {
        const timestamp = nowIso();
        const guest: Guest = {
          id: createId(),
          name: trimmedName,
          phone: normalized,
          rsvp: params.rsvp,
          plusOnes: clampPlusOnes(params.plusOnes),
          scope: params.scope,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        await appendSheetRow(guest);
        return guest;
      }

      const guest: Guest = {
        ...match.guest,
        id: match.guest.id.startsWith("row_") ? createId() : match.guest.id,
        name: trimmedName,
        rsvp: params.rsvp,
        plusOnes: clampPlusOnes(params.plusOnes),
        scope: params.scope,
        updatedAt: nowIso(),
      };
      await updateSheetRow(match.rowNumber, guest);
      return guest;
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
    if (USE_SHEETS) {
      const rows = await listSheetRows();
      const match = rows.find((row) => row.guest.id === id);
      if (!match) {
        return false;
      }
      await deleteSheetRow(match.rowNumber);
      return true;
    }
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
