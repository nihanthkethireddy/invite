import type { NextApiRequest, NextApiResponse } from "next";
import { getGuestByPhone, upsertGuestProfile } from "@/lib/guest-db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      const phone = String(req.query.phone ?? "");
      if (!phone) {
        return res.status(400).json({ error: "phone is required" });
      }
      const guest = await getGuestByPhone(phone);
      return res.status(200).json({ guest });
    }

    if (req.method === "POST") {
      const name = String(req.body?.name ?? "");
      const phone = String(req.body?.phone ?? "");
      const guest = await upsertGuestProfile(name, phone);
      return res.status(200).json({ guest });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(400).json({ error: message });
  }
}
