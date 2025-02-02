import mongoose from 'mongoose';
import slugify from 'slugify';

const ProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  technologies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true,
  }],
  thumbnail: {
    type: String,
  },
  githubUrl: {
    type: String,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to generate slug from title
ProjectSchema.pre('validate', function (next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

export interface IProject extends mongoose.Document {
  title: string;
  subtitle: string;
  slug: string;
  description: string;
  technologies: mongoose.Types.ObjectId[];
  thumbnail?: string;
  githubUrl?: string;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema); 