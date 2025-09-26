import nodemailer, { Transporter } from 'nodemailer';

// Conditional Redis imports and initialization
let redis: any = null;
let ipRateLimit: any = null;
let emailRateLimit: any = null;
let globalRateLimit: any = null;
let ipDailyLimit: any = null;
let emailDailyLimit: any = null;

// Only initialize Redis if not building and Redis is not skipped
const shouldUseRedis = !process.env.SKIP_REDIS_DURING_BUILD && process.env.REDIS_URL;

if (shouldUseRedis) {
    // Use ioredis for local Redis instance
    const Redis = require('ioredis');
    const { Ratelimit } = require('@upstash/ratelimit');

    redis = new Redis(process.env.REDIS_URL);

    // Rate limiters for different scenarios
    ipRateLimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1h'), // 3 emails per hour per IP
        analytics: true,
    });

    emailRateLimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(2, '1h'), // 2 emails per hour per email address
        analytics: true,
    });

    globalRateLimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1h'), // 10 total emails per hour globally
        analytics: true,
    });

    // Daily rate limits for additional protection
    ipDailyLimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '24h'), // 5 emails per day per IP
        analytics: true,
    });

    emailDailyLimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '24h'), // 3 emails per day per email address
        analytics: true,
    });
}

interface EmailData {
    name: string;
    email: string;
    message: string;
    ipAddress: string;
}

interface RateLimitResult {
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
}

class EmailService {
    private transporter: Transporter | null = null;

    constructor() {
        this.initializeTransporter();
    }

