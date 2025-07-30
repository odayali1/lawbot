const mongoose = require('mongoose');

const systemInstructionSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'Civil Law',
      'Criminal Law', 
      'Commercial Law',
      'Family Law',
      'Administrative Law',
      'Constitutional Law',
      'Labor Law',
      'Tax Law',
      'Real Estate Law',
      'Intellectual Property'
    ]
  },
  instruction: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
systemInstructionSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('SystemInstruction', systemInstructionSchema);