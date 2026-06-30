import mongoose from 'mongoose'

export interface ISubscriber extends mongoose.Document {
  email: string
  language?: 'en' | 'es'
  unsubscribed: boolean
  token: string
  // Double opt-in: a subscriber only receives newsletters once confirmed.
  // `confirmToken` is a distinct credential from `token` (the unsubscribe key),
  // so a confirm link can never be used to unsubscribe and vice-versa.
  confirmed: boolean
  confirmedAt?: Date
  confirmToken?: string
  createdAt: Date
  updatedAt: Date
}

const SubscriberSchema = new mongoose.Schema<ISubscriber>({
  email: { type: String, required: true, unique: true, index: true },
  language: { type: String, enum: ['en', 'es'], default: undefined },
  unsubscribed: { type: Boolean, default: false },
  token: { type: String, required: true, index: true },
  confirmed: { type: Boolean, default: false },
  confirmedAt: { type: Date },
  confirmToken: { type: String, index: true },
}, { timestamps: true })

export default (mongoose.models.Subscriber as mongoose.Model<ISubscriber>) || mongoose.model<ISubscriber>('Subscriber', SubscriberSchema)

