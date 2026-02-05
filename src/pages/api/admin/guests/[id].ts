import type { NextApiRequest, NextApiResponse } from "next";
import { deleteGuestById } from "@/lib/guest-db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = String(req.query.id ?? "");
  if (!id) {
    return res.status(400).json({ error: "id is required" });
  }

  const deleted = await deleteGuestById(id);
  if (!deleted) {
    return res.status(404).json({ error: "Guest not found" });
  }

  return res.status(200).json({ ok: true });
}
