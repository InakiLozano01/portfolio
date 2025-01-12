import mongoose from 'mongoose';

const SkillSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    auto: true
  },
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

// Export as 'Skill' model if it doesn't exist, otherwise use existing model
const Skill = mongoose.models.Skill || mongoose.model('Skill', SkillSchema);
export default Skill; 