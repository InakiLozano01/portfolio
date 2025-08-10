import { NextResponse } from 'next/server';
import { emailService } from '@/lib/email';

// This endpoint is for testing email configuration
// Remove or secure this in production
export async function GET() {
    try {
        // Test the email connection
        const isConnected = await emailService.testConnection();

        return NextResponse.json({
            success: true,
            emailConfigured: isConnected,
            message: isConnected
                ? 'Email service is properly configured'
                : 'Email service configuration issue detected'
        });
    } catch (error) {
        console.error('Email test error:', error);
        return NextResponse.json({
            success: false,
            emailConfigured: false,
            message: 'Email test failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// Test endpoint to send a test email
export async function POST() {
    try {
        const testEmailData = {
            name: 'Test User',
            email: 'test@example.com',
            message: 'This is a test email from the contact form system.',
            ipAddress: '127.0.0.1'
        };

        const result = await emailService.sendContactEmail(testEmailData);

        return NextResponse.json({
            success: result.success,
            message: result.message
        });
    } catch (error) {
        console.error('Test email error:', error);
        return NextResponse.json({
            success: false,
            message: 'Test email failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}