    private initializeTransporter() {
        try {
            const port = parseInt(process.env.SMTP_PORT || '465')
            const isSsl = (process.env.SMTP_ENCRYPT || '').toUpperCase() === 'SSL' || port === 465

            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_SERVER,
                port,
                secure: isSsl,
                requireTLS: !isSsl, // for 587/TLS
                pool: true,
                auth: {
                    user: process.env.SMTP_USERNAME || process.env.CONTACT_MAIL_FROM,
                    pass: process.env.SMTP_PASSWORD,
                },
                tls: {
                    // allow self-signed when debugging; for production you can set to true
                    rejectUnauthorized: false,
                },
            })
        } catch (error) {
            console.error('Failed to initialize email transporter:', error);
        }
    }

    // Comprehensive rate limiting check
    async checkRateLimit(ipAddress: string, email: string): Promise<RateLimitResult> {
        // If Redis is not available (during build or disabled), skip rate limiting
        if (!shouldUseRedis || !ipRateLimit) {
            console.log('[Redis] Rate limiting skipped - Redis not available');
            return { allowed: true };
        }

        try {
            // Check IP-based hourly limit
            const ipHourly = await ipRateLimit.limit(`ip:${ipAddress}`);
            if (!ipHourly.success) {
                return {
                    allowed: false,
                    reason: 'Too many emails from this IP address. Please try again later.',
                    retryAfter: ipHourly.reset
                };
            }

            // Check IP-based daily limit
            const ipDaily = await ipDailyLimit.limit(`ip-daily:${ipAddress}`);
            if (!ipDaily.success) {
                return {
                    allowed: false,
                    reason: 'Daily limit exceeded for this IP address. Please try again tomorrow.',
                    retryAfter: ipDaily.reset
                };
            }

            // Check email-based hourly limit
            const emailHourly = await emailRateLimit.limit(`email:${email.toLowerCase()}`);
            if (!emailHourly.success) {
                return {
                    allowed: false,
                    reason: 'Too many emails from this email address. Please try again later.',
                    retryAfter: emailHourly.reset
                };
            }

            // Check email-based daily limit
            const emailDaily = await emailDailyLimit.limit(`email-daily:${email.toLowerCase()}`);
            if (!emailDaily.success) {
                return {
                    allowed: false,
                    reason: 'Daily limit exceeded for this email address. Please try again tomorrow.',
                    retryAfter: emailDaily.reset
                };
            }

            // Check global rate limit
            const global = await globalRateLimit.limit('global');
            if (!global.success) {
                return {
                    allowed: false,
                    reason: 'System is currently busy. Please try again later.',
                    retryAfter: global.reset
                };
            }

            return { allowed: true };
        } catch (error) {
            console.error('Rate limit check failed:', error);
            // In case of rate limit service failure, allow but log the error
            return { allowed: true };
        }
    }

    // Validate and sanitize email data
    validateEmailData(data: EmailData): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Name validation
        if (!data.name || data.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        if (data.name.length > 100) {
            errors.push('Name must be less than 100 characters');
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!data.email || !emailRegex.test(data.email)) {
            errors.push('Please provide a valid email address');
        }
        if (data.email.length > 255) {
            errors.push('Email address is too long');
        }

        // Message validation
        if (!data.message || data.message.trim().length < 10) {
            errors.push('Message must be at least 10 characters long');
        }
        if (data.message.length > 5000) {
            errors.push('Message must be less than 5000 characters');
        }

        // Check for suspicious content
        const suspiciousPatterns = [
            /viagra|cialis|pharmacy/i,
            /\$\d+|\d+\$/,
            /https?:\/\/[^\s]+/g, // Multiple URLs
            /(.)\1{10,}/, // Repeated characters
            /[A-Z]{20,}/, // Too many uppercase letters
        ];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(data.message)) {
                errors.push('Message contains suspicious content');
                break;
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Sanitize input data
    sanitizeData(data: EmailData): EmailData {
        return {
            name: data.name.trim().replace(/[<>]/g, ''),
            email: data.email.trim().toLowerCase(),
            message: data.message.trim().replace(/[<>]/g, ''),
            ipAddress: data.ipAddress
        };
    }

    // Send email
    async sendContactEmail(data: EmailData): Promise<{ success: boolean; message: string }> {
        try {
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }

            // Validate data
            const validation = this.validateEmailData(data);
            if (!validation.valid) {
                return {
                    success: false,
                    message: validation.errors.join(', ')
                };
            }

            // Check rate limits
            const rateCheck = await this.checkRateLimit(data.ipAddress, data.email);
            if (!rateCheck.allowed) {
                return {
                    success: false,
                    message: rateCheck.reason || 'Rate limit exceeded'
                };
            }

            // Sanitize data
            const sanitizedData = this.sanitizeData(data);

            // Prepare email content
            const fromAddress = process.env.CONTACT_MAIL_FROM || process.env.SMTP_USERNAME || 'no-reply@example.com'
            const toAddress = process.env.CONTACT_MAIL_TO || fromAddress
            const subject = process.env.CONTACT_MAIL_SUBJECT || 'Contact Message received'

            const mailOptions = {
                from: fromAddress,
                sender: process.env.SMTP_USERNAME || fromAddress,
                replyTo: sanitizedData.email,
                to: toAddress,
                subject,
                html: `
          <h2>New Contact Message</h2>
          <p><strong>Name:</strong> ${sanitizedData.name}</p>
          <p><strong>Email:</strong> ${sanitizedData.email}</p>
          <p><strong>IP Address:</strong> ${sanitizedData.ipAddress}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <h3>Message:</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${sanitizedData.message}</div>
        `,
                text: `
New Contact Message

Name: ${sanitizedData.name}
Email: ${sanitizedData.email}
IP Address: ${sanitizedData.ipAddress}
Timestamp: ${new Date().toISOString()}

Message:
${sanitizedData.message}
        `
            };

            // Send email
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', info.messageId);

            return {
                success: true,
                message: 'Email sent successfully'
            };

        } catch (error) {
            console.error('Failed to send email:', error);
            return {
                success: false,
                message: 'Failed to send email. Please try again later.'
            };
        }
    }

    // Test email configuration
    async testConnection(): Promise<boolean> {
        try {
            if (!this.transporter) {
                return false;
            }

            const verified = await this.transporter.verify();
            return verified;
        } catch (error) {
            console.error('Email connection test failed:', error);
            return false;
        }
    }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;

// Newsletter helpers
export async function sendNewsletterEmail({ to, subject, html, text }:
  { to: string; subject: string; html: string; text?: string }) {
  try {
    const svc = emailService as any
    const transporter: Transporter | null = (svc as any).transporter || null
    if (!transporter) throw new Error('Email transporter not initialized')
    const fromAddress = process.env.CONTACT_MAIL_FROM || process.env.SMTP_USERNAME || 'no-reply@example.com'
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, '')
    })
    console.log('Newsletter email sent:', info.messageId)
    return true
  } catch (e) {
    console.error('Newsletter email failed', e)
    return false
  }
}
