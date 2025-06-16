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

  if (req.method === "POST") {
    const { gschemaId, annotations } = req.body;

    if (!gschemaId || !annotations?.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // First create the Gschema_Piece entry
      const gschemaPiece = await prisma.gschema_Piece.create({
        data: {
          piece: {
            connect: {
              id: String(id),
            },
          },
          gschema: {
            connect: {
              id: gschemaId,
            },
          },
          contributor: {
            connect: {
              email: session.user.email,
            },
          },
        },
      });

      // Then create the Gschema_event_Piece entries for each annotation
      const gschemaEventPieces = await Promise.all(
        annotations.map(
          async (annotation: { eventId: string; noteId: string }) => {
            return prisma.gschema_event_Piece.create({
              data: {
                Gschema_Piece: {
                  connect: {
                    id: gschemaPiece.id,
                  },
                },
                Gschema_event: {
                  connect: {
                    id: annotation.eventId,
                  },
                },
                piece_location: annotation.noteId,
              },
            });
          }
        )
      );

      return res.status(201).json({
        gschemaPiece,
        gschemaEventPieces,
      });
    } catch (error) {
      console.error("Error creating Gschema annotations:", error);
      return res
        .status(500)
        .json({ error: "Failed to create Gschema annotations" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
