import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { options as authOptions } from "../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  const id = req.query.id as string;

  if (req.method === "GET") {
    // Allow public access for reading piece data
    const piece = await prisma.piece.findUnique({
      where: { id },
      include: {
        contributor: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!piece) {
      res.status(404).json({ error: "Piece not found" });
      return;
    }

    const serializedPiece = {
      ...piece,
      createdAt: piece.createdAt.toISOString(),
      updatedAt: piece.updatedAt.toISOString(),
    };
    res.json(serializedPiece);
  } else if (req.method === "PUT" || req.method === "DELETE") {
    // Require authentication for modifications
    if (!session) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const piece = await prisma.piece.findUnique({
      where: { id },
      include: {
        contributor: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!piece || piece.contributor?.email !== session.user.email) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    if (req.method === "PUT") {
      const { title, composer, meiData } = req.body;
      const data: any = {};
      if (title !== undefined) data.title = title;
      if (composer !== undefined) data.composer = composer;
      if (meiData !== undefined) data.meiData = meiData;

      try {
        const updatedPiece = await prisma.piece.update({
          where: { id },
          data,
        });
        const serializedPiece = {
          ...updatedPiece,
          createdAt: updatedPiece.createdAt.toISOString(),
          updatedAt: updatedPiece.updatedAt.toISOString(),
        };
        res.status(200).json(serializedPiece);
      } catch (error) {
        console.error("Failed to update piece:", error);
        res
          .status(500)
          .json({ error: "Failed to update piece", details: error.message });
      }
    } else if (req.method === "DELETE") {
      await prisma.piece.delete({ where: { id } });
      res.json({ success: true });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
