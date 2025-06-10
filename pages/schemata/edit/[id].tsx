import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Layout from '../../../components/Layout';
import prisma from '../../../lib/prisma';
import Router from 'next/router';

const EVENT_TYPES = ['meter', 'melody', 'bass', 'figures', 'roman'];

export const getServerSideProps: GetServerSideProps = async ({ params, req }) => {
  const gschema = await prisma.gschema.findUnique({
    where: { id: String(params?.id) },
    include: { events: true },
  });
  return { props: { gschema } };
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
  gschema: GschemaProps;
};

const EditGschema: React.FC<Props> = ({ gschema }) => {
  const [name, setName] = useState(gschema.name);
  const [citation, setCitation] = useState(gschema.citation || '');
  const [type, setType] = useState(gschema.type);
  const [eventcount, setEventcount] = useState(gschema.eventcount);
  const [saving, setSaving] = useState(false);

  // Event values: values[type][index] = value
  const [values, setValues] = useState<{ [type: string]: string[] }>(() => {
    const initial: { [type: string]: string[] } = {
      melody: Array(gschema.eventcount).fill(''),
      bass: Array(gschema.eventcount).fill(''),
      meter: Array(gschema.eventcount).fill(''),
    };
    gschema.events.forEach(ev => {
      if (initial[ev.type] && ev.index < gschema.eventcount) {
        initial[ev.type][ev.index] = ev.value;
      }
    });
    return initial;
  });

  const safeEventcount = typeof eventcount === 'number' && !isNaN(eventcount) && eventcount > 0 ? eventcount : 0;

  useEffect(() => {
    // If eventcount changes, adjust the values array
    setValues(prev => {
      const updated: { [type: string]: string[] } = {};
      EVENT_TYPES.forEach(type => {
        updated[type] = Array(safeEventcount).fill('');
        for (let i = 0; i < Math.min(prev[type]?.length || 0, safeEventcount); i++) {
          updated[type][i] = prev[type][i];
        }
      });
      return updated;
    });
  }, [safeEventcount]);

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
    setSaving(true);
    await fetch(`/api/post/gschema/${gschema.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, citation, type, eventcount }),
    });
    // Update events
    const events = EVENT_TYPES.flatMap((type) =>
      values[type].map((value, idx) => ({
        index: idx,
        type,
        value,
      }))
    );
    await fetch('/api/post/gschema_event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gschemaId: gschema.id, events }),
    });
    Router.push(`/schemata/${gschema.id}`);
  };

  // Check if all values are filled
  const allFilled = EVENT_TYPES.every(type => values[type]?.every(v => v));

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
            onChange={e => {
              const val = parseInt(e.target.value);
              setEventcount(isNaN(val) ? 0 : val);
            }}
            placeholder="Event count"
            type="number"
            value={eventcount}
          />
          {safeEventcount > 0 && <>
          <h3>Edit Events</h3>
          <table style={{ width: '100%', marginBottom: '1rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Type</th>
                {Array.from({ length: safeEventcount }, (_, idx) => (
                  <th key={idx}>Event {idx + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EVENT_TYPES.map((type) => (
                <tr key={type}>
                  <td style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{type}</td>
                  {Array.from({ length: safeEventcount }, (_, idx) => (
                    <td key={idx}>
                      <input
                        type="text"
                        value={values[type]?.[idx] || ''}
                        onChange={e => handleValueChange(type, idx, e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </>}
          <input disabled={saving || !allFilled || safeEventcount === 0} type="submit" value="Save" />
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
        table, th, td {
          border: 1px solid #eee;
        }
        th, td {
          padding: 0.5rem;
        }
      `}</style>
    </Layout>
  );
};

export default EditGschema; 