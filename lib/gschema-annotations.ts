import prisma from "./prisma";

export type GschemaAnnotationSchema = {
  schemaId: string;
  schemaName: string;
  eventCount: number;
  schemaType: string;
  contributor: string;
  measureStart?: number;
  measureEnd?: number;
  events: Array<{
    id: string;
    gschemaId: string | null;
    index: number;
    type: string;
    value: string;
  }>;
  annotations: Array<{
    id: string;
    gschema_event_id: string;
    noteId: string;
    type: string;
    value: string;
  }>;
};

type GschemaPieceWithRelations = Awaited<
  ReturnType<typeof fetchGschemaPiecesForPiece>
>[number];

export async function fetchGschemaPiecesForPiece(pieceId: string) {
  return prisma.gschema_Piece.findMany({
    where: { pieceId },
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
}

export function transformGschemaPieceAnnotations(
  gschemaPieces: GschemaPieceWithRelations[]
): GschemaAnnotationSchema[] {
  return gschemaPieces.map((gschemaPiece) => ({
    schemaId: gschemaPiece.gschema?.id || "",
    schemaName: gschemaPiece.gschema?.name || "",
    eventCount: gschemaPiece.gschema?.eventcount || 0,
    schemaType: gschemaPiece.gschema?.type || "",
    contributor:
      gschemaPiece.contributor?.name ||
      gschemaPiece.contributor?.email ||
      "",
    measureStart: gschemaPiece.measurestart ?? undefined,
    measureEnd: gschemaPiece.measureend ?? undefined,
    events: gschemaPiece.gschema?.events || [],
    annotations: gschemaPiece.annotations.map((annotation) => ({
      id: annotation.id,
      gschema_event_id: annotation.Gschema_eventId,
      noteId: annotation.piece_location || "",
      type: annotation.Gschema_event?.type || "",
      value: annotation.Gschema_event?.value || "",
    })),
  }));
}

export async function getPieceGschemaAnnotations(
  pieceId: string
): Promise<GschemaAnnotationSchema[]> {
  const gschemaPieces = await fetchGschemaPiecesForPiece(pieceId);
  return transformGschemaPieceAnnotations(gschemaPieces);
}
