import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import Router from "next/router";
import { useSession } from "next-auth/react";
import Link from "next/link";

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

interface MusicPiece {
  source?: string;
  title: string;
  composer?: string;
  url: string;
  filename: string;
}

const NewPiece: React.FC = () => {
  const { data: session, status } = useSession();
  const [title, setTitle] = useState("");
  const [composer, setComposer] = useState("");
  const [scoreFormat, setScoreFormat] = useState<string | null>(null);
  const [meiData, setMeiData] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [error, setError] = useState<string | React.ReactNode | null>(null);
  const [musicSources, setMusicSources] = useState<MusicSource[]>([]);
  const [musicPieces, setMusicPieces] = useState<MusicPiece[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedPiece, setSelectedPiece] = useState<MusicPiece | null>(null);

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
      try {
        console.log("Starting to fetch music pieces for source:", source);
        setError(null);
        const response = await fetch(source.indexFile);
        if (!response.ok) {
          throw new Error(`Failed to fetch index file: ${response.statusText}`);
        }
        const text = await response.text();
        console.log(
          "Received index file content:",
          text.substring(0, 200) + "..."
        );

        // Parse the index file
        const pieces: MusicPiece[] = [];
        const lines = text.split("\n");
        console.log("Total lines in index file:", lines.length);

        if (source.indexFile.includes("corelli")) {
          // Process each line for Corelli format
          for (const line of lines) {
            // Skip empty lines and comments
            if (!line.trim() || line.startsWith("!")) {
              console.log("Skipping line:", line);
              continue;
            }

            // Look for lines containing .krn files
            if (line.includes(".krn")) {
              const parts = line.split(/\t+/);
              console.log("Found .krn line, parts:", parts);

              // Find the .krn file path
              const krnFile = parts.find((part) => part.endsWith(".krn"));
              if (krnFile) {
                // Extract piece information
                const fileName =
                  krnFile.split("/").pop()?.replace(".krn", "") || "";
                const pieceNumber = fileName.match(/n(\d+)/)?.[1] || "";

                // Get movement info from the last field
                const lastField = parts[4];
                const movementInfo = lastField.includes("Y .")
                  ? lastField.split("Y .")[1].trim()
                  : lastField;
                console.log("Raw movement info:", movementInfo);

                // Clean up movement info
                const cleanMovementInfo = movementInfo
                  .replace(/<link>/g, "") // Remove <link> tags
                  .replace(/xxx/g, "") // Remove "xxx"
                  .replace(/\s+/g, " ") // Normalize whitespace
                  .trim();

                console.log("Cleaned movement info:", cleanMovementInfo);

                // Create a descriptive title
                const title = `${source.composer} - Op. ${fileName
                  .split("n")[0]
                  .replace("op", "")}, No. ${pieceNumber} ${cleanMovementInfo}`;

                const piece: MusicPiece = {
                  source: source.id,
                  title: title,
                  composer: source.composer,
                  url: `${source.baseUrl}/${krnFile}`,
                  filename: krnFile,
                };

                console.log("Created piece:", piece);
                pieces.push(piece);
              }
            }
          }
        } else {
          // Process each line for Bach Brandenburg format
          for (const line of lines) {
            // Skip empty lines and special files
            if (
              !line.trim() ||
              line.startsWith(".") ||
              line.startsWith("LICENSE") ||
              line.startsWith("readme")
            ) {
              continue;
            }

            const parts = line.split(/\s+/);
            if (parts.length >= 3 && parts[0].endsWith(".krn")) {
              const filename = parts[0];
              const description = parts.slice(2).join(" ");

              const piece: MusicPiece = {
                source: source.id,
                title: description,
                composer: source.composer,
                url: `${source.baseUrl}/${filename}`,
                filename: filename,
              };

              console.log("Created Bach piece:", piece);
              pieces.push(piece);
            }
          }
        }

        console.log("Final pieces array:", pieces);
        setMusicPieces(pieces);
      } catch (error) {
        console.error("Error fetching music pieces:", error);
        setError("Failed to fetch music pieces. Please try again.");
      }
    };

    if (selectedSource) {
      const source = musicSources.find((s) => s.id === selectedSource);
      if (source) {
        fetchMusicPieces(source);
      }
    }
  }, [selectedSource]);

  const handleSourceChange = (sourceId: string) => {
    setSelectedSource(sourceId);
    setTitle("");
    setComposer("");
    setScoreFormat(null);
    setMeiData("");
    setUploadedFileName("");
    setSelectedPiece(null);
  };

  const handlePieceSelect = async (piece: MusicPiece) => {
    try {
      console.log("Selected piece:", piece);
      setError(null);

      // Fetch the .krn file
      console.log("Fetching .krn file from:", piece.url);
      const response = await fetch(piece.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch .krn file: ${response.statusText}`);
      }
      const krnContent = await response.text();
      console.log(
        "Received .krn content:",
        krnContent.substring(0, 200) + "..."
      );

      // Convert to MEI
      console.log("Converting to MEI...");
      const meiData = await renderVerovio(krnContent, {}, "mei");
      console.log("MEI data:", meiData.substring(0, 200) + "...");
      console.log(meiData.length);

      // Create the piece
      console.log("Creating piece in database...");
      const createResponse = await fetch("/api/pieces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: piece.title,
          composer: piece.composer,
          meiData,
          email: session?.user?.email,
          format: "krn",
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        if (createResponse.status === 400 && data.existingPieceId) {
          setError(
            <>
              This piece has already been added.{" "}
              <Link href={`/pieces/${data.existingPieceId}`}>
                Click here to view it
              </Link>
            </>
          );
        } else {
          throw new Error(data.error || "Failed to create piece");
        }
        return;
      }

      // Redirect to pieces page on success
      await Router.push("/pieces");
    } catch (error) {
      console.error("Error processing piece:", error);
      setError(error.message || "Failed to process piece");
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
      setScoreFormat(null);
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
      setScoreFormat(null);
      setMeiData("");
    }
  };

  const submitData = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const body = {
        title,
        composer,
        meiData,
        email: session?.user?.email,
        format: scoreFormat,
      };
      const response = await fetch("/api/pieces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 400 && data.existingPieceId) {
          setError(
            <>
              This piece has already been added.{" "}
              <Link href={`/pieces/${data.existingPieceId}`}>
                Click here to view it
              </Link>
            </>
          );
        } else {
          throw new Error(data.error || "Failed to create piece");
        }
        return;
      }

      await Router.push("/pieces");
    } catch (error) {
      console.error("Error creating piece:", error);
      setError(error.message || "Failed to create piece");
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
                <select
                  value={selectedPiece?.url || ""}
                  onChange={(e) => {
                    const piece = musicPieces.find(
                      (p) => p.url === e.target.value
                    );
                    if (piece) {
                      handlePieceSelect(piece);
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select a piece...</option>
                  {musicPieces.map((piece) => (
                    <option key={piece.url} value={piece.url}>
                      {piece.title}
                    </option>
                  ))}
                </select>
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
            <div className="mt-4">
              <button
                type="submit"
                disabled={!session?.user?.email}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Upload Piece
              </button>
            </div>
          </div>

          {uploadedFileName && <p>Uploaded: {uploadedFileName}</p>}
          {scoreFormat && <p>Detected format: {scoreFormat}</p>}
        </form>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
      <style jsx>{`
        .page {
          padding: 2rem;
        }
        .section {
          margin-bottom: 2rem;
        }
        .section h2 {
          margin-bottom: 1rem;
        }
        input[type="text"],
        input[type="file"] {
          width: 100%;
          padding: 0.5rem;
          margin-bottom: 1rem;
          border: 1px solid #ccc;
          border-radius: 0.25rem;
        }
        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.25rem;
          background-color: #4f46e5;
          color: white;
          cursor: pointer;
        }
        button:hover {
          background-color: #4338ca;
        }
        button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
        select {
          width: 100%;
          padding: 0.5rem;
          margin-bottom: 1rem;
          border: 1px solid #ccc;
          border-radius: 0.25rem;
        }
      `}</style>
    </Layout>
  );
};

export default NewPiece;
