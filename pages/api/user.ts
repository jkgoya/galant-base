import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import prisma from "../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.method === "PUT") {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Invalid name" });
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { email: session.user.email },
        data: { name },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      return res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({ error: "Failed to update user" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
} 