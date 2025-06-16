import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { options as authOptions } from "../auth/[...nextauth]";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.method === "GET") {
    try {
      const schemas = await prisma.gschema.findMany({
        where: {
          active: true,
        },
        include: {
          events: true,
        },
      });

      return res.status(200).json(schemas);
    } catch (error) {
      console.error("Error fetching schemas:", error);
      return res.status(500).json({ error: "Failed to fetch schemas" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
