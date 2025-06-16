import React from "react";
import SchemaCard from "./SchemaCard";

type GschemaEvent = {
  id: string;
  gschemaId: string | null;
  index: number;
  type: string;
  value: string;
};

type Schema = {
  id: string;
  name: string;
  type: string;
  eventcount: number;
  events: GschemaEvent[];
};

type SchemaListProps = {
  schemas: Schema[];
};

const SchemaList: React.FC<SchemaListProps> = ({ schemas }) => {
  return (
    <div className="schema-grid">
      {schemas.map((schema) => (
        <SchemaCard
          key={schema.id}
          id={schema.id}
          name={schema.name}
          type={schema.type}
          eventcount={schema.eventcount}
          events={schema.events}
        />
      ))}
      <style jsx>{`
        .schema-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          padding: 1.5rem;
        }
      `}</style>
    </div>
  );
};

export default SchemaList;
