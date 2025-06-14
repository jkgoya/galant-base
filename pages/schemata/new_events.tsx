import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import Router, { useRouter } from "next/router";
import { getSession } from "next-auth/react";

const EVENT_TYPES = ["meter", "melody", "bass", "figures", "roman"];

const CreateGschemaEvents: React.FC = () => {
  const router = useRouter();
  const [gschemaId, setGschemaId] = useState("");
  const [eventcount, setEventcount] = useState(1);
  // values[type][index] = value
  const [values, setValues] = useState<{ [type: string]: string[] }>({
    melody: [],
    bass: [],
    meter: [],
    figures: [],
    roman: [],
  });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (router.query.gschemaId) {
      setGschemaId(router.query.gschemaId as string);
    }
    if (router.query.eventcount) {
      const count = parseInt(router.query.eventcount as string);
      setEventcount(count);
      setValues({
        melody: Array(count).fill(""),
        bass: Array(count).fill(""),
        meter: Array(count).fill(""),
        figures: Array(count).fill(""),
        roman: Array(count).fill(""),
      });
    }
  }, [router.query.gschemaId, router.query.eventcount]);

  const handleValueChange = (type: string, idx: number, value: string) => {
    setValues((prev) => {
      const updated = { ...prev };
      updated[type] = [...updated[type]];
      updated[type][idx] = value;
      return updated;
    });
  };

  const submitData = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    try {
      const session = await getSession();
      // Flatten values into events array
      const events = EVENT_TYPES.flatMap((type) =>
        values[type].map((value, idx) => ({
          index: idx,
          type,
          value,
        }))
      );
      const body = { gschemaId, events, email: session.user.email };
      await fetch("/api/schemata/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSuccess(true);
      setTimeout(() => Router.push("/schemata/new"), 1500);
    } catch (error) {
      console.error(error);
    }
  };

  // Check if all values are filled
  const allFilled = EVENT_TYPES.every((type) => values[type]?.every((v) => v));

  return (
    <Layout>
      <div>
        <form onSubmit={submitData}>
          <h1>Add Events to Gschema</h1>
          <input
            placeholder="Gschema ID"
            type="text"
            value={gschemaId}
            readOnly
          />
          <table
            style={{
              width: "100%",
              marginBottom: "1rem",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Type</th>
                {Array.from({ length: eventcount }, (_, idx) => (
                  <th key={idx}>Event {idx + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EVENT_TYPES.map((type) => (
                <tr key={type}>
                  <td
                    style={{ fontWeight: "bold", textTransform: "capitalize" }}
                  >
                    {type}
                  </td>
                  {Array.from({ length: eventcount }, (_, idx) => (
                    <td key={idx}>
                      <input
                        type="text"
                        value={values[type]?.[idx] || ""}
                        onChange={(e) =>
                          handleValueChange(type, idx, e.target.value)
                        }
                        style={{ width: "100%" }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <input
            disabled={!gschemaId || !allFilled}
            type="submit"
            value="Create Events"
          />
          <a className="back" href="#" onClick={() => Router.push("/")}>
            or Cancel
          </a>
        </form>
        {success && <p>Events created! Redirecting...</p>}
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
        input[type="number"],
        select {
          padding: 0.5rem;
          margin: 0.5rem 0;
          border-radius: 0.25rem;
          border: 0.125rem solid rgba(0, 0, 0, 0.2);
        }
        input[type="submit"],
        button {
          background: #ececec;
          border: 0;
          padding: 1rem 2rem;
        }
        .back {
          margin-left: 1rem;
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

export default CreateGschemaEvents;
