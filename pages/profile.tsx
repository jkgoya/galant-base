import React, { useState } from "react";
import { GetServerSideProps } from "next";
import { useSession, getSession } from "next-auth/react";
import Layout from "../components/Layout";
import prisma from "../lib/prisma";

type Props = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const session = await getSession({ req });
  if (!session) {
    return {
      redirect: {
        destination: "/api/auth/signin",
        permanent: false,
      },
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return {
    props: {
      user: JSON.parse(JSON.stringify(user)),
    },
  };
};

const Profile: React.FC<Props> = ({ user }) => {
  const { data: session, status } = useSession();
  const [name, setName] = useState(user.name || "");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }

      setIsEditing(false);
    } catch (err) {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div>
        <h1>Profile</h1>
        <div className="profile">
          <div className="field">
            <label>Email:</label>
            <span>{user.email}</span>
          </div>
          <div className="field">
            <label>Display Name:</label>
            {isEditing ? (
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
                <div className="actions">
                  <button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setName(user.name || "");
                      setIsEditing(false);
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="name-display">
                <span>{user.name || "No name set"}</span>
                <button onClick={() => setIsEditing(true)}>Edit</button>
              </div>
            )}
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
      <style jsx>{`
        .profile {
          max-width: 600px;
          margin: 2rem 0;
        }
        .field {
          margin: 1.5rem 0;
        }
        label {
          display: block;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .name-display {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        input {
          width: 100%;
          padding: 0.5rem;
          margin: 0.5rem 0;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        .actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          background: #ececec;
          cursor: pointer;
        }
        button:hover {
          background: #ddd;
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .error {
          color: red;
          margin-top: 1rem;
        }
      `}</style>
    </Layout>
  );
};

export default Profile;
