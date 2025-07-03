import React from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { options as authOptions } from "../api/auth/[...nextauth]";
import prisma from "../../lib/prisma";
import SchemaList from "../../components/SchemaList";
import Layout from "../../components/Layout";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/api/auth/signin",
        permanent: false,
      },
    };
  }

  const schemas = await prisma.gschema.findMany({
    where: {
      contributor: { email: session.user.email },
    },
    include: {
      events: true,
    },
    orderBy: {
      orderIndex: "asc",
    },
  });

  return {
    props: {
      schemas: JSON.parse(JSON.stringify(schemas)),
    },
  };
};

type Props = {
  schemas: any[];
};

export default function MySchemataPage({ schemas }: Props) {
  return (
    <Layout>
      <div className="page">
        <h1>My Schemata</h1>
        <SchemaList schemas={schemas} />
      </div>
      <style jsx>{`
        .page {
          padding: 2rem;
        }
      `}</style>
    </Layout>
  );
}
