import type { NextApiRequest, NextApiResponse } from "next";
import { saveRsvp } from "@/lib/guest-db";

const VALID = new Set(["yes", "no", "maybe"]);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const name = String(req.body?.name ?? "");
    const phone = String(req.body?.phone ?? "");
    const rsvpRaw = String(req.body?.rsvp ?? "").toLowerCase();
    const plusOnes = Number(req.body?.plusOnes ?? 0);

    if (!VALID.has(rsvpRaw)) {
      return res.status(400).json({ error: "Invalid RSVP choice" });
    }

    const guest = await saveRsvp({
      name,
      phone,
      rsvp: rsvpRaw as "yes" | "no" | "maybe",
      plusOnes,
    });

    return res.status(200).json({ guest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(400).json({ error: message });
  }
}
