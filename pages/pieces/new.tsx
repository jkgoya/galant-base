import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import Router from "next/router";
import { getSession } from "next-auth/react";

const allowedExtensions = ["mei", "krn"];

const NewPiece: React.FC = () => {
  const [title, setTitle] = useState("");
  const [composer, setComposer] = useState("");
  const [scoreFile, setScoreFile] = useState<File | null>(null);
  const [scoreFormat, setScoreFormat] = useState("");
  const [meiData, setMeiData] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");

  const renderVerovio = async (score: string, options: {}, request: string) => {
    //const [data, setData] = useState("");
    //console.log(score);

    const response = await fetch(
      "https://render.jkg.app/verovio",
      //"http://localhost:3000/verovio",
      {
        mode: "cors",
        method: "POST",
        body: JSON.stringify({
          data: score,
          options: options,
          request: request,
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      }
    );

    const json = await response.json();
    return json.data;

    //return(data)
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      setError("File must be .mei or .krn");
      setScoreFile(null);
      setScoreFormat("");
      setMeiData("");
      return;
    }

    setError("");
    setScoreFile(file);
    setScoreFormat(ext);
    setUploadedFileName(file.name);

    try {
      const fileText = await file.text();
      console.log("File content:", fileText.substring(0, 200) + "...");

      if (ext === "krn") {
        const meiData = await renderVerovio(fileText, {}, "mei");
        setMeiData(meiData);
      } else {
        setMeiData(fileText);
      }
    } catch (err) {
      console.error("File processing error:", err);
      setError("Failed to process file: " + (err as Error).message);
      setScoreFile(null);
      setScoreFormat("");
      setMeiData("");
    }
  };

  const submitData = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const session = await getSession();
      const body = {
        title,
        composer,
        scoreFormat,
        meiData,
        email: session.user.email,
      };
      const res = await fetch("/api/pieces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create piece");
      Router.push("/pieces");
    } catch (err) {
      setError("Failed to create piece");
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div>
        <h1>Submit New Piece</h1>
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
          <input type="file" accept=".mei,.krn" onChange={handleFileChange} />
          {uploadedFileName && <p>Uploaded: {uploadedFileName}</p>}
          {scoreFormat && <p>Detected format: {scoreFormat}</p>}
          <input
            disabled={saving || !title || !composer || !scoreFormat || !meiData}
            type="submit"
            value="Submit"
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
        }
      `}</style>
    </Layout>
  );
};

export default NewPiece;
