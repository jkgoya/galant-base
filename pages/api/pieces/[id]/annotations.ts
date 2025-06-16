import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { options as authOptions } from "../../auth/[...nextauth]";
import prisma from "../../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const annotations = await prisma.annotation.findMany({
        where: {
          pieceId: String(id),
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json(annotations);
    } catch (error) {
      console.error("Error fetching annotations:", error);
      return res.status(500).json({ error: "Failed to fetch annotations" });
    }
  }

  if (req.method === "POST") {
    const { content, type, uri, selectedMeiIds } = req.body;

    if (!content || !type || !selectedMeiIds?.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const annotation = await prisma.annotation.create({
        data: {
          content,
          type,
          uri: type === "link" ? uri : null,
          selectedMeiIds,
          piece: {
            connect: {
              id: String(id),
            },
          },
          user: {
            connect: {
              email: session.user.email,
            },
          },
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      return res.status(201).json(annotation);
    } catch (error) {
      console.error("Error creating annotation:", error);
      return res.status(500).json({ error: "Failed to create annotation" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
