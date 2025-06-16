import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { debounce } from "lodash";

type Props = {
  meiData: string;
  selectionEnabled?: boolean;
  onSelection?: (selectedIds: string[]) => void;
  selectableElements?: string[]; // Array of element types that can be selected (e.g. ['note', 'measure'])
  onDrop?: (selectedIds: string[]) => void;
};

const VEROVIO_CDN =
  "https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js";

const VerovioScore: React.FC<Props> = ({
  meiData,
  selectionEnabled = false,
  onSelection,
  selectableElements = ["note"], // Default to only allowing note selection
  onDrop,
}) => {
  const [svg, setSvg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verovioReady, setVerovioReady] = useState(false);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [measureInput, setMeasureInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const verovioToolkitRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load Verovio script if not already loaded
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).verovio) {
      setVerovioReady(true);
      return;
    }

    const existingScript = document.querySelector(
      `script[src="${VEROVIO_CDN}"]`
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => setVerovioReady(true));
      existingScript.addEventListener("error", () =>
        setError("Failed to load Verovio script.")
      );
      return;
    }

    const script = document.createElement("script");
    script.src = VEROVIO_CDN;
    script.async = true;
    script.onload = () => setVerovioReady(true);
    script.onerror = () => setError("Failed to load Verovio script.");
    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  // Initialize Verovio and render the first page
  useEffect(() => {
    if (!meiData || !verovioReady) return;
    if (typeof window === "undefined" || !(window as any).verovio) return;

    setLoading(true);
    setError("");

    const initializeScore = async () => {
      try {
        // Wait for Verovio to be fully ready
        await new Promise((resolve) => setTimeout(resolve, 100));

        const tk = new (window as any).verovio.toolkit();
        tk.setOptions({
          scale: 40,
          pageHeight: 1000,
          pageWidth: 2000,
          adjustPageHeight: true,
        });

        // Load the data
        const success = tk.loadData(meiData, "mei");
        console.log("Load data result:", success);

        if (!success) {
          const log = tk.getLog();
          console.error("Verovio load error:", log);
          throw new Error(`Failed to load MEI data: ${log}`);
        }

        verovioToolkitRef.current = tk;

        setPage(1);
        setPageCount(tk.getPageCount());
        setSvg(tk.renderToSVG(1, {}));
      } catch (err) {
        setError("Failed to render score.");
        setSvg("");
      } finally {
        setLoading(false);
      }
    };

    initializeScore();
  }, [meiData, verovioReady]);

  // Update SVG when selection changes
  useEffect(() => {
    if (!verovioToolkitRef.current || !svg) return;

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, "image/svg+xml");

    // Remove all existing selected classes
    svgDoc.querySelectorAll(".selected").forEach((el) => {
      el.classList.remove("selected");
    });

    // Add selected class to elements with matching IDs
    const idsToHighlight = dragTargetId ? [dragTargetId] : selectedIds;
    //console.log("Highlighting IDs:", idsToHighlight);
    idsToHighlight.forEach((id) => {
      const element = svgDoc.getElementById(id);
      if (element) {
        element.classList.add("selected");
      }
    });

    // Convert back to string
    const serializer = new XMLSerializer();
    const newSvg = serializer.serializeToString(svgDoc);
    setSvg(newSvg);
  }, [selectedIds, dragTargetId, svg]);

  // Render the current page when page changes
  useEffect(() => {
    const tk = verovioToolkitRef.current;
    if (!tk || !meiData || !verovioReady) return;
    setLoading(true);
    try {
      setSvg(tk.renderToSVG(page, {}));
    } catch (err) {
      setError("Failed to render page.");
      setSvg("");
    } finally {
      setLoading(false);
    }
  }, [page]);

  // Add drag tracking effect
  useEffect(() => {
    if (!containerRef.current || !onDrop) return;

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!containerRef.current) return;

      const svg = containerRef.current.querySelector("svg");
      if (!svg) return;

      const svgRect = svg.getBoundingClientRect();
      const mouseX = event.clientX - svgRect.left;
      const mouseY = event.clientY - svgRect.top;

      // Find all note elements
      const noteElements =
        containerRef.current.querySelectorAll(".note.placed");
      if (!noteElements.length) return;

      // Find the closest note
      let closestNote: SVGElement | null = null;
      let minDistance = Infinity;

      noteElements.forEach((note) => {
        const rect = note.getBoundingClientRect();
        const noteX = rect.left - svgRect.left + rect.width / 2;
        const noteY = rect.top - svgRect.top + rect.height / 2;

        const distance = Math.sqrt(
          Math.pow(mouseX - noteX, 2) + Math.pow(mouseY - noteY, 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestNote = note as SVGElement;
        }
      });

      if (closestNote) {
        const elementId = closestNote.getAttribute("id");
        if (elementId?.startsWith("note")) {
          setDragTargetId(elementId);
          setSelectedIds([elementId]);
        }
      }
    };

    // Debounce the drag over handler
    const debouncedDragOver = debounce(handleDragOver, 10);

    const handleDragLeave = (event: DragEvent) => {
      // Only handle drag leave if we're leaving the container
      if (
        event.relatedTarget &&
        containerRef.current?.contains(event.relatedTarget as Node)
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      // Cancel any pending drag over updates
      debouncedDragOver.cancel();

      try {
        onDrop([dragTargetId]);
      } catch (err) {
        console.error("Error handling drag leave:", err);
      }

      setDragTargetId(null);
    };

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const container = containerRef.current;

    // Add event listeners to the container
    container.addEventListener("dragover", debouncedDragOver);
    container.addEventListener("dragleave", handleDragLeave);
    container.addEventListener("drop", handleDrop);

    // Also add event listeners to the SVG element
    const svg = container.querySelector("svg");
    if (svg) {
      svg.addEventListener("dragover", debouncedDragOver);
      svg.addEventListener("dragleave", handleDragLeave);
      svg.addEventListener("drop", handleDrop);
    }

    return () => {
      container.removeEventListener("dragover", debouncedDragOver);
      container.removeEventListener("dragleave", handleDragLeave);
      container.removeEventListener("drop", handleDrop);

      if (svg) {
        svg.removeEventListener("dragover", debouncedDragOver);
        svg.removeEventListener("dragleave", handleDragLeave);
        svg.removeEventListener("drop", handleDrop);
      }
      // Cancel any pending debounced calls
      debouncedDragOver.cancel();
    };
  }, [onDrop, dragTargetId]);

  const goToPrevPage = () => setPage((p) => Math.max(1, p - 1));
  const goToNextPage = () => setPage((p) => Math.min(pageCount, p + 1));

  const handleJumpToMeasure = (e: React.FormEvent) => {
    e.preventDefault();
    const tk = verovioToolkitRef.current;
    if (!tk || !measureInput) return;
    // Verovio expects measure IDs like "m1", "m2", etc.
    const measureId = `m${measureInput}`;
    const targetPage = tk.getPageWithElement(measureId);
    if (targetPage > 0) {
      setPage(targetPage);
    } else {
      setError("Measure not found.");
    }
  };

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (loading) return <p>Loading score...</p>;
  if (!svg) return <p>...</p>;

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={goToPrevPage} disabled={page <= 1}>
          Previous
        </button>
        <span style={{ margin: "0 1rem" }}>
          Page {page} of {pageCount}
        </span>
        <button onClick={goToNextPage} disabled={page >= pageCount}>
          Next
        </button>
        <form
          onSubmit={handleJumpToMeasure}
          style={{ display: "inline-block", marginLeft: "2rem" }}
        >
          <label>
            Jump to measure:{" "}
            <input
              type="number"
              min={1}
              value={measureInput}
              onChange={(e) => setMeasureInput(e.target.value)}
              style={{ width: "4em" }}
            />
          </label>
          <button type="submit" style={{ marginLeft: "0.5em" }}>
            Go
          </button>
        </form>
      </div>
      <div
        ref={containerRef}
        style={{
          position: "relative",
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <style jsx>{`
        :global(svg) {
          pointer-events: all;
        }
        :global(svg *) {
          pointer-events: all;
        }
        :global(.note.placed.selected) {
          filter: drop-shadow(0 0 30px rgba(0, 21, 255, 0.5)) !important;
        }
        :global(.note.placed.selected *) {
          filter: drop-shadow(0 0 30px rgba(0, 21, 255, 0.5)) !important;
        }
      `}</style>
    </div>
  );
};

export default VerovioScore;
