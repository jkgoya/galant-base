import {
  GSCHEMA_EVENT_TYPES,
  GschemaAnnotationSchema,
} from "../lib/gschema-annotations";

type Props = {
  schemas: GschemaAnnotationSchema[];
};

export default function GschemaAnnotationTables({ schemas }: Props) {
  if (schemas.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Annotations
        </h3>
      </div>
      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:px-6">
          <div className="space-y-6">
            {schemas.map((schema) => (
              <div
                key={schema.schemaId}
                className="bg-gray-50 rounded-lg p-6"
              >
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">
                    {schema.schemaName}
                  </h4>
                  {schema.contributor && (
                    <p className="text-sm text-gray-600">
                      by {schema.contributor}
                    </p>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="text-left p-2 border-b border-gray-300">
                          Type
                        </th>
                        {Array.from(
                          { length: schema.eventCount },
                          (_, idx) => (
                            <th
                              key={idx}
                              className="p-2 w-12 text-center border-b border-gray-300"
                            >
                              Event {idx + 1}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {GSCHEMA_EVENT_TYPES.map((type) => (
                        <tr key={type}>
                          <td className="font-semibold text-gray-700 p-2 border-b border-gray-200 capitalize">
                            {type}
                          </td>
                          {Array.from(
                            { length: schema.eventCount },
                            (_, idx) => {
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
                                      } ${
                                        isAnnotated ? "border-blue-500" : ""
                                      }`}
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
                            }
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
