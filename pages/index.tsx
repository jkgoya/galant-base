import React from 'react';
import { GetServerSideProps } from 'next';
import Layout from '../components/Layout';
import prisma from '../lib/prisma';
import Link from 'next/link';

export const getServerSideProps: GetServerSideProps = async () => {
  const gschemas = await prisma.gschema.findMany({
    where: { active: true },
    include: { events: true },
  });
  return { props: { gschemas } };
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
  contributor?: { email?: string };
};

type Props = {
  gschemas: GschemaProps[];
};

const Index: React.FC<Props> = ({ gschemas }) => {

  return (
    <Layout>
      <div className="page">
        <h1>All Active Schemata</h1>
        <main>
          {gschemas.map((gschema) => (
            <div key={gschema.id} className="gschema">
              <h2><Link href={`/schemata/${gschema.id}`}>{gschema.name}</Link></h2>
              <p>Type: {gschema.type}</p>
              <p>Citation: {gschema.citation}</p>
              <p>Event count: {gschema.eventcount}</p>
              <p>Status: {gschema.active ? 'Active' : 'Inactive'}</p>
            </div>
          ))}
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
        button {
          background: #ececec;
          border: 0;
          border-radius: 0.125rem;
          padding: 1rem 2rem;
          margin-top: 1rem;
        }
      `}</style>
    </Layout>
  );
};

export default Index;
