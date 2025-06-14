import React from "react";
import { GetServerSideProps } from "next";
import { useSession, getSession } from "next-auth/react";
import Layout from "../../components/Layout";
import prisma from "../../lib/prisma";
import Link from "next/link";

type PieceProps = {
  id: string;
  title: string;
  composer: string;
};

type Props = {
  pieces: PieceProps[];
};

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getSession({ req });
  if (!session) {
    return {
      redirect: {
        destination: "/api/auth/signin",
        permanent: false,
      },
    };
  }

  const pieces = await prisma.piece.findMany({
    where: {
      contributor: { email: session.user.email },
    },
  });

  return {
    props: {
      pieces,
    },
  };
};

const MyPieces: React.FC<Props> = ({ pieces }) => {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div>You need to be authenticated to view this page.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <h1>My Pieces</h1>
        <main>
          {pieces.length === 0 ? (
            <p>You haven't submitted any pieces yet.</p>
          ) : (
            <div className="pieces">
              {pieces.map((piece) => (
                <div key={piece.id} className="piece">
                  <h2>
                    <Link href={`/pieces/${piece.id}`}>{piece.title}</Link>
                  </h2>
                  <p>Composer: {piece.composer}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <style jsx>{`
        .pieces {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }
        .piece {
          padding: 1.5rem;
          border: 1px solid #eaeaea;
          border-radius: 0.5rem;
          transition: box-shadow 0.2s ease;
        }
        .piece:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        h2 {
          margin: 0;
          font-size: 1.5rem;
        }
        h2 a {
          text-decoration: none;
          color: inherit;
        }
        h2 a:hover {
          color: #666;
        }
        p {
          margin: 0.5rem 0;
          color: #666;
        }
      `}</style>
    </Layout>
  );
};

export default MyPieces;
