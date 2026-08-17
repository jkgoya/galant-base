import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/react";

const Header: React.FC = () => {
  const router = useRouter();
  const isActive: (pathname: string) => boolean = (pathname) =>
    router.pathname === pathname;

  const { data: session, status } = useSession();

  return (
    <nav>
      <div className="left">
        <Link href="/" className="bold" data-active={isActive("/")}>
          Home
        </Link>
        <Link href="/schemata" data-active={isActive("/schemata")}>
          Schemata
        </Link>
        <Link href="/pieces" data-active={isActive("/pieces")}>
          Pieces
        </Link>
      </div>
      <div className="right">
        {status === "loading" ? (
          <p>Validating session ...</p>
        ) : session ? (
          <>
            <button type="button" onClick={() => router.push("/profile")}>
              {session.user.name} ({session.user.email})
            </button>
            <button type="button" onClick={() => signOut({ redirect: false })}>
              Log out
            </button>
          </>
        ) : (
          <Link href="/api/auth/signin" className="login">
            Log in
          </Link>
        )}
      </div>
      <style jsx>{`
        nav {
          display: flex;
          padding: 2rem;
          align-items: center;
        }

        .left,
        .right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .right {
          margin-left: auto;
        }

        .bold {
          font-weight: bold;
        }

        .left :global(a),
        .right :global(a) {
          text-decoration: none;
          color: var(--geist-foreground);
        }

        .left :global(a[data-active="true"]) {
          color: gray;
        }

        .right :global(a.login) {
          border: 1px solid var(--geist-foreground);
          padding: 0.5rem 1rem;
          border-radius: 3px;
        }

        .right p {
          margin: 0;
        }

        .right button {
          border: none;
          background: none;
          cursor: pointer;
          font-size: 1rem;
          padding: 0;
          color: var(--geist-foreground);
        }

        .right button:hover {
          color: gray;
        }
      `}</style>
    </nav>
  );
};

export default Header;
