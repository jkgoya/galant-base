import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import dynamic from "next/dynamic";

const VerovioScore = dynamic(() => import("../../../components/VerovioScore"), {
  ssr: false,
});

interface PieceProps {
  id: string;
  title: string;
  composer: string;
  format: string;
  createdAt: string;
  meiData: string;
  contributor?: {
    email: string;
  };
}

interface GschemaEvent {
  id: string;
  gschemaId: string | null;
  index: number;
  type: string;
  value: string;
}

interface Schema {
  id: string;
  name: string;
  type: string;
  eventcount: number;
  events: GschemaEvent[];
}

type TemporaryAnnotation = {
  id: string; // Unique ID for the temporary annotation
  gschema_event_id: string;
  noteId: string;
  measure: number;
  type: string;
  value: string;
};

export default function AnnotatePiece() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [piece, setPiece] = useState<PieceProps | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  //const [selectedMeiIds, setSelectedMeiIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<Schema | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<{
    gschema_event_id: string;
    type: string;
    value: string;
  } | null>(null);
  const [temporaryAnnotations, setTemporaryAnnotations] = useState<
    TemporaryAnnotation[]
  >([]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user?.email) {
      router.push("/api/auth/signin");
      return;
    }

    const fetchPiece = async () => {
      try {
        const response = await fetch(`/api/pieces/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch piece");
        }
        const data = await response.json();
        setPiece(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    const fetchSchemas = async () => {
      try {
        const response = await fetch("/api/schemata");
        if (!response.ok) {
          throw new Error("Failed to fetch schemas");
        }
        const data = await response.json();
        setSchemas(data);
      } catch (err) {
        console.error("Failed to fetch schemas:", err);
      }
    };

    if (id) {
      fetchPiece();
      fetchSchemas();
    }
  }, [id, session, status, router]);

  const handleDragStart = (
    e: React.DragEvent,
    gschema_event_id: string,
    type: string,
    value: string
  ) => {
    const dragData = { gschema_event_id, type, value };
    setSelectedEvent(dragData);
    console.log("Drag start:", dragData);
  };

  const handleTouchStart = (
    e: React.TouchEvent,
    gschema_event_id: string,
    type: string,
    value: string
  ) => {
    e.preventDefault();
    const dragData = { gschema_event_id, type, value };
    setSelectedEvent(dragData);
    console.log("Touch start:", dragData);
  };

  const handleSchemaEventClick = (
    gschema_event_id: string,
    type: string,
    value: string
  ) => {
    // If this event is already in temporary annotations, remove it
    if (isEventInTemporaryAnnotations(gschema_event_id)) {
      removeTemporaryAnnotationByEventId(gschema_event_id);
      return;
    }

    // Otherwise, select it for annotation
    const eventData = { gschema_event_id, type, value };
    setSelectedEvent(eventData);
    console.log("Selected event:", eventData);
  };

  const handleDrop = (selectedId: string, measure: number) => {
    // Check if we have a drag event or a selected event
    //const eventToUse = currentDragEvent || selectedEvent;

    if (!selectedId || !selectedEvent) {
      return;
    }
    console.log("Drop/Click:", selectedId, measure);

    // Add to temporary annotations
    const newAnnotation: TemporaryAnnotation = {
      id: Math.random().toString(36).substr(2, 9), // Generate a unique ID
      gschema_event_id: selectedEvent.gschema_event_id,
      noteId: selectedId,
      measure: measure,
      type: selectedEvent.type,
      value: selectedEvent.value,
    };

    setTemporaryAnnotations((prev) => [...prev, newAnnotation]);
    //setCurrentDragEvent(null);
    setSelectedEvent(null); // Clear selection after annotation
  };

  const removeTemporaryAnnotation = (id: string) => {
    setTemporaryAnnotations((prev) => prev.filter((ann) => ann.id !== id));
  };

  const removeTemporaryAnnotationByEventId = (gschema_event_id: string) => {
    setTemporaryAnnotations((prev) =>
      prev.filter((ann) => ann.gschema_event_id !== gschema_event_id)
    );
  };

  const isEventInTemporaryAnnotations = (gschema_event_id: string) => {
    return temporaryAnnotations.some(
      (ann) => ann.gschema_event_id === gschema_event_id
    );
  };

  const submitTemporaryAnnotations = async () => {
    if (temporaryAnnotations.length === 0 || !selectedSchema) {
      setError("No annotations to submit or no schema selected");
      return;
    }

    setIsSubmitting(true);
    try {
      let measurestart = Infinity;
      let measureend = 0;
      // Get the Gschema_event IDs for each annotation
      const annotations = await Promise.all(
        temporaryAnnotations.map(async (annotation) => {
          const event = annotation.gschema_event_id;
          measurestart = Math.min(measurestart, annotation.measure);
          measureend = Math.max(measureend, annotation.measure);

          return {
            eventId: event,
            noteId: annotation.noteId,
          };
        })
      );

      const response = await fetch(`/api/pieces/${id}/gschema-annotations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gschemaId: selectedSchema.id,
          annotations,
          measurestart: measurestart,
          measureend: measureend,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to create Gschema annotations: ${
            errorData.error || response.statusText
          }`
        );
      }

      // Clear temporary annotations after successful submission
      setTemporaryAnnotations([]);
    } catch (err) {
      console.error("Error submitting annotations:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!piece) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Piece not found</div>
      </div>
    );
  }

  // Build event table for selected schema
  const eventTable = selectedSchema
    ? {
        melody: Array(selectedSchema.eventcount).fill(""),
        bass: Array(selectedSchema.eventcount).fill(""),
        meter: Array(selectedSchema.eventcount).fill(""),
        figures: Array(selectedSchema.eventcount).fill(""),
        roman: Array(selectedSchema.eventcount).fill(""),
      }
    : null;
  const eventTableid = selectedSchema
    ? {
        melody: Array(selectedSchema.eventcount).fill(""),
        bass: Array(selectedSchema.eventcount).fill(""),
        meter: Array(selectedSchema.eventcount).fill(""),
        figures: Array(selectedSchema.eventcount).fill(""),
        roman: Array(selectedSchema.eventcount).fill(""),
      }
    : null;

  if (selectedSchema && eventTable) {
    selectedSchema.events.forEach((ev) => {
      if (eventTable[ev.type] && ev.index < selectedSchema.eventcount) {
        eventTable[ev.type][ev.index] = ev.value;
        eventTableid[ev.type][ev.index] = ev.id;
      }
    });
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Annotate: {piece.title}</h1>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "2rem",
            width: "100%",
          }}
        >
          {/* Score Section */}
          <div
            className="bg-white shadow rounded-lg p-6"
            style={{ flexGrow: 1 }}
          >
            <h2 className="text-xl font-semibold mb-4">Score</h2>
            <div className="border rounded-lg p-4">
              <VerovioScore
                meiData={piece.meiData}
                onDrop={handleDrop}
                onClick={handleDrop}
                temporaryAnnotations={temporaryAnnotations}
                onRemoveAnnotation={(id) => {
                  removeTemporaryAnnotation(id);
                }}
                isEventSelected={!!selectedEvent}
              />
            </div>
          </div>
          {/* Schema Section */}
          <div
            className="bg-white shadow rounded-lg p-6"
            style={{ width: "300px", flexShrink: 0 }}
          >
            <div>
              <h2 className="text-xl font-semibold mb-4">Schema</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Schema
                </label>
                <select
                  value={selectedSchema?.id || ""}
                  onChange={(e) => {
                    const schema = schemas.find((s) => s.id === e.target.value);
                    setSelectedSchema(schema || null);
                    // Clear temporary annotations when schema changes
                    setTemporaryAnnotations([]);
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select a schema...</option>
                  {schemas.map((schema) => (
                    <option key={schema.id} value={schema.id}>
                      {schema.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSchema && eventTable && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <table
                    style={{
                      marginBottom: "1rem",
                      borderCollapse: "collapse",
                      fontSize: "0.9rem",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "0.25rem" }}>
                          Type
                        </th>
                        {Array.from(
                          { length: selectedSchema.eventcount },
                          (_, idx) => (
                            <th
                              key={idx}
                              style={{ padding: "0.25rem", width: "2.5rem" }}
                            >
                              Event {idx + 1}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {["melody", "bass", "meter", "figures", "roman"].map(
                        (type) => (
                          <tr key={type}>
                            <td
                              style={{
                                fontWeight: "bold",
                                textTransform: "capitalize",
                                padding: "0.25rem",
                              }}
                            >
                              {type}
                            </td>
                            {Array.from(
                              { length: selectedSchema.eventcount },
                              (_, idx) => (
                                <td
                                  key={idx}
                                  style={{
                                    padding: "0.25rem",
                                    textAlign: "center",
                                  }}
                                >
                                  {type === "bass" || type === "melody" ? (
                                    <div
                                      draggable={
                                        !isEventInTemporaryAnnotations(
                                          eventTableid[type][idx]
                                        )
                                      }
                                      onDragStart={(e) => {
                                        if (
                                          !isEventInTemporaryAnnotations(
                                            eventTableid[type][idx]
                                          )
                                        ) {
                                          handleDragStart(
                                            e,
                                            eventTableid[type][idx],
                                            type,
                                            eventTable[type][idx]
                                          );
                                        }
                                      }}
                                      onClick={() => {
                                        handleSchemaEventClick(
                                          eventTableid[type][idx],
                                          type,
                                          eventTable[type][idx]
                                        );
                                      }}
                                      style={{
                                        width: "2rem",
                                        height: "2rem",
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        margin: "0 auto",
                                        backgroundColor:
                                          type === "bass" ? "white" : "black",
                                        color:
                                          type === "bass" ? "black" : "white",
                                        border: isEventInTemporaryAnnotations(
                                          eventTableid[type][idx]
                                        )
                                          ? "2px solid #ccc"
                                          : selectedEvent?.gschema_event_id ===
                                            eventTableid[type][idx]
                                          ? "2px solid #3b82f6"
                                          : "1px solid #ccc",
                                        fontSize: "0.9rem",
                                        fontWeight: "bold",
                                        cursor: isEventInTemporaryAnnotations(
                                          eventTableid[type][idx]
                                        )
                                          ? "pointer"
                                          : "pointer",
                                        touchAction: "none",
                                        userSelect: "none",
                                        WebkitUserSelect: "none",
                                        WebkitTouchCallout: "none",
                                        opacity: isEventInTemporaryAnnotations(
                                          eventTableid[type][idx]
                                        )
                                          ? 0.4
                                          : 1,
                                        transition:
                                          "opacity 0.2s ease-in-out, border 0.2s ease-in-out",
                                      }}
                                    >
                                      {eventTable[type][idx]}
                                    </div>
                                  ) : (
                                    <div
                                      onClick={() => {
                                        handleSchemaEventClick(
                                          eventTableid[type][idx],
                                          type,
                                          eventTable[type][idx]
                                        );
                                      }}
                                      style={{
                                        cursor: "pointer",
                                        opacity: isEventInTemporaryAnnotations(
                                          eventTableid[type][idx]
                                        )
                                          ? 0.4
                                          : 1,
                                        transition: "opacity 0.2s ease-in-out",
                                        padding: "0.25rem",
                                        borderRadius: "0.25rem",
                                        backgroundColor:
                                          selectedEvent?.gschema_event_id ===
                                          eventTableid[type][idx]
                                            ? "#dbeafe"
                                            : "transparent",
                                        border:
                                          selectedEvent?.gschema_event_id ===
                                          eventTableid[type][idx]
                                            ? "1px solid #3b82f6"
                                            : "none",
                                      }}
                                    >
                                      {eventTable[type][idx]}
                                    </div>
                                  )}
                                </td>
                              )
                            )}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {/* Pending Annotations Section */}
            <div className="mt-8">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Pending Annotations</h2>
                  <button
                    onClick={submitTemporaryAnnotations}
                    disabled={isSubmitting || temporaryAnnotations.length === 0}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Submit All"}
                  </button>
                  <button
                    onClick={() => setTemporaryAnnotations([])}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Clear All
                  </button>
                </div>
                {temporaryAnnotations.length === 0 ? (
                  <p className="text-gray-500">No pending annotations</p>
                ) : (
                  <ul className="space-y-2">
                    {temporaryAnnotations.map((annotation) => (
                      <li
                        key={annotation.id}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded"
                      >
                        <div>
                          <span className="font-medium">
                            {annotation.gschema_event_id}
                          </span>{" "}
                          {annotation.noteId + " " + annotation.measure}
                        </div>
                        <button
                          onClick={() =>
                            removeTemporaryAnnotation(annotation.id)
                          }
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
