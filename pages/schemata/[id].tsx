import React from "react";
import { GetServerSideProps } from "next";
import Layout from "../../components/Layout";
import prisma from "../../lib/prisma";
import Router from "next/router";
import { useSession, getSession } from "next-auth/react";

const EVENT_TYPES = ["melody", "bass", "meter"];

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
    sessionEmail && gschema.contributor?.email === sessionEmail;

  // Build event table
  const eventTable: { [type: string]: string[] } = {
    melody: Array(gschema.eventcount).fill(""),
    bass: Array(gschema.eventcount).fill(""),
    meter: Array(gschema.eventcount).fill(""),
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
              {Array.from({ length: gschema.eventcount }, (_, idx) => (
                <th key={idx}>Event {idx + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVENT_TYPES.map((type) => (
              <tr key={type}>
                <td style={{ fontWeight: "bold", textTransform: "capitalize" }}>
                  {type}
                </td>
                {Array.from({ length: gschema.eventcount }, (_, idx) => (
                  <td key={idx}>{eventTable[type][idx]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
