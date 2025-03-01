import mongoose from 'mongoose';

export interface ISkill extends mongoose.Document {
  name: string;
  category: string;
  proficiency: number;
  yearsOfExperience: number;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}

const SkillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  proficiency: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  yearsOfExperience: {
    type: Number,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  // This ensures the model knows about the collection name
  collection: 'skills',
  // This ensures virtuals are included in lean() queries
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  // This ensures _id is not modified after creation
  strict: true
});

// Delete the model if it exists (this helps with hot reloading)
delete mongoose.models.Skill;

// Export the model
export default mongoose.model<ISkill>('Skill', SkillSchema); 