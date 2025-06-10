import React, { useEffect, useState } from "react";

type Props = {
  meiData: string;
};

const VEROVIO_CDN = "https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js";

const VerovioScore: React.FC<Props> = ({ meiData }) => {
  const [svg, setSvg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verovioReady, setVerovioReady] = useState(false);
  //console.log(meiData);

  // Load Verovio script if not already loaded
  useEffect(() => {
    if (typeof window === "undefined") return;

    // If already loaded, set ready
    if ((window as any).verovio) {
      setVerovioReady(true);
      return;
    }

    // If script is already in the DOM, wait for it to load
    const existingScript = document.querySelector(`script[src="${VEROVIO_CDN}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => setVerovioReady(true));
      existingScript.addEventListener("error", () => setError("Failed to load Verovio script."));
      return;
    }

    // Otherwise, add the script
    const script = document.createElement("script");
    script.src = VEROVIO_CDN;
    script.async = true;
    script.onload = () => setVerovioReady(true);
    script.onerror = () => setError("Failed to load Verovio script.");
    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
      // Don't remove the script, as other components may use it
    };
  }, []);

  useEffect(() => {
    if (!meiData || !verovioReady) return;
    if (typeof window === "undefined" || !(window as any).verovio) return;

    setLoading(true);
    console.log("loading", loading);
    setError("");

    try {
      // @ts-ignore
      const tk = new (window as any).verovio.toolkit();
      tk.setOptions({ scale: 40, pageHeight: 1000, pageWidth: 2000, adjustPageHeight: true });
      console.log(tk);
      tk.loadData(meiData, {});
      setSvg(tk.renderToSVG(1, {}));
    } catch (err) {
      setError("Failed to render score.");
      setSvg("");
    } finally {
      setLoading(false);
    }
  }, [meiData, verovioReady]);

  if (loading) return <p>Loading score...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!svg) return <p>No score available.</p>;

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
};

export default VerovioScore; 