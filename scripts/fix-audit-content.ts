import { connectToDatabase } from '../lib/mongodb'
import { clearSectionsCache, invalidateCache } from '../lib/cache'
import Project from '../models/Project'
import { SectionModel } from '../models/Section'
import Skill from '../models/Skill'

const emoji = /[\p{Extended_Pictographic}\uFE0F]/gu

function cleanContent(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(emoji, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/ *\n */g, '\n')
      .trim()
  }
  if (Array.isArray(value)) return value.map(cleanContent)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanContent(item)]))
  }
  return value
}

async function main() {
  await connectToDatabase()

  const sections = await SectionModel.find({}).lean()
  for (const section of sections) {
    const content = cleanContent(section.content) as Record<string, unknown>
    if (section.title === 'Home') {
      content.headline = 'Software Engineer SSr · Computer Engineering, UNT'
      content.headline_es = 'Ingeniero de Software SSr · Ingeniería en Computación, UNT'
      content.description = 'I am Iñaki Lozano, a Software Engineer SSr at the Court of Accounts of Tucumán. I am completing Computer Engineering at the National University of Tucumán, with three final exams remaining. I build secure document workflows, scalable backends, and practical systems.'
      content.description_es = 'Soy Iñaki Lozano, Ingeniero de Software SSr en el Tribunal de Cuentas de Tucumán. Estoy finalizando Ingeniería en Computación en la Universidad Nacional de Tucumán, con tres exámenes finales pendientes. Construyo flujos seguros de documentos, backends escalables y sistemas prácticos.'
    }
    await SectionModel.updateOne({ _id: section._id }, { $set: { content } })
  }

  const chatGpt = await Skill.findOne({ name: /^ChatGPT$/i }).lean()
  if (chatGpt) {
    await Project.updateMany({ technologies: chatGpt._id }, { $pull: { technologies: chatGpt._id } })
    await Skill.deleteOne({ _id: chatGpt._id })
  }

  await Promise.all([
    clearSectionsCache().catch((error) => console.error('Could not clear section cache:', error)),
    invalidateCache('projects'),
    invalidateCache('skills'),
    invalidateCache('blogs'),
  ])
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Audit content migration failed:', error)
    process.exit(1)
  })
