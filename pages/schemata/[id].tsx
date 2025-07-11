import React from "react";
import { GetServerSideProps } from "next";
import Layout from "../../components/Layout";
import prisma from "../../lib/prisma";
import Router from "next/router";
import { useSession, getSession } from "next-auth/react";

const EVENT_TYPES = ["melody", "bass", "meter", "figures", "roman"];

export const getServerSideProps: GetServerSideProps = async ({
  params,
  req,
}) => {
  const session = await getSession({ req });
  const gschema = await prisma.gschema.findUnique({
    where: { id: String(params?.id) },
    include: {
      events: true,
      contributor: { select: { email: true, name: true } },
    },
  });
  return { props: { gschema, sessionEmail: session?.user?.email || null } };
};

type GschemaEvent = {
  id: string;
  gschemaId: string | null;
  index: number;
  type: string;
  value: string;
};

type GschemaProps = {
  id: string;
  name: string;
  citation: string | null;
  type: string;
  eventcount: number;
  active: boolean;
  contributor: { email: string; name?: string | null } | null;
  events: GschemaEvent[];
};

type Props = {
  gschema: GschemaProps;
  sessionEmail: string | null;
};

async function deleteGschema(id: string): Promise<void> {
  await fetch(`/api/schemata/${id}`, {
    method: "DELETE",
  });
  Router.push("/myschemata");
}

async function publishSchema(id: string) {
  await fetch(`/api/schemata/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active: true }),
  });
  Router.reload();
}

const GschemaDetail: React.FC<Props> = ({ gschema, sessionEmail }) => {
  const { data: session, status } = useSession();
  if (!gschema)
    return (
      <Layout>
        <div>Schema not found.</div>
      </Layout>
    );
  const userHasValidSession = Boolean(session);
  const schemaBelongsToUser =
    sessionEmail &&
    (gschema.contributor?.email === sessionEmail ||
      (session?.user as any).isAdmin);

  // Build event table
  const eventTable: { [type: string]: string[] } = {
    melody: Array(gschema.eventcount).fill(""),
    bass: Array(gschema.eventcount).fill(""),
    meter: Array(gschema.eventcount).fill(""),
    figures: Array(gschema.eventcount).fill(""),
    roman: Array(gschema.eventcount).fill(""),
  };
  gschema.events.forEach((ev) => {
    if (eventTable[ev.type] && ev.index < gschema.eventcount) {
      eventTable[ev.type][ev.index] = ev.value;
    }
  });

  return (
    <Layout>
      <div>
        <h2>{gschema.name}</h2>
        <p>Type: {gschema.type}</p>
        <p>Citation: {gschema.citation}</p>
        <p>Event count: {gschema.eventcount}</p>
        <p>Status: {gschema.active ? "Active" : "Inactive"}</p>
        <p>
          Contributor:{" "}
          {gschema.contributor?.name || gschema.contributor?.email || "Unknown"}
        </p>
        <h3>Events</h3>
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <table
            style={{
              marginBottom: "1rem",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "0.25rem" }}>Type</th>
                {Array.from({ length: gschema.eventcount }, (_, idx) => (
                  <th key={idx} style={{ padding: "0.25rem", width: "2.5rem" }}>
                    Event {idx + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EVENT_TYPES.map((type) => (
                <tr key={type}>
                  <td
                    style={{
                      fontWeight: "bold",
                      textTransform: "capitalize",
                      padding: "0.25rem",
                    }}
                  >
                    {type}
                  </td>
                  {Array.from({ length: gschema.eventcount }, (_, idx) => (
                    <td
                      key={idx}
                      style={{ padding: "0.25rem", textAlign: "center" }}
                    >
                      {type === "bass" || type === "melody" ? (
                        <div
                          style={{
                            width: "2rem",
                            height: "2rem",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto",
                            backgroundColor:
                              type === "bass" ? "white" : "black",
                            color: type === "bass" ? "black" : "white",
                            border: "1px solid #ccc",
                            fontSize: "0.9rem",
                            fontWeight: "bold",
                          }}
                        >
                          {eventTable[type][idx]}
                        </div>
                      ) : (
                        eventTable[type][idx]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {userHasValidSession && schemaBelongsToUser && (
          <div style={{ marginTop: "1rem" }}>
            <button
              onClick={() => Router.push(`/schemata/edit/${gschema.id}`)}
              style={{ marginRight: "1rem" }}
            >
              Edit
            </button>
            <button onClick={() => deleteGschema(gschema.id)}>Delete</button>
          </div>
        )}
        {userHasValidSession && schemaBelongsToUser && !gschema.active && (
          <button
            style={{ marginTop: "1rem" }}
            onClick={() => publishSchema(gschema.id)}
          >
            Publish
          </button>
        )}
      </div>
      <style jsx>{`
        button {
          background: #ececec;
          border: 0;
          border-radius: 0.125rem;
          padding: 1rem 2rem;
        }
        button + button {
          margin-left: 1rem;
        }
      `}</style>
    </Layout>
  );
};

export default GschemaDetail;
