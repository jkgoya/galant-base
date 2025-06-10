import React from 'react';
import { GetServerSideProps } from 'next';
import Layout from '../components/Layout';
import prisma from '../lib/prisma';
import Link from 'next/link';

export const getServerSideProps: GetServerSideProps = async () => {
  const pieces = await prisma.piece.findMany();
  return { props: { pieces } };
};

type PieceProps = {
  id: string;
  title: string;
  composer: string;
};

type Props = {
  pieces: PieceProps[];
};

const Pieces: React.FC<Props> = ({ pieces }) => (
  <Layout>
    <div className="page">
      <h1>All Pieces</h1>
      <div className="card-list">
        {pieces.map((piece) => (
          <div key={piece.id} className="piece-card">
            <h3><Link href={`/pieces/${piece.id}`}>{piece.title}</Link></h3>
            <p>Composer: {piece.composer}</p>
          </div>
        ))}
      </div>
      <style jsx>{`
        .card-list {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .piece-card {
          background: #fff;
          border-radius: 0.5rem;
          box-shadow: 1px 1px 3px #aaa;
          padding: 1rem;
          min-width: 200px;
          max-width: 250px;
        }
        .piece-card h3 {
          margin: 0 0 0.5rem 0;
        }
      `}</style>
    </div>
  </Layout>
);

export default Pieces; 