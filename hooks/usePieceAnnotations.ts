import { useCallback, useEffect, useState } from "react";
import {
  fetchPieceAnnotations,
  GschemaAnnotationSchema,
} from "../lib/gschema-annotations";

export function usePieceAnnotations(pieceId: string | string[] | undefined) {
  const [annotations, setAnnotations] = useState<GschemaAnnotationSchema[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPieceAnnotations(id);
      setAnnotations(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch annotations"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!pieceId || Array.isArray(pieceId)) return;
    load(pieceId);
  }, [pieceId, load]);

  return {
    annotations,
    setAnnotations,
    loading,
    error,
    reload: () => {
      if (pieceId && !Array.isArray(pieceId)) {
        return load(pieceId);
      }
      return Promise.resolve();
    },
  };
}
