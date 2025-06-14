import React from "react";
import Layout from "../components/Layout";
import Link from "next/link";
import { useSession } from "next-auth/react";

const Home: React.FC = () => {
  const { data: session } = useSession();

  return (
    <Layout>
      <div className="page">
        <h1>Welcome to Galant-Base: Community Annotation of Galant Schemata</h1>
        <div className="section">
          <h2>Schemata</h2>
          <p>Explore and contribute to our collection of musical schemata.</p>
          <div className="button-group">
            <Link href="/schemata">
              <button>View All Schemata</button>
            </Link>
            {session && (
              <>
                <Link href="/schemata/mine">
                  <button>My Schemata</button>
                </Link>
                <Link href="/schemata/new">
                  <button>Create New Schema</button>
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="section">
          <h2>Pieces</h2>
          <p>Browse and analyze musical pieces in our database.</p>
          <div className="button-group">
            <Link href="/pieces">
              <button>View All Pieces</button>
            </Link>
            {session && (
              <>
                <Link href="/pieces/mine">
                  <button>My Pieces</button>
                </Link>
                <Link href="/pieces/new">
                  <button>Add New Piece</button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .page {
          padding: 2rem;
        }
        .section {
          background: var(--geist-background);
          padding: 2rem;
          margin-bottom: 2rem;
          border-radius: 0.5rem;
          box-shadow: 1px 1px 3px #aaa;
        }
        .section:hover {
          box-shadow: 2px 2px 6px #888;
        }
        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
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
        h1 {
          margin-bottom: 2rem;
        }
        h2 {
          margin-bottom: 1rem;
        }
        p {
          color: #666;
          margin-bottom: 1rem;
        }
      `}</style>
    </Layout>
  );
};

export default Home;
