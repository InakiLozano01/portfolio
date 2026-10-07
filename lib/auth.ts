import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import Admin from '@/models/Admin';
import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { clientIpFromHeaders, hit, reset } from '@/lib/rate-limit';

const LOGIN_WINDOW = 15 * 60 * 1000;
// bcrypt hash of a random string; only used to spend the same time when an email is unknown.
const DUMMY_HASH = '$2a$10$.2j.CG3d8paQIYjx6NZwLOzecX2hJa8cKxYx0CjfTuAGB2Iwc5JSG';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                // During build time, skip auth
                if (process.env.SKIP_DB_DURING_BUILD === 'true') {
                    console.log('[Database] Skipping auth during build');
                    return null;
                }

                const email = String(credentials?.email || '').trim().toLowerCase().slice(0, 200);
                const password = String(credentials?.password || '').slice(0, 200);
                const ip = clientIpFromHeaders(req?.headers as Record<string, string> | undefined);
                // Throttle by address and by account: 20 tries per address and 5 per account+address per 15 minutes.
                const ipKey = `login:ip:${ip}`;
                const accountKey = `login:acct:${email}:${ip}`;
                // Count the attempt before verifying, so a burst of parallel requests cannot slip past the limit.
                const ipOk = hit(ipKey, 20, LOGIN_WINDOW).ok;
                const accountOk = hit(accountKey, 5, LOGIN_WINDOW).ok;
                if (!ipOk || !accountOk) {
                    throw new Error('Too many sign-in attempts. Wait 15 minutes and try again.');
                }

                let admin: any = null;
                let valid = false;
                try {
                    await connectToDatabase();
                    admin = await Admin.findOne({ email });
                    // Compare against a dummy hash when the account does not exist, so timing reveals nothing.
                    valid = admin
                        ? await admin.comparePassword(password)
                        : (await bcrypt.compare(password, DUMMY_HASH), false);
                } catch (error) {
                    console.error('Auth error:', error);
                    throw new Error('Sign-in is unavailable right now. Try again in a minute.');
                }

                if (!admin || !valid) {
                    // One message for an unknown email and a wrong password, so accounts cannot be enumerated.
                    throw new Error('Email or password is incorrect.');
                }

                reset(accountKey);
                return {
                    id: admin._id.toString(),
                    email: admin.email,
                    name: admin.name,
                };
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
                    authAt: Date.now(),
                };
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.email = token.email as string;
                session.user.name = token.name as string;
                session.user.authAt = typeof token.authAt === 'number' ? token.authAt : 0;
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
    // Secure (__Secure-) cookies whenever the site is served over https, which production always is.
    useSecureCookies: process.env.NODE_ENV === 'production' && (process.env.NEXTAUTH_URL || 'https://').startsWith('https://'),
}; 