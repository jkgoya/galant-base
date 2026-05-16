import dynamic from "next/dynamic";
import { GschemaAnnotationSchema } from "../lib/gschema-annotations";

const VerovioScore = dynamic(() => import("./VerovioScore"), { ssr: false });

type TemporaryAnnotation = {
  id: string;
  gschema_event_id: string;
  noteId: string;
  type: string;
  value: string;
};

type AnnotateScoreProps = {
  onDrop: (selectedId: string, measure: number) => void;
  onClick: (selectedId: string, measure: number) => void;
  temporaryAnnotations: TemporaryAnnotation[];
  onRemoveAnnotation: (id: string) => void;
  isEventSelected: boolean;
};

type Props = {
  meiData: string;
  annotations: GschemaAnnotationSchema[];
  showOnScore: boolean;
  onShowOnScoreChange?: (show: boolean) => void;
  title?: string;
  annotate?: AnnotateScoreProps;
};

export default function AnnotationScoreSection({
  meiData,
  annotations,
  showOnScore,
  onShowOnScoreChange,
  title = "Score",
  annotate,
}: Props) {
  const scoreAnnotations = showOnScore ? annotations : [];

  const score = (
    <VerovioScore
      meiData={meiData}
      existingAnnotations={scoreAnnotations}
      {...(annotate ?? {})}
    />
  );

  if (onShowOnScoreChange) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnScore}
              onChange={(e) => onShowOnScoreChange(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Show existing annotations
          </label>
        </div>
        <div className="border rounded-lg p-4">{score}</div>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
      </div>
      <div className="border-t border-gray-200">
        <div className="verovio-container">{score}</div>
      </div>
      <style jsx>{`
        .verovio-container {
          width: 100%;
          overflow-x: auto;
          background: white;
          padding: 2rem;
          min-height: 400px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .verovio-container :global(svg) {
          max-width: none;
          height: auto;
        }
        .verovio-container :global(.verovio-score) {
          width: 100%;
          display: flex;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
