import mongoose from 'mongoose'

export interface IComment extends mongoose.Document {
  blog: mongoose.Types.ObjectId
  alias: string
  content: string
  ip: string
  status: 'approved' | 'rejected' | 'pending'
  parent?: mongoose.Types.ObjectId | null
  votes: { ip: string; value: number }[]
  createdAt: Date
  updatedAt: Date
}

const CommentSchema = new mongoose.Schema<IComment>({
  blog: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true },
  alias: { type: String, required: true },
  content: { type: String, required: true },
  ip: { type: String, required: true },
  status: { type: String, enum: ['approved', 'rejected', 'pending'], default: 'approved' },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  votes: { type: [{ ip: { type: String, required: true }, value: { type: Number, enum: [-1, 1], required: true } }], default: [] },
}, { timestamps: true })

export default (mongoose.models.Comment as mongoose.Model<IComment>) || mongoose.model<IComment>('Comment', CommentSchema)
