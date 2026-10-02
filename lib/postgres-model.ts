import mongoose from 'mongoose'
import { collection } from './postgres-store'

// Mongoose supplies validation, middleware, casting and population only.
mongoose.set('autoCreate', false)
mongoose.set('autoIndex', false)

export function postgresModel<T extends mongoose.Model<any>>(model: T): T {
  Object.assign(model.collection, collection(model.collection.name))
  for (const method of ['aggregate', 'bulkWrite', 'watch', 'distinct', 'replaceOne', 'findOneAndReplace', 'estimatedDocumentCount', 'createIndex', 'createIndexes', 'dropIndex', 'dropIndexes']) {
    ;(model.collection as any)[method] = () => { throw new Error(`Unsupported PostgreSQL collection operation: ${method}`) }
  }
  model.schema.set('optimisticConcurrency', true)
  return model
}
