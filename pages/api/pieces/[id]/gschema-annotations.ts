import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { options as authOptions } from "../../auth/[...nextauth]";
import prisma from "../../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (req.method === "GET") {
    // Allow public access for reading annotations
    try {
      const annotations = await prisma.gschema_Piece.findMany({
        where: {
          pieceId: String(id),
        },
        include: {
          gschema: {
            include: {
              events: true,
            },
          },
          annotations: {
            include: {
              Gschema_event: true,
            },
          },
          contributor: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      // Transform the data to include complete schema information
      const transformedData = annotations.map((gschemaPiece) => ({
        schemaId: gschemaPiece.gschema?.id || "",
        schemaName: gschemaPiece.gschema?.name || "",
        eventCount: gschemaPiece.gschema?.eventcount || 0,
        schemaType: gschemaPiece.gschema?.type || "",
        contributor:
          gschemaPiece.contributor?.name ||
          gschemaPiece.contributor?.email ||
          "",
        measureStart: gschemaPiece.measurestart,
        measureEnd: gschemaPiece.measureend,
        events: gschemaPiece.gschema?.events || [],
        annotations: gschemaPiece.annotations.map((annotation) => ({
          id: annotation.id,
          gschema_event_id: annotation.Gschema_eventId,
          noteId: annotation.piece_location || "",
          type: annotation.Gschema_event?.type || "",
          value: annotation.Gschema_event?.value || "",
        })),
      }));

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
          measurestart: measurestart || undefined, // Only include if measurestart exists
          measureend: measureend || undefined,
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
