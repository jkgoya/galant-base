import type { GschemaAnnotationSchema } from "../lib/gschema-annotations";
import { formatMeasureRange } from "../lib/gschema-annotations";

type Props = {
  annotations: GschemaAnnotationSchema[];
  canDelete: (schema: GschemaAnnotationSchema) => boolean;
  onDelete: (gschemaPieceId: string) => void;
  deletingId: string | null;
};

const formatTypeLabel = (type: string) =>
  type.charAt(0).toUpperCase() + type.slice(1);

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
      {annotations.map((schema) => {
        const measureRange = formatMeasureRange(
          schema.measureStart,
          schema.measureEnd
        );

        return (
          <div
            key={schema.gschemaPieceId}
            className="bg-gray-50 rounded-lg p-4"
          >
            <div className="mb-4 flex justify-between items-start gap-4">
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-1">
                  {schema.schemaName}
                </h4>
                {measureRange && (
                  <p className="text-sm text-gray-600">{measureRange}</p>
                )}
                {schema.contributor && (
                  <p className="text-sm text-gray-500">by {schema.contributor}</p>
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

            {schema.annotations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-1.5 pr-3 font-medium text-gray-600">
                        Type
                      </th>
                      <th className="text-left py-1.5 pr-3 font-medium text-gray-600">
                        Event
                      </th>
                      <th className="text-left py-1.5 pr-3 font-medium text-gray-600">
                        Scale degree
                      </th>
                      <th className="text-left py-1.5 pr-3 font-medium text-gray-600">
                        Measure
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...schema.annotations]
                      .sort(
                        (a, b) =>
                          (a.measure ?? 0) - (b.measure ?? 0) ||
                          a.eventIndex - b.eventIndex ||
                          a.type.localeCompare(b.type)
                      )
                      .map((ann) => (
                        <tr key={ann.id} className="border-b border-gray-100">
                          <td className="py-1.5 pr-3 capitalize text-gray-800">
                            {formatTypeLabel(ann.type)}
                          </td>
                          <td className="py-1.5 pr-3 text-gray-800">
                            {ann.eventIndex + 1}
                          </td>
                          <td className="py-1.5 pr-3 font-semibold text-gray-900">
                            {ann.value}
                          </td>
                          <td className="py-1.5 pr-3 text-gray-600">
                            {ann.measure != null ? ann.measure : "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No placements recorded.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
