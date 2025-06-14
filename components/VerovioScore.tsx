import React, { useEffect, useState, useRef } from "react";

type Props = {
  meiData: string;
};

const VEROVIO_CDN =
  "https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js";

const VerovioScore: React.FC<Props> = ({ meiData }) => {
  const [svg, setSvg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verovioReady, setVerovioReady] = useState(false);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [measureInput, setMeasureInput] = useState("");
  const verovioToolkitRef = useRef<any>(null);

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
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const tk = new (window as any).verovio.toolkit();
        tk.setOptions({
          scale: 40,
          pageHeight: 1000,
          pageWidth: 2000,
          adjustPageHeight: true,
        });

        // Wait for options to be set
        await new Promise((resolve) => setTimeout(resolve, 500));

        tk.loadData(meiData, {});
        verovioToolkitRef.current = tk;

        // Wait for data to be loaded
        await new Promise((resolve) => setTimeout(resolve, 500));

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
  if (!svg) return <p>No score available.</p>;

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
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
};

export default VerovioScore;
