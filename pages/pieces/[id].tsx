import React from "react";
import { GetServerSideProps } from "next";
import Layout from "../../components/Layout";
import prisma from "../../lib/prisma";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Router from "next/router";

const VerovioScore = dynamic(() => import("../../components/VerovioScore"), {
  ssr: false,
});

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const piece = await prisma.piece.findUnique({
    where: { id: String(params?.id) },
    include: {
      contributor: {
        select: {
          email: true,
        },
      },
    },
  });
  return { props: { piece } };
};

type PieceProps = {
  id: string;
  title: string;
  composer: string;
  meiData: string;
  contributor?: {
    email: string;
  };
};

type Props = {
  piece: PieceProps;
};

const PieceDetail: React.FC<Props> = ({ piece }) => {
  const { data: session } = useSession();
  const isContributor = session?.user?.email === piece.contributor?.email;

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this piece?")) return;
    try {
      const res = await fetch(`/api/pieces/${piece.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete piece");
      Router.push("/pieces");
    } catch (err) {
      alert("Failed to delete piece");
    }
  };

  return (
    <Layout>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1>{piece.title}</h1>
          {isContributor && (
            <div>
              <Link href={`/pieces/edit/${piece.id}`}>
                <button
                  style={{
                    padding: "0.5rem 1rem",
                    cursor: "pointer",
                    marginRight: "1rem",
                  }}
                >
                  Edit Piece
                </button>
              </Link>
              <button
                onClick={handleDelete}
                style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
              >
                Delete Piece
              </button>
            </div>
          )}
        </div>
        <p>Composer: {piece.composer}</p>
        <h3>Score</h3>
        <VerovioScore meiData={piece.meiData} />
      </div>
      <style jsx>{`
        button {
          background: #ececec;
          border: 0;
          border-radius: 0.25rem;
        }
        button:hover {
          background: #ddd;
        }
      `}</style>
    </Layout>
  );
};

export default PieceDetail;
