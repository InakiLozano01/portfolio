import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import Admin from '@/models/Admin';
import { connectToDatabase } from '@/lib/mongodb';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                // During build time, skip auth
                if (process.env.SKIP_DB_DURING_BUILD === 'true') {
                    console.log('[MongoDB] Skipping auth during build');
                    return null;
                }

                try {
                    await connectToDatabase();

                    const admin = await Admin.findOne({ email: credentials?.email });

                    if (!admin) {
                        throw new Error('email_not_found');
                    }

                    const isValid = await admin.comparePassword(credentials?.password || '');

                    if (!isValid) {
                        throw new Error('invalid_password');
                    }

                    return {
                        id: admin._id.toString(),
                        email: admin.email,
                        name: admin.name,
                    };
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'unknown_error';
                    console.error('Auth error:', error);

                    // Throw specific error messages that can be handled by the client
                    switch (message) {
                        case 'email_not_found':
                            throw new Error('No account found with this email address');
                        case 'invalid_password':
                            throw new Error('Invalid password');
                        default:
                            throw new Error('An error occurred during authentication. Please try again later.');
                    }
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
        maxAge: 30 * 60, // 30 minutes
    },
    callbacks: {
        async jwt({ token, user, account }) {
            if (account && user) {
                return {
                    ...token,
                    id: user.id,
                    email: user.email,
                    name: user.name,
                };
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.email = token.email as string;
                session.user.name = token.name as string;
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            // Allows relative callback URLs
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            // Allows callback URLs on the same origin
            else if (new URL(url).origin === baseUrl) return url;
            return baseUrl;
        },
    },
    debug: process.env.NODE_ENV === 'development',
    secret: process.env.NEXTAUTH_SECRET,
    useSecureCookies: process.env.NODE_ENV === 'production',
}; 