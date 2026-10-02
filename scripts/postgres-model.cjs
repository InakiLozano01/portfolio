const mongoose = require('mongoose')
const { collection, pool } = require('../lib/postgres-store')
mongoose.set('autoCreate', false)
mongoose.set('autoIndex', false)
function rawModel(name, collectionName) {
  const model = mongoose.models[name] || mongoose.model(name, new mongoose.Schema({}, { strict: false, collection: collectionName, optimisticConcurrency: true }))
  Object.assign(model.collection, collection(collectionName))
  return model
}
module.exports = { rawModel, pool }
