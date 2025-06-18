import React, { useEffect, useState, useRef } from "react";

type Props = {
  meiData: string;
  onDrop?: (selectedId: string, measure: number) => void;
  temporaryAnnotations?: Array<{
    id: string;
    gschema_event_id: string;
    noteId: string;
    type: string;
    value: string;
  }>;
  onRemoveAnnotation?: (id: string) => void;
};

const VEROVIO_CDN =
  "https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js";

const VerovioScore: React.FC<Props> = ({
  meiData,
  onDrop,
  temporaryAnnotations = [],
  onRemoveAnnotation,
}) => {
  const [svg, setSvg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verovioReady, setVerovioReady] = useState(false);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [measureInput, setMeasureInput] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // Update SVG when selection or temporary annotations change
  useEffect(() => {
    if (!verovioToolkitRef.current || !svg) return;

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, "image/svg+xml");

    // Remove all existing selected classes
    svgDoc.querySelectorAll(".selected").forEach((el) => {
      el.classList.remove("selected");
    });

    // Add selected class to elements with matching IDs
    const idToHighlight = dragTargetId ? dragTargetId : selectedId;
    const element = svgDoc.getElementById(idToHighlight);
    if (element) {
      element.classList.add("selected");
    }

    // Remove all existing temporary annotations
    svgDoc.querySelectorAll(".annotation-markers").forEach((el) => {
      el.remove();
    });

    // Add annotation markers at the bottom
    if (temporaryAnnotations.length > 0) {
      const svgElement = svgDoc.documentElement;
      const markerGroup = svgDoc.createElementNS(
        "http://www.w3.org/2000/svg",
        "g"
      );
      markerGroup.setAttribute("class", "annotation-markers");

      const circleSize = 20;
      const svgRect = containerRef.current
        ?.querySelector("svg")
        ?.getBoundingClientRect();
      if (!svgRect) {
        console.warn("SVG element not found");
        return;
      }

      temporaryAnnotations.forEach((annotation, index) => {
        const isMelody = annotation.type === "melody";

        // Get the actual DOM element instead of the parsed SVG element
        const note = containerRef.current?.querySelector(
          `#${annotation.noteId}`
        );
        if (!note) {
          console.warn("Note element not found:", annotation.noteId);
          return;
        }

        const rect = note.getBoundingClientRect();

        const x = rect.left - svgRect.left + rect.width / 2;
        const y =
          rect.top - svgRect.top + rect.height / 2 + (isMelody ? -30 : 30);
        //console.log("Annotating note:", annotation.noteId, x, y);

        // Create circle
        const circle = svgDoc.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        );
        circle.setAttribute("cx", String(x));
        circle.setAttribute("cy", String(y));
        circle.setAttribute("r", String(circleSize / 2));
        circle.setAttribute("fill", isMelody ? "black" : "white");
        circle.setAttribute("stroke", "black");
        circle.setAttribute("stroke-width", "1");
        circle.classList.add("annotation-circle");
        circle.setAttribute("data-id", annotation.id);
        circle.style.cursor = "pointer";

        // Create text
        const text = svgDoc.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );
        text.setAttribute("x", String(x));
        text.setAttribute("y", String(y));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("fill", isMelody ? "white" : "black");
        text.setAttribute("font-size", "12");
        text.setAttribute("font-weight", "bold");
        text.textContent = annotation.value;
        text.classList.add("annotation-text");

        markerGroup.appendChild(circle);
        markerGroup.appendChild(text);
      });

      svgElement.appendChild(markerGroup);
    }

    // Convert back to string
    const serializer = new XMLSerializer();
    const newSvg = serializer.serializeToString(svgDoc);
    setSvg(newSvg);
  }, [selectedId, dragTargetId, temporaryAnnotations]);

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
        const rect = closestNote.getBoundingClientRect();
        const noteX = rect.left - svgRect.left + rect.width / 2;
        const noteY = rect.top - svgRect.top + rect.height / 2;
        console.log("Closest note:", closestNote.id, noteX, noteY);

        const elementId = closestNote.getAttribute("id");
        if (elementId?.startsWith("note")) {
          setDragTargetId(elementId);
          setSelectedId(elementId);
        }
      }
    };

    const handleDragLeave = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      let measure = 1;
      // get the measure of the note
      const note = containerRef.current?.querySelector(`#${dragTargetId}`);
      if (note) {
        // find the closest parent element of type measure and return the measure id
        const measureID = note.closest(".measure").getAttribute("id");
        //const measureID = "measure-L52";
        const tk = verovioToolkitRef.current;
        measure = parseInt(tk.getElementAttr(measureID, "n").n);
      }
      // Only handle drag leave if we're leaving the container
      if (
        event.relatedTarget &&
        containerRef.current?.contains(event.relatedTarget as Node)
      ) {
        return;
      }

      try {
        console.log("Drag leave:", dragTargetId, measure);
        //onDrop(dragTargetId, measure);
      } catch (err) {
        console.error("Error handling drag leave:", err);
      }

      setDragTargetId(null);
    };

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      let measure = 1;
      // get the measure of the note
      const note = containerRef.current?.querySelector(`#${dragTargetId}`);
      if (note) {
        // find the closest parent element of type measure and return the measure id
        const measureID = note.closest(".measure").getAttribute("id");
        //const measureID = "measure-L52";
        const tk = verovioToolkitRef.current;
        measure = parseInt(tk.getElementAttr(measureID, "n").n);
      }

      try {
        console.log("Drag drop:", dragTargetId, measure);
        onDrop(dragTargetId, measure);
      } catch (err) {
        console.error("Error handling drag drop:", err);
      }
    };

    const container = containerRef.current;

    // Add event listeners to the container
    container.addEventListener("dragover", handleDragOver);
    container.addEventListener("dragleave", handleDragLeave);
    container.addEventListener("drop", handleDrop);

    // Also add event listeners to the SVG element
    const svg = container.querySelector("svg");
    if (svg) {
      svg.addEventListener("dragover", handleDragOver);
      svg.addEventListener("dragleave", handleDragLeave);
      svg.addEventListener("drop", handleDrop);
    }

    return () => {
      container.removeEventListener("dragover", handleDragOver);
      container.removeEventListener("dragleave", handleDragLeave);
      container.removeEventListener("drop", handleDrop);

      if (svg) {
        svg.removeEventListener("dragover", handleDragOver);
        svg.removeEventListener("dragleave", handleDragLeave);
        svg.removeEventListener("drop", handleDrop);
      }
    };
  }, [onDrop, dragTargetId]);

  // Add a new useEffect for the click handler
  useEffect(() => {
    if (!containerRef.current || !onRemoveAnnotation) return;

    const handleAnnotationClick = (event: MouseEvent) => {
      const target = event.target as SVGElement;
      if (target.classList.contains("annotation-circle")) {
        const id = target.getAttribute("data-id");
        if (id) {
          onRemoveAnnotation(id);
        }
      }
    };

    const container = containerRef.current;
    container.addEventListener("click", handleAnnotationClick);

    return () => {
      container.removeEventListener("click", handleAnnotationClick);
    };
  }, [onRemoveAnnotation]);

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
        :global(.annotation-markers) {
          pointer-events: all;
        }
        :global(.annotation-circle) {
          pointer-events: all;
          transition: transform 0.2s ease;
          transform-origin: center;
          will-change: transform;
        }
        :global(.annotation-circle:hover) {
          filter: brightness(1.1);
        }
        :global(.annotation-text) {
          pointer-events: none;
          user-select: none;
        }
      `}</style>
    </div>
  );
};

export default VerovioScore;
