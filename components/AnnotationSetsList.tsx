import type { GschemaAnnotationSchema } from "../lib/gschema-annotations";
import {
  formatMeasureRangeShort,
  getLowestMeasure,
  getMeasureRangeForDisplay,
} from "../lib/gschema-annotations";

type Props = {
  annotations: GschemaAnnotationSchema[];
  canDelete: (schema: GschemaAnnotationSchema) => boolean;
  onDelete: (gschemaPieceId: string) => void;
  deletingId: string | null;
  onGoToMeasure?: (measure: number) => void;
};

const formatTypeLabel = (type: string) =>
  type.charAt(0).toUpperCase() + type.slice(1);

export default function AnnotationSetsList({
  annotations,
  canDelete,
  onDelete,
  deletingId,
  onGoToMeasure,
}: Props) {
  if (annotations.length === 0) {
    return <p className="text-gray-500 text-sm">No saved annotations yet.</p>;
  }

  return (
    <div className="space-y-6">
      {annotations.map((schema) => {
        const { start, end } = getMeasureRangeForDisplay(schema);
        const measureLabel = formatMeasureRangeShort(start, end);
        const lowestMeasure = getLowestMeasure(schema);

        return (
          <div
            key={schema.gschemaPieceId}
            className="bg-gray-50 rounded-lg p-4"
          >
            <div className="mb-4">
              <h4
                className={`text-base font-semibold text-gray-900 mb-2 ${
                  schema.contributor ? "cursor-help" : ""
                }`}
                title={
                  schema.contributor
                    ? `Annotated by ${schema.contributor}`
                    : undefined
                }
              >
                {schema.schemaName}
              </h4>
              {(measureLabel || canDelete(schema)) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {measureLabel &&
                    (lowestMeasure != null && onGoToMeasure ? (
                      <button
                        type="button"
                        onClick={() => onGoToMeasure(lowestMeasure)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Go to {measureLabel}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-600">
                        {measureLabel}
                      </span>
                    ))}
                  {canDelete(schema) && (
                    <button
                      type="button"
                      onClick={() => onDelete(schema.gschemaPieceId)}
                      disabled={deletingId === schema.gschemaPieceId}
                      className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {deletingId === schema.gschemaPieceId
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  )}
                </div>
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
