import React, { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import Layout from "../../../components/Layout";
import prisma from "../../../lib/prisma";
import Router from "next/router";
import { getSession } from "next-auth/react";

const allowedExtensions = ["mei", "krn"];
const VEROVIO_CDN =
  "https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js";

export const getServerSideProps: GetServerSideProps = async ({
  params,
  req,
}) => {
  const session = await getSession({ req });
  if (!session) {
    return {
      redirect: {
        destination: "/api/auth/signin",
        permanent: false,
      },
    };
  }

  const piece = await prisma.piece.findUnique({
    where: { id: String(params?.id) },
    include: {
      contributor: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!piece || piece.contributor?.email !== session.user.email) {
    return {
      redirect: {
        destination: "/pieces",
        permanent: false,
      },
    };
  }

  // Convert Date objects to ISO strings
  const serializedPiece = {
    ...piece,
    createdAt: piece.createdAt.toISOString(),
    updatedAt: piece.updatedAt.toISOString(),
  };

  return { props: { piece: serializedPiece } };
};

type PieceProps = {
  id: string;
  title: string;
  composer: string;
  meiData: string;
};

type Props = {
  piece: PieceProps;
};

const EditPiece: React.FC<Props> = ({ piece }) => {
  const [title, setTitle] = useState(piece.title);
  const [composer, setComposer] = useState(piece.composer);
  const [scoreFile, setScoreFile] = useState<File | null>(null);
  const [scoreFormat, setScoreFormat] = useState("");
  const [meiData, setMeiData] = useState(piece.meiData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [verovioReady, setVerovioReady] = useState(false);

  // Load Verovio script
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

  const convertKrnToMei = async (krnData: string): Promise<string> => {
    if (!verovioReady || !(window as any).verovio) {
      throw new Error("Verovio not ready");
    }

    const tk = new (window as any).verovio.toolkit();
    tk.loadData(krnData, { format: "kern" });
    return tk.getMEI();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      setError("File must be .mei or .krn");
      setScoreFile(null);
      setScoreFormat("");
      return;
    }
    setError("");
    setScoreFile(file);
    setScoreFormat(ext);
    setUploadedFileName(file.name);

    // Read file as text
    const fileText = await file.text();

    try {
      if (ext === "krn") {
        if (!verovioReady) {
          setError("Please wait for Verovio to load");
          return;
        }
        const meiData = await convertKrnToMei(fileText);
        setMeiData(meiData);
      } else {
        setMeiData(fileText);
      }
    } catch (err) {
      setError("Failed to process file");
      setScoreFile(null);
      setScoreFormat("");
    }
  };

  const submitData = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/pieces/${piece.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          composer,
          meiData: meiData || piece.meiData,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update piece");
      }

      Router.push(`/pieces/${piece.id}`);
    } catch (err) {
      setError(err.message || "Failed to update piece");
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div>
        <h1>Edit Piece</h1>
        <form onSubmit={submitData}>
          <input
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            type="text"
            value={title}
          />
          <input
            onChange={(e) => setComposer(e.target.value)}
            placeholder="Composer"
            type="text"
            value={composer}
          />
          <div style={{ margin: "1rem 0" }}>
            <p>Current score data is preserved unless you upload a new file.</p>
            <input type="file" accept=".mei,.krn" onChange={handleFileChange} />
            {uploadedFileName && <p>New file: {uploadedFileName}</p>}
            {scoreFormat && <p>Detected format: {scoreFormat}</p>}
          </div>
          <input
            disabled={saving || !title || !composer}
            type="submit"
            value="Save Changes"
          />
        </form>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
      <style jsx>{`
        input[type="text"] {
          width: 100%;
          padding: 0.5rem;
          margin: 0.5rem 0;
          border-radius: 0.25rem;
          border: 0.125rem solid rgba(0, 0, 0, 0.2);
        }
        input[type="submit"] {
          background: #ececec;
          border: 0;
          padding: 1rem 2rem;
          border-radius: 0.25rem;
          cursor: pointer;
        }
        input[type="submit"]:hover {
          background: #ddd;
        }
        input[type="submit"]:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
      `}</style>
    </Layout>
  );
};

export default EditPiece;
