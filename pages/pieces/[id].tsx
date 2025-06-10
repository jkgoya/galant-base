import React from 'react';
import { GetServerSideProps } from 'next';
import Layout from '../../components/Layout';
import prisma from '../../lib/prisma';
import dynamic from 'next/dynamic';

const VerovioScore = dynamic(() => import('../../components/VerovioScore'), { ssr: false });

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const piece = await prisma.piece.findUnique({
    where: { id: String(params?.id) },
  });
  return { props: { piece } };
};

type PieceProps = {
  id: string;
  title: string;
  composer: string;
  meiUrl: string;
};

type Props = {
  piece: PieceProps;
};

const PieceDetail: React.FC<Props> = ({ piece }) => (
  <Layout>
    <div>
      <h1>{piece.title}</h1>
      <p>Composer: {piece.composer}</p>
      <h3>Score</h3>
      <VerovioScore meiUrl={piece.meiUrl} />
    </div>
  </Layout>
);

export default PieceDetail; 