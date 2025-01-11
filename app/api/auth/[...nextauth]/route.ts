import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import Admin from '@/models/Admin';
import { connectToDatabase } from '@/lib/mongodb';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          await connectToDatabase();
          
          const admin = await Admin.findOne({ email: credentials?.email });
          
          if (!admin) {
            throw new Error('Invalid email or password');
          }

          const isValid = await admin.comparePassword(credentials?.password || '');
          
          if (!isValid) {
            throw new Error('Invalid email or password');
          }

          return {
            id: admin._id.toString(),
            email: admin.email,
            name: admin.name,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 2 * 60 * 60, // 2 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }; 