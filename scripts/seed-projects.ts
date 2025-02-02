/// <reference types="node" />
// @ts-ignore: Declare module slugify as any
declare module 'slugify';

import mongoose from 'mongoose';
import Project from '../models/Project';
import Skill from '../models/Skill';
import { connectToDatabase } from '../lib/mongodb';

async function seedProjects() {
    try {
        await connectToDatabase();
        console.log('Connected to MongoDB');

        // Get some skills to use as technologies
        const skills = await Skill.find({}).limit(5);
        if (!skills.length) {
            console.log('No skills found. Please run seed-skills.ts first.');
            process.exit(1);
        }

        // Clear existing projects
        await Project.deleteMany({});
        console.log('Cleared existing projects');

        // Create projects one by one to trigger the pre-save hook
        const projectData = [
            {
                title: 'Developer Portfolio',
                subtitle: 'Personal portfolio website built with Next.js',
                description: `
                    <h2>About this Project</h2>
                    <p>A modern, responsive portfolio website built to showcase my work and skills. Features include:</p>
                    <ul>
                        <li>Server-side rendering with Next.js</li>
                        <li>MongoDB database integration</li>
                        <li>Custom CMS for content management</li>
                        <li>Blog system with rich text editing</li>
                        <li>Projects showcase</li>
                        <li>Skills and experience section</li>
                    </ul>
                `,
                technologies: [skills[0]._id, skills[1]._id],
                thumbnail: '/images/portfolio.png',
                githubUrl: 'https://github.com/yourusername/developer-portfolio',
                featured: true,
            },
            {
                title: 'Backend API Service',
                subtitle: 'RESTful API built with Node.js and Express',
                description: `
                    <h2>Project Overview</h2>
                    <p>A scalable backend service providing RESTful APIs for various client applications.</p>
                    <h3>Key Features</h3>
                    <ul>
                        <li>Authentication and authorization</li>
                        <li>Rate limiting and caching</li>
                        <li>Swagger documentation</li>
                        <li>Automated testing</li>
                    </ul>
                `,
                technologies: [skills[2]._id, skills[3]._id],
                githubUrl: 'https://github.com/yourusername/backend-api',
                featured: false,
            },
        ];

        for (const data of projectData) {
            const project = new Project(data);
            await project.save();
        }

        console.log('Seeded projects successfully');

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding projects:', error);
        process.exit(1);
    }
}

seedProjects(); 