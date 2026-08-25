import { connectToDatabase } from '../lib/mongodb'
import { SectionModel } from '../models/Section'
import { config } from 'dotenv'

// Load environment variables
config()

// Set MongoDB URI for Docker environment if not set
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://mongodb:27017/portfolio'
}

const sections = [
  {
    title: "Home",
    order: 0,
    visible: true,
    content: {
      headline: "Software Engineer SSr · Computer Engineering, UNT",
      headline_es: "Ingeniero de Software SSr · Ingeniería en Computación, UNT",
      description: "I am Iñaki Lozano, a Software Engineer SSr at the Court of Accounts of Tucumán. I am completing Computer Engineering at the National University of Tucumán, with three final exams remaining. I build secure document workflows, scalable backends, and practical systems.",
      description_es: "Soy Iñaki Lozano, Ingeniero de Software SSr en el Tribunal de Cuentas de Tucumán. Estoy finalizando Ingeniería en Computación en la Universidad Nacional de Tucumán, con tres exámenes finales pendientes. Construyo flujos seguros de documentos, backends escalables y sistemas prácticos."
    }
  },
  {
    title: "About",
    order: 1,
    visible: true,
    content: {
      description: "I am a software developer focused on clean architecture, scalability, and practical systems. I have worked on web applications, APIs, backend systems, and automation pipelines.\n\nI began developing software in my second year of Computer Engineering at the National University of Tucumán. I continue to develop new technical skills through real projects.",
      highlights: [
        "Open-source projects",
        "Podcasts",
        "Watching sports",
        "Professional development"
      ]
    }
  },
  {
    title: "Education",
    order: 2,
    visible: true,
    content: {
      education: [
        {
          institution: "National University of Tucumán",
          degree: "Computer Engineering",
          period: "2019 - Present",
          description: "Three final exams remain."
        },
        {
          institution: "Instituto Integral Argentino Hebreo Independencia",
          degree: "Bachelor in Theory and Management of Organization",
          period: "2013 - 2018",
          description: "Best student in the first year. Standard bearer in the final year."
        }
      ]
    }
  },
  {
    title: "Experience",
    order: 3,
    visible: true,
    content: {
      experiences: [
        {
          company: "Court of Accounts of Tucumán",
          period: "Nov 2023 - Present",
          responsibilities: [
            "Digital signatures, integrity middleware, and APIs",
            "Full-stack development of the Documents and Records System",
            "Database design and development"
          ],
          title: "Software Engineer SSr"
        },
        {
          title: "Trainee Backend Developer",
          company: "Third Party Startup Project",
          period: "Jan 2024 - Oct 2024",
          description: "",
          responsibilities: [
            "Designed complete database business logic for a REST API",
            "Developed the backend API for the web application"
          ]
        }
      ]
    }
  },
  {
    title: "Skills",
    order: 4,
    visible: true,
    content: {
      description: "A comprehensive set of technical skills across various domains"
    }
  },
  {
    title: "Projects",
    order: 5,
    visible: true,
    content: {
      description: "Showcasing my latest work and contributions",
      featured: true
    }
  },
  {
    title: "Blog",
    order: 6,
    visible: true,
    content: {
      description: "Sharing insights and experiences in software development",
      featured: true
    }
  },
  {
    title: "Contact",
    order: 7,
    visible: true,
    content: {
      email: "kakitolozano@gmail.com",
      social: {
        github: "https://github.com/InakiLozano01",
        linkedin: "https://linkedin.com/in/inaki-fernando-lozano-b783021b0"
      },
      city: "Tucumán, Argentina"
    }
  }
]

async function seedSections() {
  try {
    await connectToDatabase()

    // Clear existing sections
    await SectionModel.deleteMany({})

    // Insert new sections
    await SectionModel.insertMany(sections)

    console.log('Successfully seeded sections data')
    process.exit(0)
  } catch (error) {
    console.error('Error seeding sections:', error)
    process.exit(1)
  }
}

seedSections()
