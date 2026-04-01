import type { AuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "./db";
import { accountsTable, authenticatorsTable, sessionsTable, usersTable, verificationTokensTable } from "./db/schema";
import { ensureLocalUser, getUserById } from "./store";
import { getEnv, hasDatabase, hasEmailAuth } from "./env";
import { stableId } from "./crypto";

function buildProviders() {
  const env = getEnv();
  const providers: AuthOptions["providers"] = [
    CredentialsProvider({
      name: "Local email",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const name = credentials?.name?.trim() || email?.split("@")[0] || "FlowLens User";
        if (!email) {
          return null;
        }

        const user = await ensureLocalUser({
          id: stableId(email),
          email,
          name,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ];

  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: env.AUTH_GOOGLE_ID,
        clientSecret: env.AUTH_GOOGLE_SECRET,
      }),
    );
  }

  if (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) {
    providers.push(
      GitHubProvider({
        clientId: env.AUTH_GITHUB_ID,
        clientSecret: env.AUTH_GITHUB_SECRET,
      }),
    );
  }

  if (hasEmailAuth()) {
    providers.push(
      EmailProvider({
        server: {
          host: env.EMAIL_SERVER_HOST,
          port: env.EMAIL_SERVER_PORT,
          auth: {
            user: env.EMAIL_SERVER_USER,
            pass: env.EMAIL_SERVER_PASSWORD,
          },
        },
        from: env.EMAIL_FROM,
      }),
    );
  }

  return providers;
}

const db = getDb();

export const authOptions: AuthOptions = {
  adapter:
    db && hasDatabase()
      ? DrizzleAdapter(db, {
          usersTable,
          accountsTable,
          sessionsTable,
          verificationTokensTable,
          authenticatorsTable,
        })
      : undefined,
  providers: buildProviders(),
  session: {
    strategy: db && hasDatabase() ? "database" : "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  secret: getEnv().NEXTAUTH_SECRET ?? "flowlens-local-auth-secret",
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      await ensureLocalUser({
        id: user.id || stableId(user.email),
        email: user.email,
        name: user.name || user.email.split("@")[0],
        image: user.image ?? undefined,
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      } else if (!token.id && token.email) {
        token.id = stableId(token.email);
      }
      return token;
    },
    async session({ session, token, user }) {
      const id = user?.id ?? token.id ?? (session.user?.email ? stableId(session.user.email) : "");
      if (session.user && id) {
        session.user.id = id;
      }
      return session;
    },
  },
};

export async function auth() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  const localUser =
    (await getUserById(session.user.id)) ??
    (await ensureLocalUser({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || session.user.email.split("@")[0],
      image: session.user.image ?? undefined,
    }));

  return localUser;
}
