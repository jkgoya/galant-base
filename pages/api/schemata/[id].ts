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

  const { id } = req.query;

  if (req.method === "PUT") {
    const { name, citation, type } = req.body;

    try {
      const result = await prisma.gschema.update({
        where: { id: String(id) },
        data: {
          name,
          citation,
          type,
        },
      });
      res.json(result);
    } catch (error) {
      console.error("Error updating schema:", error);
      res.status(500).json({ error: "Error updating schema" });
    }
  } else if (req.method === "DELETE") {
    try {
      const result = await prisma.gschema.delete({
        where: { id: String(id) },
      });
      res.json(result);
    } catch (error) {
      console.error("Error deleting schema:", error);
      res.status(500).json({ error: "Error deleting schema" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
} 