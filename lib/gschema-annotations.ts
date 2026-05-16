import prisma from "./prisma";

export type GschemaAnnotationSchema = {
  gschemaPieceId: string;
  schemaId: string;
  schemaName: string;
  eventCount: number;
  schemaType: string;
  contributor: string;
  contributorEmail: string;
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
    measure?: number;
    eventIndex: number;
  }>;
};

/** Lowest measure among saved placements, or stored measureStart when present. */
export function getLowestMeasure(
  schema: GschemaAnnotationSchema
): number | null {
  if (schema.measureStart != null) return schema.measureStart;
  const measures = schema.annotations
    .map((a) => a.measure)
    .filter((m): m is number => m != null);
  return measures.length > 0 ? Math.min(...measures) : null;
}

export function formatMeasureRange(
  measureStart?: number,
  measureEnd?: number
): string | null {
  if (measureStart == null && measureEnd == null) return null;
  if (
    measureStart != null &&
    measureEnd != null &&
    measureStart === measureEnd
  ) {
    return `Measure ${measureStart}`;
  }
  if (measureStart != null && measureEnd != null) {
    return `Measures ${measureStart}–${measureEnd}`;
  }
  if (measureStart != null) return `From measure ${measureStart}`;
  if (measureEnd != null) return `Through measure ${measureEnd}`;
  return null;
}

/** Short measure label for links, e.g. "m. 1" or "mm. 1–5". */
export function formatMeasureRangeShort(
  measureStart?: number,
  measureEnd?: number
): string | null {
  if (measureStart == null && measureEnd == null) return null;
  if (
    measureStart != null &&
    measureEnd != null &&
    measureStart === measureEnd
  ) {
    return `m. ${measureStart}`;
  }
  if (measureStart != null && measureEnd != null) {
    return `mm. ${measureStart}–${measureEnd}`;
  }
  if (measureStart != null) return `m. ${measureStart}`;
  if (measureEnd != null) return `m. ${measureEnd}`;
  return null;
}

export function getMeasureRangeForDisplay(
  schema: GschemaAnnotationSchema
): { start?: number; end?: number } {
  if (schema.measureStart != null || schema.measureEnd != null) {
    return { start: schema.measureStart, end: schema.measureEnd };
  }
  const measures = schema.annotations
    .map((a) => a.measure)
    .filter((m): m is number => m != null);
  if (measures.length === 0) return {};
  return { start: Math.min(...measures), end: Math.max(...measures) };
}

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
    gschemaPieceId: gschemaPiece.id,
    schemaId: gschemaPiece.gschema?.id || "",
    schemaName: gschemaPiece.gschema?.name || "",
    eventCount: gschemaPiece.gschema?.eventcount || 0,
    schemaType: gschemaPiece.gschema?.type || "",
    contributor:
      gschemaPiece.contributor?.name ||
      gschemaPiece.contributor?.email ||
      "",
    contributorEmail: gschemaPiece.contributor?.email || "",
    measureStart: gschemaPiece.measurestart ?? undefined,
    measureEnd: gschemaPiece.measureend ?? undefined,
    events: gschemaPiece.gschema?.events || [],
    annotations: gschemaPiece.annotations.map((annotation) => {
      const event = gschemaPiece.gschema?.events.find(
        (ev) => ev.id === annotation.Gschema_eventId
      );
      return {
        id: annotation.id,
        gschema_event_id: annotation.Gschema_eventId,
        noteId: annotation.piece_location || "",
        type: annotation.Gschema_event?.type || "",
        value: annotation.Gschema_event?.value || "",
        measure: annotation.measure ?? undefined,
        eventIndex: event?.index ?? 0,
      };
    }),
  }));
}

export async function getPieceGschemaAnnotations(
  pieceId: string
): Promise<GschemaAnnotationSchema[]> {
  const gschemaPieces = await fetchGschemaPiecesForPiece(pieceId);
  return transformGschemaPieceAnnotations(gschemaPieces);
}

export class AnnotationDeleteError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AnnotationDeleteError";
    this.status = status;
  }
}

export async function deleteGschemaPieceAnnotation(
  pieceId: string,
  gschemaPieceId: string,
  userEmail: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    throw new AnnotationDeleteError("Unauthorized", 401);
  }

  const gschemaPiece = await prisma.gschema_Piece.findFirst({
    where: {
      id: gschemaPieceId,
      pieceId,
    },
  });

  if (!gschemaPiece) {
    throw new AnnotationDeleteError("Annotation not found", 404);
  }

  const isAuthor = gschemaPiece.contributorId === user.id;
  if (!user.isAdmin && !isAuthor) {
    throw new AnnotationDeleteError("Forbidden", 403);
  }

  await prisma.$transaction([
    prisma.gschema_event_Piece.deleteMany({
      where: { Gschema_PieceId: gschemaPieceId },
    }),
    prisma.gschema_Piece.delete({
      where: { id: gschemaPieceId },
    }),
  ]);
}
