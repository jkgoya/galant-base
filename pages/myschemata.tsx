import React from 'react';
import { GetServerSideProps } from 'next';
import { useSession, getSession } from 'next-auth/react';
import Layout from '../components/Layout';
import prisma from '../lib/prisma';
import Link from 'next/link';

const EVENT_TYPES = ['melody', 'bass', 'meter'];

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getSession({ req });
  if (!session) {
    res.statusCode = 403;
    return { props: { gschemas: [] } };
  }

  const gschemas = await prisma.gschema.findMany({
    where: {
      contributor: { email: session.user.email },
    },
    include: {
      events: true,
    },
  });
  return {
    props: { gschemas },
  };
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
  events: GschemaEvent[];
};

type Props = {
  gschemas: GschemaProps[];
};

const Schemata: React.FC<Props> = (props) => {
  const { data: session } = useSession();

  if (!session) {
    return (
      <Layout>
        <h1>My Schemata</h1>
        <div>You need to be authenticated to view this page.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page">
        <h1>My Schemata</h1>
        <main>
          {props.gschemas.map((gschema) => {
            // Build a lookup: type -> [values by index]
            const eventTable: { [type: string]: string[] } = {
              melody: Array(gschema.eventcount).fill(''),
              bass: Array(gschema.eventcount).fill(''),
              meter: Array(gschema.eventcount).fill(''),
            };
            gschema.events.forEach(ev => {
              if (eventTable[ev.type] && ev.index < gschema.eventcount) {
                eventTable[ev.type][ev.index] = ev.value;
              }
            });
            return (
              <div key={gschema.id} className="gschema">
                <h2><Link href={`/schemata/${gschema.id}`}>{gschema.name}</Link></h2>
                <p>Type: {gschema.type}</p>
                <p>Citation: {gschema.citation}</p>
                <p>Event count: {gschema.eventcount}</p>
                <p>Status: {gschema.active ? 'Active' : 'Inactive'}</p>
                <h3>Events</h3>
                <table style={{ width: '100%', marginBottom: '1rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Type</th>
                      {Array.from({ length: gschema.eventcount }, (_, idx) => (
                        <th key={idx}>Event {idx + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {EVENT_TYPES.map((type) => (
                      <tr key={type}>
                        <td style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{type}</td>
                        {Array.from({ length: gschema.eventcount }, (_, idx) => (
                          <td key={idx}>{eventTable[type][idx]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </main>
      </div>
      <style jsx>{`
        .gschema {
          background: var(--geist-background);
          padding: 2rem;
          margin-bottom: 2rem;
          border-radius: 0.5rem;
          box-shadow: 1px 1px 3px #aaa;
        }
        .gschema:hover {
          box-shadow: 2px 2px 6px #888;
        }
      `}</style>
    </Layout>
  );
};

export default Schemata;