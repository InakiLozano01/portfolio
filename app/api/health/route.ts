import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import redis from '@/lib/redis';

export async function GET() {
    try {
        // Check MongoDB connection
        await connectToDatabase();

        // Check Redis connection
        await redis.ping();

        return NextResponse.json({ status: 'healthy' }, { status: 200 });
    } catch (error) {
        console.error('Health check failed:', error);
        return NextResponse.json(
            { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 503 }
        );
    }
} 