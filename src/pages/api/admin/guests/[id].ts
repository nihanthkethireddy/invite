import type { NextApiRequest, NextApiResponse } from "next";
import { deleteGuestById } from "@/lib/guest-db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const idParam = req.query.id;
    const id = String(Array.isArray(idParam) ? idParam[0] : idParam ?? "");
    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    const deleted = await deleteGuestById(id);
    if (!deleted) {
      return res.status(404).json({ error: "Guest not found" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
