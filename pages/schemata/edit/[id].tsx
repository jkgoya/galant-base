import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import Layout from '../../../components/Layout';
import prisma from '../../../lib/prisma';
import Router from 'next/router';

export const getServerSideProps: GetServerSideProps = async ({ params, req }) => {
  const gschema = await prisma.gschema.findUnique({
    where: { id: String(params?.id) },
  });
  return { props: { gschema } };
};

type GschemaProps = {
  id: string;
  name: string;
  citation: string | null;
  type: string;
  eventcount: number;
  active: boolean;
};

type Props = {
  gschema: GschemaProps;
};

const EditGschema: React.FC<Props> = ({ gschema }) => {
  const [name, setName] = useState(gschema.name);
  const [citation, setCitation] = useState(gschema.citation || '');
  const [type, setType] = useState(gschema.type);
  const [eventcount, setEventcount] = useState(gschema.eventcount);
  const [saving, setSaving] = useState(false);

  const submitData = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/post/gschema/${gschema.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, citation, type, eventcount }),
    });
    Router.push(`/schemata/${gschema.id}`);
  };

  return (
    <Layout>
      <div>
        <h1>Edit Schema</h1>
        <form onSubmit={submitData}>
          <input
            onChange={e => setName(e.target.value)}
            placeholder="Name"
            type="text"
            value={name}
          />
          <textarea
            cols={50}
            onChange={e => setCitation(e.target.value)}
            placeholder="Citation"
            rows={4}
            value={citation}
          />
          <input
            onChange={e => setType(e.target.value)}
            placeholder="Type"
            type="text"
            value={type}
          />
          <input
            onChange={e => setEventcount(parseInt(e.target.value))}
            placeholder="Event count"
            type="number"
            value={eventcount}
          />
          <input disabled={saving} type="submit" value="Save" />
        </form>
      </div>
      <style jsx>{`
        input[type='text'], textarea, input[type='number'] {
          width: 100%;
          padding: 0.5rem;
          margin: 0.5rem 0;
          border-radius: 0.25rem;
          border: 0.125rem solid rgba(0, 0, 0, 0.2);
        }
        input[type='submit'], button {
          background: #ececec;
          border: 0;
          padding: 1rem 2rem;
        }
      `}</style>
    </Layout>
  );
};

export default EditGschema; 