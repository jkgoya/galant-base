import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import dynamic from "next/dynamic";

const VerovioScore = dynamic(() => import("../../../components/VerovioScore"), {
  ssr: false,
});

interface Annotation {
  id: string;
  content: string;
  type: "text" | "link";
  uri?: string;
  selectedMeiIds: string[];
  createdAt: string;
  user: {
    email: string;
  };
}

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

export default function AnnotatePiece() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [piece, setPiece] = useState<PieceProps | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedMeiIds, setSelectedMeiIds] = useState<string[]>([]);
  const [annotationContent, setAnnotationContent] = useState("");
  const [annotationType, setAnnotationType] = useState<"text" | "link">("text");
  const [annotationUri, setAnnotationUri] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const fetchAnnotations = async () => {
      try {
        const response = await fetch(`/api/pieces/${id}/annotations`);
        if (!response.ok) {
          throw new Error("Failed to fetch annotations");
        }
        const data = await response.json();
        setAnnotations(data);
      } catch (err) {
        console.error("Failed to fetch annotations:", err);
      }
    };

    if (id) {
      fetchPiece();
      fetchAnnotations();
    }
  }, [id, session, status, router]);

  const handleScoreSelection = (selectedIds: string[]) => {
    console.log("Selection received in annotate page:", {
      selectedIds,
      count: selectedIds.length,
      currentSelection: selectedMeiIds,
      willUpdate:
        selectedIds.length !== selectedMeiIds.length ||
        !selectedIds.every((id, i) => id === selectedMeiIds[i]),
    });
    setSelectedMeiIds(selectedIds);
  };

  const handleSubmitAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeiIds.length) {
      setError("Please select a part of the score first");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/pieces/${id}/annotations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: annotationContent,
          type: annotationType,
          uri: annotationType === "link" ? annotationUri : undefined,
          selectedMeiIds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create annotation");
      }

      const newAnnotation = await response.json();
      setAnnotations([...annotations, newAnnotation]);
      setAnnotationContent("");
      setAnnotationUri("");
      setSelectedMeiIds([]);
      setError(null);
    } catch (err) {
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Annotate: {piece.title}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Score</h2>
            <div className="border rounded-lg p-4">
              <VerovioScore
                meiData={piece.meiData}
                selectionEnabled={true}
                onSelection={handleScoreSelection}
                selectableElements={["note"]}
              />
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Add Annotation</h2>
              <form onSubmit={handleSubmitAnnotation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Annotation Type
                  </label>
                  <select
                    value={annotationType}
                    onChange={(e) =>
                      setAnnotationType(e.target.value as "text" | "link")
                    }
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="text">Text Comment</option>
                    <option value="link">URI Link</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <textarea
                    value={annotationContent}
                    onChange={(e) => setAnnotationContent(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Enter your annotation..."
                  />
                </div>

                {annotationType === "link" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URI
                    </label>
                    <input
                      type="url"
                      value={annotationUri}
                      onChange={(e) => setAnnotationUri(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="https://..."
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedMeiIds.length}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    "Add Annotation"
                  )}
                </button>
              </form>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Annotations</h2>
              <div className="space-y-4">
                {annotations.map((annotation) => (
                  <div key={annotation.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-gray-500">
                        {new Date(annotation.createdAt).toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {annotation.user.email}
                      </span>
                    </div>
                    <p className="text-gray-900">{annotation.content}</p>
                    {annotation.type === "link" && annotation.uri && (
                      <a
                        href={annotation.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-500 text-sm mt-2 inline-block"
                      >
                        {annotation.uri}
                      </a>
                    )}
                  </div>
                ))}
                {annotations.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No annotations yet. Select a part of the score and add one!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
