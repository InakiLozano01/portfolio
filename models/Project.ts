import mongoose, { Types } from 'mongoose';
import slugify from 'slugify';
import './Skill';  // Import Skill model to ensure it's registered

export interface IProject extends mongoose.Document {
  title: string;
  subtitle: string;
  slug: string;
  description: string;
  technologies: Types.ObjectId[] | Array<{ _id: Types.ObjectId; name: string }>;
  thumbnail?: string;
  thumbnailAlt?: string;
  imageHeight?: number;
  imageWidth?: number;
  githubUrl?: string;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
    default: '/images/projects/default-project.jpg',
  },
  thumbnailAlt: {
    type: String,
    default: 'Project thumbnail',
  },
  imageHeight: {
    type: Number,
    default: 200,
  },
  imageWidth: {
    type: Number,
    default: 400,
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

// Delete the model if it exists (this helps with hot reloading)
delete mongoose.models.Project;

// Export the model
export default mongoose.model<IProject>('Project', ProjectSchema); 