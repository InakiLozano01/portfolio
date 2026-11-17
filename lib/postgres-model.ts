import mongoose from 'mongoose'
import { collection } from './postgres-store'

// Mongoose supplies validation, middleware, casting and population only.
mongoose.set('autoCreate', false)
mongoose.set('autoIndex', false)

type PostgresModelDefinition = {
  collection: { name: string }
  schema: { set(option: 'optimisticConcurrency', enabled: boolean): unknown }
}

export function postgresModel<T extends PostgresModelDefinition>(model: T): T {
  Object.assign(model.collection, collection(model.collection.name))
  const unsupported = ['aggregate', 'bulkWrite', 'watch', 'distinct', 'replaceOne', 'findOneAndReplace', 'estimatedDocumentCount', 'createIndex', 'createIndexes', 'dropIndex', 'dropIndexes']
  Object.assign(model.collection, Object.fromEntries(unsupported.map(method => [method, () => { throw new Error(`Unsupported PostgreSQL collection operation: ${method}`) }])))
  model.schema.set('optimisticConcurrency', true)
  return model
}
