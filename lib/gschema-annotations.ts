export type GschemaAnnotationEvent = {
  id: string;
  gschema_event_id: string;
  noteId: string;
  type: string;
  value: string;
};

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
  annotations: GschemaAnnotationEvent[];
};

export const GSCHEMA_EVENT_TYPES = [
  "melody",
  "bass",
  "meter",
  "figures",
  "roman",
] as const;

export async function fetchPieceAnnotations(
  pieceId: string
): Promise<GschemaAnnotationSchema[]> {
  const response = await fetch(`/api/pieces/${pieceId}/gschema-annotations`);
  if (!response.ok) {
    throw new Error("Failed to fetch annotations");
  }
  return response.json();
}
