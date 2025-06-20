import React, { useEffect, useState, useRef } from "react";

type Props = {
  meiData: string;
  onDrop?: (selectedId: string, measure: number) => void;
  onClick?: (selectedId: string, measure: number) => void;
  temporaryAnnotations?: Array<{
    id: string;
    gschema_event_id: string;
    noteId: string;
    type: string;
    value: string;
  }>;
  existingAnnotations?: Array<{
    schemaId: string;
    schemaName: string;
    eventCount: number;
    schemaType: string;
    contributor: string;
    measureStart?: number;
    measureEnd?: number;
    events: Array<{
      id: string;
      gschemaId: string | null;
      index: number;
      type: string;
      value: string;
    }>;
    annotations: Array<{
      id: string;
      gschema_event_id: string;
      noteId: string;
      type: string;
      value: string;
    }>;
  }>;
  onRemoveAnnotation?: (id: string) => void;
  isEventSelected?: boolean;
};

const VEROVIO_CDN =
  "https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js";

const VerovioScore: React.FC<Props> = ({
  meiData,
  onDrop,
  onClick,
  temporaryAnnotations = [],
  existingAnnotations = [],
  onRemoveAnnotation,
  isEventSelected = false,
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
  const [notePositions, setNotePositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());

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

  // Update SVG when selection or annotations change
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

    // Remove all existing annotation markers
    svgDoc.querySelectorAll(".annotation-markers").forEach((el) => {
      el.remove();
    });

    // Combine temporary and existing annotations
    const allAnnotations = [
      ...temporaryAnnotations.map((ann) => ({ ...ann, isTemporary: true })),
      ...existingAnnotations.flatMap((schema) =>
        schema.annotations.map((ann) => ({ ...ann, isTemporary: false }))
      ),
    ];

    // Add annotation markers
    if (allAnnotations.length > 0) {
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

      // Group annotations by schema
      const schemaGroups = existingAnnotations.map((schema) => ({
        schemaName: schema.schemaName,
        annotations: schema.annotations.map((ann) => ({
          ...ann,
          isTemporary: false,
        })),
      }));

      // Add temporary annotations as their own group
      if (temporaryAnnotations.length > 0) {
        schemaGroups.push({
          schemaName: "Temporary",
          annotations: temporaryAnnotations.map((ann) => ({
            ...ann,
            isTemporary: true,
          })),
        });
      }

      schemaGroups.forEach((group, groupIndex) => {
        let lowestY = -Infinity;
        let minX = Infinity;
        let maxX = -Infinity;
        const groupMarkers: SVGElement[] = [];

        group.annotations.forEach((annotation) => {
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

          // Track the lowest Y position and X range for this group
          lowestY = Math.max(lowestY, y);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);

          // Create circle
          const circle = svgDoc.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
          );
          circle.setAttribute("cx", String(x));
          circle.setAttribute("cy", String(y));
          circle.setAttribute("r", String(circleSize / 2));
          circle.setAttribute("fill", isMelody ? "black" : "white");
          circle.setAttribute(
            "stroke",
            annotation.isTemporary ? "red" : "blue"
          );
          circle.setAttribute(
            "stroke-width",
            annotation.isTemporary ? "2" : "1"
          );
          circle.classList.add("annotation-circle");
          circle.setAttribute("data-id", annotation.id);
          circle.setAttribute("data-temporary", String(annotation.isTemporary));
          circle.style.cursor = annotation.isTemporary ? "pointer" : "default";

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

          groupMarkers.push(circle, text);
        });

        // Add schema name below the lowest marker in this group
        if (groupMarkers.length > 0 && group.schemaName !== "Temporary") {
          const schemaText = svgDoc.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
          );
          // Center the schema name horizontally over the annotation group
          const centerX = (minX + maxX) / 2;
          schemaText.setAttribute("x", String(centerX));
          schemaText.setAttribute("y", String(lowestY + 25));
          schemaText.setAttribute("text-anchor", "middle");
          schemaText.setAttribute("fill", "#6b7280");
          schemaText.setAttribute("font-size", "14");
          schemaText.setAttribute("font-weight", "bold");
          schemaText.textContent = group.schemaName;
          schemaText.classList.add("schema-label");

          groupMarkers.push(schemaText);
        }

        // Add all markers for this group
        groupMarkers.forEach((marker) => markerGroup.appendChild(marker));
      });

      svgElement.appendChild(markerGroup);
    }

    // Convert back to string
    const serializer = new XMLSerializer();
    const newSvg = serializer.serializeToString(svgDoc);
    setSvg(newSvg);
  }, [selectedId, dragTargetId, temporaryAnnotations, existingAnnotations]);

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

  // Update note positions when SVG changes
  useEffect(() => {
    if (!containerRef.current || !svg) return;

    const positions = new Map();
    const noteElements = containerRef.current.querySelectorAll(".note");
    const svgRect = containerRef.current
      .querySelector("svg")
      ?.getBoundingClientRect();

    noteElements.forEach((note) => {
      const rect = note.getBoundingClientRect();
      const x = rect.left - svgRect.left + rect.width / 2;
      const y = rect.top - svgRect.top + rect.height / 2;
      positions.set(note.id, { x, y });
    });

    setNotePositions(positions);
  }, [svg]);

  // Add drag tracking effect
  useEffect(() => {
    if (!containerRef.current || !onDrop) return;

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const closestNote = findClosestNote(event.clientX, event.clientY);

      if (closestNote && closestNote !== dragTargetId) {
        console.log("Closest note:", closestNote);
        setDragTargetId(closestNote);
        setSelectedId(closestNote);
      }
    };

    const handleDragLeave = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // Only handle drag leave if we're leaving the container
      if (
        event.relatedTarget &&
        containerRef.current?.contains(event.relatedTarget as Node)
      ) {
        return;
      }

      try {
        console.log("Drag leave:", dragTargetId);
      } catch (err) {
        console.error("Error handling drag leave:", err);
      }

      setDragTargetId(null);
    };

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (!dragTargetId) return;

      const measure = getMeasureFromNote(dragTargetId);

      try {
        console.log("Drag drop:", dragTargetId, measure);
        setSelectedId(null);
        setDragTargetId(null);
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
  }, [onDrop, dragTargetId, notePositions]);

  // Add a new useEffect for the click handler
  useEffect(() => {
    if (!containerRef.current || !onRemoveAnnotation) return;

    const handleAnnotationClick = (event: MouseEvent) => {
      const target = event.target as SVGElement;
      if (target.classList.contains("annotation-circle")) {
        const id = target.getAttribute("data-id");
        const isTemporary = target.getAttribute("data-temporary") === "true";
        if (id && isTemporary) {
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

  // Add click handler for notes
  useEffect(() => {
    if (!containerRef.current || !onClick) return;

    const handleNoteClick = (event: MouseEvent) => {
      const target = event.target as SVGElement;

      // Check if the clicked element is a note
      if (target.classList.contains("note") || target.closest(".note")) {
        const noteElement = target.classList.contains("note")
          ? target
          : target.closest(".note");
        if (noteElement && noteElement.id) {
          const measure = getMeasureFromNote(noteElement.id);
          console.log("Note click:", noteElement.id, measure);
          onClick(noteElement.id, measure);
        }
      } else {
        // If not clicking directly on a note, find the closest note to cursor position
        const closestNote = findClosestNote(event.clientX, event.clientY);
        if (closestNote) {
          const measure = getMeasureFromNote(closestNote);
          console.log("Closest note click:", closestNote, measure);
          onClick(closestNote, measure);
        }
      }
      setSelectedId(null);
    };

    const container = containerRef.current;
    container.addEventListener("click", handleNoteClick);

    return () => {
      container.removeEventListener("click", handleNoteClick);
    };
  }, [onClick]);

  // Add cursor tracking for selected events
  useEffect(() => {
    if (!containerRef.current || !onClick || !isEventSelected) return;

    const handleMouseMove = (event: MouseEvent) => {
      const closestNote = findClosestNote(event.clientX, event.clientY);
      if (closestNote && closestNote !== selectedId) {
        console.log("Closest note on move:", closestNote);
        setSelectedId(closestNote);
      }
    };

    const handleMouseLeave = () => {
      console.log("Mouse left SVG area");
      setSelectedId(null);
    };

    const container = containerRef.current;
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [onClick, selectedId, isEventSelected]);

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

  // Helper function to find the closest note to a point
  const findClosestNote = (clientX: number, clientY: number): string | null => {
    if (!containerRef.current) return null;

    const svg = containerRef.current.querySelector("svg");
    if (!svg) return null;

    const svgRect = svg.getBoundingClientRect();
    const mouseX = clientX - svgRect.left;
    const mouseY = clientY - svgRect.top;

    let closestNote: string | null = null;
    let minDistance = Infinity;

    notePositions.forEach((pos, noteId) => {
      const distance = Math.sqrt(
        Math.pow(mouseX - pos.x, 2) + Math.pow(mouseY - pos.y, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestNote = noteId;
      }
    });

    return closestNote;
  };

  // Helper function to get measure number from note ID
  const getMeasureFromNote = (noteId: string): number => {
    let measure = 1;
    const note = containerRef.current?.querySelector(`#${noteId}`);
    if (note) {
      const measureElement = note.closest(".measure");
      if (measureElement) {
        const measureID = measureElement.getAttribute("id");
        if (measureID && verovioToolkitRef.current) {
          try {
            measure = parseInt(
              verovioToolkitRef.current.getElementAttr(measureID, "n").n
            );
          } catch (err) {
            console.error("Error getting measure:", err);
          }
        }
      }
    }
    return measure;
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
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
        className={""}
      >
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          style={{
            width: "100%",
            height: "auto",
          }}
        />
        <style jsx>{`
          :global(svg) {
            pointer-events: all;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
          }
          :global(svg *) {
            pointer-events: all;
            touch-action: none;
          }
          :global(.note.selected) {
            filter: drop-shadow(0 0 30px rgba(0, 21, 255, 0.5)) !important;
          }
          :global(.note.selected *) {
            filter: drop-shadow(0 0 30px rgba(0, 21, 255, 0.5)) !important;
          }
          :global(.annotation-markers) {
            pointer-events: all;
            touch-action: none;
          }
          :global(.annotation-circle) {
            pointer-events: all;
            transition: transform 0.2s ease;
            transform-origin: center;
            will-change: transform;
            touch-action: none;
          }
          :global(.annotation-circle:hover) {
            filter: brightness(1.1);
          }
          :global(.annotation-text) {
            pointer-events: none;
            user-select: none;
            touch-action: none;
          }
          :global(.touch-dragging) {
            cursor: grabbing !important;
          }
          :global(.touch-dragging svg) {
            cursor: grabbing !important;
          }
        `}</style>
      </div>
    </div>
  );
};

export default VerovioScore;
