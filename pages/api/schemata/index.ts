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
    const { name, citation, type, events, email } = req.body;

    try {
      const result = await prisma.gschema.create({
        data: {
          name,
          citation,
          type,
          author: { connect: { email } },
          events: {
            create: events.map((event: any) => ({
              ...event,
              author: { connect: { email } },
            })),
          },
        },
      });
      res.json(result);
    } catch (error) {
      console.error("Error creating schema:", error);
      res.status(500).json({ error: "Error creating schema" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
} 