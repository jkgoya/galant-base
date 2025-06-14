import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.method === "POST") {
    const { gschemaId, events, email } = req.body;

    try {
      const result = await prisma.gschema_event.createMany({
        data: events.map((event: any) => ({
          ...event,
          gschemaId,
          authorId: email,
        })),
      });
      res.json(result);
    } catch (error) {
      console.error("Error creating schema events:", error);
      res.status(500).json({ error: "Error creating schema events" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
} 