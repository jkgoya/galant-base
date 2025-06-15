import React from "react";
import { GetServerSideProps } from "next";
import Layout from "../../components/Layout";
import prisma from "../../lib/prisma";
import Link from "next/link";
import { useSession } from "next-auth/react";

export const getServerSideProps: GetServerSideProps = async () => {
  const pieces = await prisma.piece.findMany({
    include: {
      contributor: {
        select: {
          email: true,
        },
      },
    },
  });

  // Convert Date objects to ISO strings
  const serializedPieces = pieces.map((piece) => ({
    ...piece,
    createdAt: piece.createdAt.toISOString(),
    updatedAt: piece.updatedAt.toISOString(),
  }));

  return { props: { pieces: serializedPieces } };
};

type PieceProps = {
  id: string;
  title: string;
  composer: string;
  format: string;
  createdAt: string;
  updatedAt: string;
  meiData: string;
  contributor?: {
    email: string;
  };
};

type Props = {
  pieces: PieceProps[];
};

const Pieces: React.FC<Props> = ({ pieces }) => {
  const { data: session } = useSession();

  return (
    <Layout>
      <div className="page">
        <h1>All Pieces</h1>
        <div className="actions">
          {session?.user?.email && (
            <Link href="/pieces/new">
              <button>Add New Piece</button>
            </Link>
          )}
        </div>
        <main>
          {pieces.map((piece) => (
            <div key={piece.id} className="gschema">
              <h2>
                <Link href={`/pieces/${piece.id}`}>{piece.title}</Link>
              </h2>
              <p>Composer: {piece.composer}</p>
              <p>Format: {piece.format}</p>
              <p>Added: {new Date(piece.createdAt).toLocaleDateString()}</p>
              {piece.contributor && (
                <p>Contributor: {piece.contributor.email}</p>
              )}
            </div>
          ))}
        </main>
      </div>
      <style jsx>{`
        .actions {
          margin-bottom: 2rem;
          display: flex;
          gap: 1rem;
        }
        button {
          background: #ececec;
          border: 0;
          border-radius: 0.125rem;
          padding: 1rem 2rem;
          cursor: pointer;
          font-size: 1rem;
        }
        button:hover {
          background: #ddd;
        }
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

export default Pieces;
