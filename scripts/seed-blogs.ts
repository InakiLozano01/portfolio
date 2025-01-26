import { config } from 'dotenv'
import { connectToDatabase } from '../lib/mongodb'
import BlogModel from '../models/Blog'
import { slugify } from '../lib/utils'

// Load environment variables
config()

// Set MongoDB URI for development if not set
if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/portfolio'
}

// Define the type for seed data
interface BlogSeed {
    title: string;
    subtitle: string;
    content: string;
    footer?: string;
    bibliography?: string;
    published: boolean;
    tags: string[];
}

const sampleBlogs: BlogSeed[] = [
    {
        title: "Building a Modern Portfolio with Next.js and MongoDB",
        subtitle: "A comprehensive guide to creating a dynamic portfolio website using Next.js 14, MongoDB, and TypeScript",
        content: `
            <h2>Introduction</h2>
            <p>In this guide, we'll walk through the process of building a modern portfolio website using Next.js 14, MongoDB, and TypeScript. We'll cover everything from setting up the project to deploying it to production.</p>

            <h2>Key Features</h2>
            <ul>
                <li>Server-side rendering with Next.js 14</li>
                <li>MongoDB database integration</li>
                <li>TypeScript for type safety</li>
                <li>Responsive design with Tailwind CSS</li>
                <li>Admin dashboard for content management</li>
            </ul>

            <h2>Getting Started</h2>
            <p>First, let's set up our development environment and create a new Next.js project:</p>

            <pre><code>npx create-next-app@latest portfolio --typescript --tailwind --app</code></pre>

            <p>This command creates a new Next.js project with TypeScript and Tailwind CSS configured.</p>
        `,
        footer: "If you found this guide helpful, consider sharing it with others!",
        bibliography: `
            - Next.js Documentation: https://nextjs.org/docs
            - MongoDB Documentation: https://docs.mongodb.com
            - TypeScript Handbook: https://www.typescriptlang.org/docs/handbook
        `,
        published: true,
        tags: ["Next.js", "MongoDB", "TypeScript", "Web Development", "Portfolio"]
    },
    {
        title: "Mastering TypeScript: Advanced Patterns and Best Practices",
        subtitle: "Learn advanced TypeScript concepts and patterns to write better, more maintainable code",
        content: `
            <h2>Introduction to Advanced TypeScript</h2>
            <p>TypeScript has become an essential tool in modern web development. In this article, we'll explore advanced patterns and best practices that will help you write more robust and maintainable code.</p>

            <h2>Topics Covered</h2>
            <ul>
                <li>Generics and Type Constraints</li>
                <li>Conditional Types</li>
                <li>Mapped Types</li>
                <li>Utility Types</li>
                <li>Type Guards and Type Assertions</li>
            </ul>

            <h2>Advanced Generic Patterns</h2>
            <pre><code>
            type Result<T, E = Error> = {
                success: true;
                data: T;
            } | {
                success: false;
                error: E;
            };
            </code></pre>
        `,
        published: true,
        tags: ["TypeScript", "Programming", "Web Development", "JavaScript"]
    },
    {
        title: "Implementing Authentication in Next.js",
        subtitle: "A step-by-step guide to adding secure authentication to your Next.js application",
        content: `
            <h2>Introduction</h2>
            <p>Authentication is a crucial aspect of many web applications. In this tutorial, we'll implement a secure authentication system in Next.js using JWT tokens and MongoDB.</p>

            <h2>Features</h2>
            <ul>
                <li>JWT-based authentication</li>
                <li>Secure password hashing</li>
                <li>Protected API routes</li>
                <li>Middleware for route protection</li>
                <li>Refresh token rotation</li>
            </ul>

            <h2>Implementation</h2>
            <p>Let's start by setting up our authentication middleware:</p>

            <pre><code>
            import { NextResponse } from 'next/server';
            import { verifyToken } from '@/lib/jwt';

            export async function middleware(request) {
                const token = request.cookies.get('token');
                
                if (!token) {
                    return NextResponse.redirect('/login');
                }

                try {
                    await verifyToken(token);
                    return NextResponse.next();
                } catch (error) {
                    return NextResponse.redirect('/login');
                }
            }
            </code></pre>
        `,
        published: true,
        tags: ["Next.js", "Authentication", "Security", "Web Development"]
    }
];

async function seedBlogs() {
    try {
        await connectToDatabase();

        // Delete existing blogs
        await BlogModel.deleteMany({});

        // Create new blogs with slugs
        const blogs = await Promise.all(
            sampleBlogs.map(async (blog) => {
                const slug = slugify(blog.title);
                return await BlogModel.create({
                    ...blog,
                    slug,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            })
        );

        console.log('Successfully seeded blogs data.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding blogs:', error);
        process.exit(1);
    }
}

seedBlogs(); 