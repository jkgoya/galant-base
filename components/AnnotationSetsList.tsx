import type { GschemaAnnotationSchema } from "../lib/gschema-annotations";

type Props = {
  annotations: GschemaAnnotationSchema[];
  canDelete: (schema: GschemaAnnotationSchema) => boolean;
  onDelete: (gschemaPieceId: string) => void;
  deletingId: string | null;
};

export default function AnnotationSetsList({
  annotations,
  canDelete,
  onDelete,
  deletingId,
}: Props) {
  if (annotations.length === 0) {
    return <p className="text-gray-500 text-sm">No saved annotations yet.</p>;
  }

  return (
    <div className="space-y-6">
      {annotations.map((schema) => (
        <div
          key={schema.gschemaPieceId}
          className="bg-gray-50 rounded-lg p-4"
        >
          <div className="mb-4 flex justify-between items-start gap-4">
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-1">
                {schema.schemaName}
              </h4>
              {schema.contributor && (
                <p className="text-sm text-gray-600">by {schema.contributor}</p>
              )}
            </div>
            {canDelete(schema) && (
              <button
                type="button"
                onClick={() => onDelete(schema.gschemaPieceId)}
                disabled={deletingId === schema.gschemaPieceId}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 shrink-0"
              >
                {deletingId === schema.gschemaPieceId ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b border-gray-300">Type</th>
                  {Array.from({ length: schema.eventCount }, (_, idx) => (
                    <th
                      key={idx}
                      className="p-2 w-12 text-center border-b border-gray-300"
                    >
                      Event {idx + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {["melody", "bass", "meter", "figures", "roman"].map((type) => (
                  <tr key={type}>
                    <td className="font-semibold text-gray-700 p-2 border-b border-gray-200 capitalize">
                      {type}
                    </td>
                    {Array.from({ length: schema.eventCount }, (_, idx) => {
                      const event = schema.events.find(
                        (ev) => ev.type === type && ev.index === idx
                      );
                      const isAnnotated = schema.annotations.some(
                        (ann) => ann.gschema_event_id === event?.id
                      );

                      return (
                        <td
                          key={idx}
                          className={`p-2 text-center border-b border-gray-200 ${
                            isAnnotated ? "bg-blue-50" : ""
                          }`}
                        >
                          {type === "bass" || type === "melody" ? (
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-sm font-bold border ${
                                type === "bass"
                                  ? "bg-white text-black border-gray-400"
                                  : "bg-black text-white border-gray-400"
                              } ${isAnnotated ? "border-blue-500" : ""}`}
                            >
                              {event?.value || ""}
                            </div>
                          ) : (
                            <span
                              className={
                                isAnnotated
                                  ? "text-blue-800 font-bold"
                                  : "text-gray-700"
                              }
                            >
                              {event?.value || ""}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
