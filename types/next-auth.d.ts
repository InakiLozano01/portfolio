import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      /** When this session signed in (ms); sessions older than the last password change are refused. */
      authAt?: number;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
  }
} 