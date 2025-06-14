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
  const { title, composer, scoreFormat, meiData, email } = req.body;
  if (!title || !composer || !scoreFormat || !meiData || !email) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const piece = await prisma.piece.create({
      data: {
        title,
        composer,
        meiData,
        contributor: { connect: { email } },
      },
    });
    res.status(201).json(piece);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
