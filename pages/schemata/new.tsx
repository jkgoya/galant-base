import React, { useState } from "react";
import Layout from "../../components/Layout";
import Router from "next/router";
import { getSession } from "next-auth/react";

const Draft_Gschema: React.FC = () => {
  const [name, setName] = useState("");
  const [citation, setCitation] = useState("");
  const [type, setType] = useState("");
  const [events, setEvents] = useState(0);

  const submitData = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    try {
      const session = await getSession();
      console.log("session", session);
      const body = { name, citation, type, events, email: session.user.email };
      const response = await fetch("/api/post/gschema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      await Router.push(
        `/schemata/new_events?gschemaId=${data.id}&eventcount=${data.eventcount}`
      );
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Layout>
      <div>
        <form onSubmit={submitData}>
          <h1>New Schema</h1>
          <input
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            type="text"
            value={name}
          />
          <textarea
            cols={50}
            onChange={(e) => setCitation(e.target.value)}
            placeholder="Citation"
            rows={8}
            value={citation}
          />
          <input
            onChange={(e) => setType(e.target.value)}
            placeholder="Type"
            type="text"
            value={type}
          />
          <input
            onChange={(e) => setEvents(parseInt(e.target.value))}
            placeholder="Events"
            type="number"
            value={events}
          />
          <input
            disabled={!citation || !name || !type || !events}
            type="submit"
            value="Create"
          />
          <a className="back" href="#" onClick={() => Router.push("/")}>
            or Cancel
          </a>
        </form>
      </div>
      <style jsx>{`
        .page {
          background: var(--geist-background);
          padding: 3rem;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        input[type="text"],
        textarea {
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

        .back {
          margin-left: 1rem;
        }
      `}</style>
    </Layout>
  );
};

export default Draft_Gschema;
