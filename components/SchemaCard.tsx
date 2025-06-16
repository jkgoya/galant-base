import React from "react";
import Link from "next/link";

const EVENT_TYPES = ["melody", "bass", "meter"];

type GschemaEvent = {
  id: string;
  gschemaId: string | null;
  index: number;
  type: string;
  value: string;
};

type SchemaCardProps = {
  id: string;
  name: string;
  type: string;
  eventcount: number;
  events: GschemaEvent[];
};

const SchemaCard: React.FC<SchemaCardProps> = ({
  id,
  name,
  type,
  eventcount,
  events,
}) => {
  // Build event table
  const eventTable: { [type: string]: string[] } = {
    melody: Array(eventcount).fill(""),
    bass: Array(eventcount).fill(""),
    meter: Array(eventcount).fill(""),
  };
  events.forEach((ev) => {
    if (eventTable[ev.type] && ev.index < eventcount) {
      eventTable[ev.type][ev.index] = ev.value;
    }
  });

  return (
    <div className="gschema">
      <div className="header">
        <h2>
          <Link href={`/schemata/${id}`}>{name}</Link>
        </h2>
        <span className="type">{type}</span>
      </div>
      <div className="table-container">
        <table className="events-table">
          <thead>
            <tr>
              <th>Type</th>
              {Array.from({ length: eventcount }, (_, idx) => (
                <th key={idx}>Event {idx + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVENT_TYPES.map((type) => (
              <tr key={type}>
                <td>{type}</td>
                {Array.from({ length: eventcount }, (_, idx) => (
                  <td key={idx}>
                    {type === "bass" || type === "melody" ? (
                      <div className={`circle ${type}`}>
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
      <style jsx>{`
        .gschema {
          background: var(--geist-background);
          padding: 1.5rem;
          border-radius: 0.5rem;
          box-shadow: 1px 1px 3px #aaa;
          display: inline-block;
          min-width: fit-content;
        }
        .gschema:hover {
          box-shadow: 2px 2px 6px #888;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .header h2 {
          margin: 0;
        }
        .type {
          color: #666;
          font-size: 0.9rem;
        }
        .table-container {
          display: flex;
          justify-content: flex-start;
        }
        .events-table {
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .events-table th,
        .events-table td {
          padding: 0.25rem;
          text-align: center;
        }
        .events-table th:first-child,
        .events-table td:first-child {
          text-align: left;
          font-weight: bold;
          text-transform: capitalize;
        }
        .circle {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          border: 1px solid #ccc;
          font-size: 0.9rem;
          font-weight: bold;
        }
        .circle.bass {
          background: white;
          color: black;
        }
        .circle.melody {
          background: black;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default SchemaCard;
