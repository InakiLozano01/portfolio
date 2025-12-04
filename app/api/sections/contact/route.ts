import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SectionModel } from '@/models/Section';
import { getCachedSections } from '@/lib/cache';

export async function GET() {
    // During build time, return empty object
    if (process.env.SKIP_DB_DURING_BUILD === 'true') {
        console.log('[MongoDB] Skipping connection during build');
        return NextResponse.json({});
    }

    try {
        // Try to get from cache first
        const sections = await getCachedSections();

        // Find contact section from cache
        if (sections && sections.length > 0) {
            const contactSection = sections.find((s: any) =>
                s.title?.toLowerCase() === 'contact' ||
                s.title?.toLowerCase() === 'contacto'
            );

            if (contactSection) {
                return NextResponse.json(contactSection);
            }
        }

        // If not in cache, get from database
        await connectToDatabase();
        const contactSection = await SectionModel.findOne({
            $or: [
                { title: { $regex: /^contact$/i } },
                { title: { $regex: /^contacto$/i } }
            ],
            visible: true
        });

        if (!contactSection) {
            // Return a fallback response instead of 404
            return NextResponse.json({
                title: 'Contact',
                content: {
                    email: 'inakilozano01@gmail.com',
                    city: 'San Miguel de Tucumán, Argentina',
                    city_en: 'San Miguel de Tucumán, Argentina',
                    city_es: 'San Miguel de Tucumán, Argentina',
                    social: {
                        github: 'https://github.com/InakiLozano01',
                        linkedin: 'https://www.linkedin.com/in/inaki-lozano'
                    }
                }
            });
        }

        return NextResponse.json(contactSection);
    } catch (error) {
        console.error('Failed to fetch contact section:', error);
        // Return fallback data instead of error
        return NextResponse.json({
            title: 'Contact',
            content: {
                email: 'inakilozano01@gmail.com',
                city: 'San Miguel de Tucumán, Argentina',
                city_en: 'San Miguel de Tucumán, Argentina',
                city_es: 'San Miguel de Tucumán, Argentina',
                social: {
                    github: 'https://github.com/InakiLozano01',
                    linkedin: 'https://www.linkedin.com/in/inaki-lozano'
                }
            }
        });
    }
}
