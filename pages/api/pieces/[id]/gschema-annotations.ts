import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { options as authOptions } from "../../auth/[...nextauth]";
import prisma from "../../../../lib/prisma";
import {
  AnnotationDeleteError,
  deleteGschemaPieceAnnotation,
  getPieceGschemaAnnotations,
} from "../../../../lib/gschema-annotations";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const pieceId = String(id);

  if (req.method === "GET") {
    try {
      const transformedData = await getPieceGschemaAnnotations(pieceId);
      res.json(transformedData);
    } catch (error) {
      console.error("Error fetching annotations:", error);
      res.status(500).json({ error: "Failed to fetch annotations" });
    }
  } else if (req.method === "POST") {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { gschemaId, annotations, measurestart, measureend } = req.body;

    if (!gschemaId || !annotations?.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const gschemaPiece = await prisma.gschema_Piece.create({
        data: {
          piece: {
            connect: {
              id: pieceId,
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
          measurestart: measurestart || undefined,
          measureend: measureend || undefined,
        },
      });

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
  } else if (req.method === "DELETE") {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { gschemaPieceId } = req.body;

    if (!gschemaPieceId || typeof gschemaPieceId !== "string") {
      return res.status(400).json({ error: "Missing gschemaPieceId" });
    }

    try {
      await deleteGschemaPieceAnnotation(
        pieceId,
        gschemaPieceId,
        session.user.email
      );
      return res.status(204).end();
    } catch (error) {
      if (error instanceof AnnotationDeleteError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("Error deleting annotation:", error);
      return res.status(500).json({ error: "Failed to delete annotation" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
