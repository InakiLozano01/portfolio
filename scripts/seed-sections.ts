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
      headline: "🚀 Technology Accelerationist and Innovation Pursuer 💡",
      description: "Hi, I'm Iñaki Lozano, a 🌍 Computer Engineering student at the National University of Tucumán. I'm passionate about building 🔧 innovative and creative solutions with 💻 code."
    }
  },
  {
    title: "About",
    order: 1,
    visible: true,
    content: {
      description: "I'm a 🖥️ software developer with a passion for creating 🌟 innovative solutions. With 1.5 years of experience in the industry, I've worked on a wide range of projects, from 🌐 web applications to 🔄 APIs and everything in between.\n\nMy journey in software development began in 2nd year of university. Since then, I've been constantly 📚 learning and 🌟 adapting to new technologies to stay at the forefront of the industry.",
      highlights: [
        "🔓 Open-source projects",
        "🎙️ Podcasts",
        "⚽ Watching Sports",
        "🌱 Self development"
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
          institution: "🏛️ National University of Tucuman",
          degree: "🎓 Computer Engineering",
          period: "2019 - Present",
          description: "📄 Currently with 3 remaining tests to graduate."
        },
        {
          institution: "🏫 Instituto Integral Argentino Hebreo Independencia",
          degree: "🎓 Bachelor in Theory and Management of Organization",
          period: "2013 - 2018",
          description: "🏆 Best student 1st year. Standard bearer at last year."
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
          company: "⚖️ Tribunal de Cuentas de la Provincia de Tucuman",
          period: "Nov 2023 - Present",
          responsibilities: [
            "🖊️ Digital signatures, integrity middleware and API",
            "🧑‍💻 Full stack development of Documents and Records System",
            "🗄️ Database design and development"
          ],
          title: "👨‍💻 Jr Software Engineer"
        },
        {
          title: "👨‍💻 Trainee Backend Developer",
          company: "Third Party Startup Project",
          period: "Jan 2024 - Oct 2024",
          description: "",
          responsibilities: [
            "🗄️ Designed complete database business logic for a REST API",
            "🧑‍💻 Developed entire backend API for the web application"
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