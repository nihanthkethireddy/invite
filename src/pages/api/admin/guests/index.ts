import type { NextApiRequest, NextApiResponse } from "next";
import { adminAddOrUpdateGuest, listGuests } from "@/lib/guest-db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      const guests = await listGuests();
      return res.status(200).json({ guests });
    }

    if (req.method === "POST") {
      const name = String(req.body?.name ?? "");
      const phone = String(req.body?.phone ?? "");
      const rsvpRaw = req.body?.rsvp;
      const rsvp =
        rsvpRaw === "yes" || rsvpRaw === "no" || rsvpRaw === "maybe"
          ? rsvpRaw
          : null;
      const plusOnes = Number(req.body?.plusOnes ?? 0);
      const scopeRaw = String(req.body?.scope ?? "all");
      const scope = scopeRaw === "wedding" ? "wedding" : "all";

      const guest = await adminAddOrUpdateGuest({
        name,
        phone,
        rsvp,
        plusOnes,
        scope,
      });

      return res.status(200).json({ guest });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(400).json({ error: message });
  }
}
