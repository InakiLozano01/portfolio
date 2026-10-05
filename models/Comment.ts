import { postgresModel } from '../lib/postgres-model'
import mongoose from 'mongoose'
import type { ModerationResult } from '../lib/comment-moderation'
import './Blog'

export interface IComment extends mongoose.Document {
  blog: mongoose.Types.ObjectId
  alias: string
  content: string
  ip: string
  status: 'approved' | 'rejected' | 'pending'
  isOfficial: boolean
  moderation?: ModerationResult
  overrides?: { status: string; actor: string; at: Date }[]
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
  status: { type: String, enum: ['approved', 'rejected', 'pending'], default: 'pending' },
  moderation: { type: mongoose.Schema.Types.Mixed },
  // Audit entries are built by the authenticated handler; keep them plain BSON
  // values rather than Mongoose subdocuments with private array modifiers.
  overrides: { type: [mongoose.Schema.Types.Mixed], default: [] },
  isOfficial: { type: Boolean, default: false },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  votes: { type: [{ ip: { type: String, required: true }, value: { type: Number, enum: [-1, 1], required: true } }], default: [] },
}, { timestamps: true })

export default postgresModel((mongoose.models.Comment as mongoose.Model<IComment>) || mongoose.model<IComment>('Comment', CommentSchema))
