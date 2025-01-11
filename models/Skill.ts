import mongoose from 'mongoose';

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

export default mongoose.models.Skill || mongoose.model('Skill', SkillSchema); 