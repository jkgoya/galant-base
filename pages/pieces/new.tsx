import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import Router from "next/router";
import { useSession } from "next-auth/react";

const allowedExtensions = ["mei", "krn"];

type MusicSource = {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  indexFile: string;
  composer: string;
  format: "krn" | "mei";
};

type MusicPiece = {
  title: string;
  composer: string;
  url: string;
  source: string;
};

const NewPiece: React.FC = () => {
  const { data: session, status } = useSession();
  const [title, setTitle] = useState("");
  const [composer, setComposer] = useState("");
  const [scoreFormat, setScoreFormat] = useState("");
  const [meiData, setMeiData] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [musicSources, setMusicSources] = useState<MusicSource[]>([]);
  const [musicPieces, setMusicPieces] = useState<MusicPiece[]>([]);
  const [loadingPieces, setLoadingPieces] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") {
      Router.push("/api/auth/signin");
    }
  }, [status]);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await fetch("/api/music-sources");
        if (!res.ok) throw new Error("Failed to fetch music sources");
        const data = await res.json();
        setMusicSources(data);
      } catch (err) {
        setError("Could not load music sources");
      }
    };
    fetchSources();
  }, []);

  useEffect(() => {
    const fetchMusicPieces = async (source: MusicSource) => {
      setLoadingPieces(true);
      try {
        const response = await fetch(`${source.baseUrl}/${source.indexFile}`);
        const text = await response.text();

        const pieces: MusicPiece[] = [];
        const lines = text.split("\n");
        let currentPiece: Partial<MusicPiece> = {};

        for (const line of lines) {
          if (line.startsWith("!!!OTL:")) {
            if (currentPiece.title) {
              pieces.push(currentPiece as MusicPiece);
            }
            currentPiece = {
              title: line.replace("!!!OTL:", "").trim(),
              composer: source.composer,
              url: "",
              source: source.id,
            };
          } else if (line.startsWith("!!!ONM:")) {
            currentPiece.url = line.replace("!!!ONM:", "").trim();
          }
        }

        if (currentPiece.title) {
          pieces.push(currentPiece as MusicPiece);
        }

        setMusicPieces(pieces);
      } catch (err) {
        console.error(`Error fetching pieces from ${source.name}:`, err);
        setError(`Failed to load pieces from ${source.name}`);
      } finally {
        setLoadingPieces(false);
      }
    };

    if (selectedSource) {
      const source = musicSources.find((s) => s.id === selectedSource);
      if (source) {
        fetchMusicPieces(source);
      }
    } else {
      setMusicPieces([]);
    }
  }, [selectedSource, musicSources]);

  const handleSourceChange = (sourceId: string) => {
    setSelectedSource(sourceId);
    setTitle("");
    setComposer("");
    setScoreFormat("");
    setMeiData("");
    setUploadedFileName("");
  };

  const handlePieceSelect = async (url: string) => {
    try {
      const source = musicSources.find((s) => s.id === selectedSource);
      if (!source) return;

      const response = await fetch(`${source.baseUrl}/${url}`);
      const text = await response.text();

      const piece = musicPieces.find((p) => p.url === url);
      if (piece) {
        setTitle(piece.title);
        setComposer(piece.composer);
        setScoreFormat(source.format);
        setMeiData(text);
        setUploadedFileName(url);
      }
    } catch (err) {
      console.error("Error loading piece:", err);
      setError("Failed to load selected piece");
    }
  };

  if (status === "loading") {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  if (!session) {
    return null;
  }

  const renderVerovio = async (score: string, options: {}, request: string) => {
    const response = await fetch("https://render.jkg.app/verovio", {
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
    });

    const json = await response.json();
    return json.data;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      setError("File must be .mei or .krn");
      setScoreFormat("");
      setMeiData("");
      return;
    }

    setError("");
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
      setScoreFormat("");
      setMeiData("");
    }
  };

  const submitData = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
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
          <div className="section">
            <h2>Select from Available Collections</h2>
            <select
              onChange={(e) => handleSourceChange(e.target.value)}
              value={selectedSource}
            >
              <option value="">Choose a collection...</option>
              {musicSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name} - {source.description}
                </option>
              ))}
            </select>

            {selectedSource && (
              <div className="subsection">
                {loadingPieces ? (
                  <p>Loading pieces...</p>
                ) : (
                  <select
                    onChange={(e) => handlePieceSelect(e.target.value)}
                    value=""
                  >
                    <option value="">Select a piece...</option>
                    {musicPieces.map((piece, index) => (
                      <option key={index} value={piece.url}>
                        {piece.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <div className="section">
            <h2>Or Upload Your Own File</h2>
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
          </div>

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
        .section {
          margin-bottom: 2rem;
          padding: 1rem;
          border: 1px solid #eee;
          border-radius: 0.5rem;
        }
        .subsection {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }
        h2 {
          margin-top: 0;
          font-size: 1.2rem;
          margin-bottom: 1rem;
        }
        select {
          width: 100%;
          padding: 0.5rem;
          margin: 0.5rem 0;
          border-radius: 0.25rem;
          border: 0.125rem solid rgba(0, 0, 0, 0.2);
        }
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
          margin-top: 1rem;
        }
      `}</style>
    </Layout>
  );
};

export default NewPiece;
