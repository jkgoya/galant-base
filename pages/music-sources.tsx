import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useSession } from "next-auth/react";
import Router from "next/router";

interface MusicSource {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  indexFile: string;
  composer: string;
  format: string;
  active: boolean;
}

const MusicSourcesPage: React.FC = () => {
  const { data: session, status } = useSession();
  const [sources, setSources] = useState<MusicSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    baseUrl: "",
    indexFile: "",
    composer: "",
    format: "krn",
    active: true,
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      Router.push("/api/auth/signin");
    }
  }, [status]);

  const fetchSources = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/music-sources");
      if (!res.ok) throw new Error("Failed to fetch music sources");
      const data = await res.json();
      setSources(data);
    } catch (err) {
      setError("Could not load music sources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchSources();
    }
  }, [status]);

  const handleInput = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.checked });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/music-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add music source");
      }
      setForm({
        name: "",
        description: "",
        baseUrl: "",
        indexFile: "",
        composer: "",
        format: "krn",
        active: true,
      });
      fetchSources();
    } catch (err: any) {
      setError(err.message || "Failed to add music source");
    } finally {
      setAdding(false);
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

  return (
    <Layout>
      <div>
        <h1>Music Sources</h1>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <h2>Add New Music Source</h2>
        <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
          <input
            name="name"
            placeholder="Name"
            value={form.name}
            onChange={handleInput}
            required
          />
          <input
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleInput}
          />
          <input
            name="baseUrl"
            placeholder="Base URL"
            value={form.baseUrl}
            onChange={handleInput}
            required
          />
          <input
            name="indexFile"
            placeholder="Index File"
            value={form.indexFile}
            onChange={handleInput}
            required
          />
          <input
            name="composer"
            placeholder="Composer"
            value={form.composer}
            onChange={handleInput}
            required
          />
          <select
            name="format"
            value={form.format}
            onChange={handleInput}
            required
          >
            <option value="krn">Kern</option>
            <option value="mei">MEI</option>
          </select>
          <label style={{ marginLeft: "1rem" }}>
            <input
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={handleCheckbox}
            />{" "}
            Active
          </label>
          <button
            type="submit"
            disabled={adding}
            style={{ marginLeft: "1rem" }}
          >
            {adding ? "Adding..." : "Add Source"}
          </button>
        </form>
        <h2>Current Music Sources</h2>
        {loading ? (
          <p>Loading sources...</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Base URL</th>
                <th>Index File</th>
                <th>Composer</th>
                <th>Format</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((src) => (
                <tr key={src.id}>
                  <td>{src.name}</td>
                  <td>{src.description}</td>
                  <td>{src.baseUrl}</td>
                  <td>{src.indexFile}</td>
                  <td>{src.composer}</td>
                  <td>{src.format}</td>
                  <td>{src.active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <style jsx>{`
        input,
        select {
          margin: 0.5rem 0.5rem 0.5rem 0;
          padding: 0.5rem;
          border-radius: 0.25rem;
          border: 0.125rem solid rgba(0, 0, 0, 0.2);
        }
        button {
          background: #ececec;
          border: 0;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
        }
        table,
        th,
        td {
          border: 1px solid #eee;
        }
        th,
        td {
          padding: 0.5rem;
        }
      `}</style>
    </Layout>
  );
};

export default MusicSourcesPage;
