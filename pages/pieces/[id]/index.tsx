import React, { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import Layout from "../../../components/Layout";
import prisma from "../../../lib/prisma";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";

const VerovioScore = dynamic(() => import("../../../components/VerovioScore"), {
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

  // Convert Date objects to ISO strings
  const serializedPiece = {
    ...piece,
    createdAt: piece.createdAt.toISOString(),
    updatedAt: piece.updatedAt.toISOString(),
  };

  return { props: { piece: serializedPiece } };
};

interface PieceProps {
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
}

export default function Piece() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [piece, setPiece] = useState<PieceProps | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user?.email) {
      router.push("/api/auth/signin");
      return;
    }

    const fetchPiece = async () => {
      try {
        const response = await fetch(`/api/pieces/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch piece");
        }
        const data = await response.json();
        setPiece(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPiece();
    }
  }, [id, session, status, router]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this piece?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/pieces/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete piece");
      }

      router.push("/pieces");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete piece");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!piece) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-700">Piece not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{piece.title}</h1>
          <div className="space-x-4">
            <button
              onClick={() => router.push(`/pieces/${id}/annotate`)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Annotate
            </button>
            <button
              onClick={() => router.push(`/pieces/${id}/edit`)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Piece Details
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Title</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {piece.title}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Composer</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {piece.composer}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Format</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {piece.format}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Created At
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(piece.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Score
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <div className="verovio-container">
              <VerovioScore meiData={piece.meiData} />
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .verovio-container {
          width: 100%;
          overflow-x: auto;
          background: white;
          padding: 2rem;
          min-height: 400px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .verovio-container :global(svg) {
          max-width: none;
          height: auto;
        }
        .verovio-container :global(.verovio-score) {
          width: 100%;
          display: flex;
          justify-content: center;
        }
      `}</style>
    </Layout>
  );
}
