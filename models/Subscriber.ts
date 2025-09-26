import mongoose from 'mongoose'

export interface ISubscriber extends mongoose.Document {
  email: string
  language?: 'en' | 'es'
  unsubscribed: boolean
  token: string
  createdAt: Date
  updatedAt: Date
}

const SubscriberSchema = new mongoose.Schema<ISubscriber>({
  email: { type: String, required: true, unique: true, index: true },
  language: { type: String, enum: ['en', 'es'], default: undefined },
  unsubscribed: { type: Boolean, default: false },
  token: { type: String, required: true, index: true },
}, { timestamps: true })

export default (mongoose.models.Subscriber as mongoose.Model<ISubscriber>) || mongoose.model<ISubscriber>('Subscriber', SubscriberSchema)

