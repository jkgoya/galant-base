import React, { useEffect, useState, useRef } from "react";

type Props = {
  meiData: string;
  selectionEnabled?: boolean;
  onSelection?: (selectedIds: string[]) => void;
  selectableElements?: string[]; // Array of element types that can be selected (e.g. ['note', 'measure'])
};

const VEROVIO_CDN =
  "https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js";

const VerovioScore: React.FC<Props> = ({
  meiData,
  selectionEnabled = false,
  onSelection,
  selectableElements = ["note"], // Default to only allowing note selection
}) => {
  const [svg, setSvg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verovioReady, setVerovioReady] = useState(false);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [measureInput, setMeasureInput] = useState("");
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

  // Add click event listener for selection after SVG is rendered
  useEffect(() => {
    if (!selectionEnabled || !containerRef.current || !onSelection) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as SVGElement;
      const elementId = target.getAttribute("class");
      const elementType = target.getAttribute("class");

      console.log("Clicked element:", {
        element: target,
        tagName: target.tagName,
        id: elementId,
        type: elementType,
        classes: target.classList,
        parent: target.parentElement?.tagName,
      });

      // Only allow selection if the element type is in selectableElements
      if (
        elementId &&
        elementType &&
        selectableElements.includes(elementType)
      ) {
        // Toggle selection
        const isSelected = target.classList.contains("selected");
        console.log("Selection state:", {
          wasSelected: isSelected,
          willBeSelected: !isSelected,
          elementType,
        });

        if (isSelected) {
          target.classList.remove("selected");
        } else {
          target.classList.add("selected");
        }

        // Get all selected elements
        const selectedElements =
          containerRef.current?.querySelectorAll(".selected");
        const selectedIds = Array.from(selectedElements || [])
          .map((el) => el.getAttribute("data-id"))
          .filter((id): id is string => id !== null);

        console.log("Current selection:", {
          totalSelected: selectedIds.length,
          selectedIds: selectedIds,
          elements: Array.from(selectedElements || []).map((el) => ({
            id: el.getAttribute("data-id"),
            type: el.getAttribute("data-type"),
            tagName: el.tagName,
            classes: el.className,
          })),
        });

        onSelection(selectedIds);
      } else if (elementId) {
        console.log("Element not selectable:", {
          id: elementId,
          type: elementType,
          allowedTypes: selectableElements,
        });
      }
    };
    containerRef.current.addEventListener("click", handleClick);
    return () => {
      containerRef.current?.removeEventListener("click", handleClick);
    };
  }, [selectionEnabled, onSelection, svg, selectableElements]);

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
          cursor: selectionEnabled ? "pointer" : "default",
          position: "relative",
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <style jsx>{`
        :global(.selected) {
          fill: #93c5fd !important;
          stroke: #3b82f6 !important;
          stroke-width: 2px !important;
        }
        :global(svg) {
          pointer-events: all;
        }
        :global(svg *) {
          pointer-events: all;
        }
        :global(svg .selected) {
          fill: #93c5fd !important;
          stroke: #3b82f6 !important;
          stroke-width: 2px !important;
        }
        :global(svg g.selected) {
          fill: #93c5fd !important;
          stroke: #3b82f6 !important;
          stroke-width: 2px !important;
        }
        :global(svg path.selected) {
          fill: #93c5fd !important;
          stroke: #3b82f6 !important;
          stroke-width: 2px !important;
        }
      `}</style>
    </div>
  );
};

export default VerovioScore;
