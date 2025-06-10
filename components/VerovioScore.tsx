import React, { useEffect, useState } from "react";

type Props = {
  scoreUrl: string;
};

const VEROVIO_CDN = "https://www.verovio.org/javascript/app/verovio-toolkit-wasm.js";

const VerovioScore: React.FC<Props> = ({ scoreUrl }) => {
  const [svg, setSvg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load Verovio script if not already loaded
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).verovio) return; // Already loaded

    const script = document.createElement("script");
    script.src = VEROVIO_CDN;
    script.async = true;
    script.onload = () => {};
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!scoreUrl) return;
    if (typeof window === "undefined" || !(window as any).verovio) return;

    setLoading(true);
    setError("");
    fetch(scoreUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Could not fetch MEI file");
        return res.text();
      })
      .then((mei) => {
        // @ts-ignore
        const tk = new (window as any).verovio.toolkit();
        tk.setOptions({ scale: 40, pageHeight: 1000, pageWidth: 2000, adjustPageHeight: true });
        tk.loadData(mei, {});
        setSvg(tk.renderToSVG(1, {}));
      })
      .catch(() => setError("Failed to render score."))
      .finally(() => setLoading(false));
  }, [scoreUrl, typeof window !== "undefined" && (window as any).verovio]);

  if (loading) return <p>Loading score...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!svg) return <p>No score available.</p>;

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
};

export default VerovioScore; 