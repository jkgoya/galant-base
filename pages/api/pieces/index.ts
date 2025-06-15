import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { options as authOptions } from "../auth/[...nextauth]";
import prisma from "../../../lib/prisma";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const { title, composer, meiData, email, format } = req.body;
  if (!title || !composer || !meiData || !email || !format) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    // Check if piece already exists
    const existingPiece = await prisma.piece.findFirst({
      where: {
        title: title,
        composer: composer,
      },
    });

    if (existingPiece) {
      return res.status(400).json({
        error: "This piece has already been added to the database",
        existingPieceId: existingPiece.id,
      });
    }

    const piece = await prisma.piece.create({
      data: {
        title,
        composer,
        meiData,
        format,
        contributor: {
          connect: { email: session.user.email },
        },
      },
    });
    res.status(201).json(piece);
  } catch (error) {
    console.error("Error creating piece:", error);
    res.status(500).json({ error: "Failed to create piece" });
  }
}
