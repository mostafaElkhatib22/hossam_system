import NextAuth, { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import clientPromise from "@/lib/db";
import connectMongoDB from "@/lib/db_connect";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      password: string;
    };
  }
}
export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  adapter: MongoDBAdapter(clientPromise),
  session: {
    // Set it as jwt instead of database
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      id: "credentials",
      credentials: {
        name: { label: "Name", type: "text" },
        email: {
          label: "Email",
          type: "text",
          placeholder: "test@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectMongoDB();
        const email = credentials?.email;
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }
        const user = await User.findOne({ email });
        const passwordOk =
          user &&
          password &&
          typeof user.password === "string" &&
          bcrypt.compareSync(password, user.password);

        if (passwordOk) {
          return {
            id: user._id!.toString(),
            name: (user as any).username,
            email: user.email,
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
};
