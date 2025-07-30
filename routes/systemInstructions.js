const express = require('express');
const SystemInstruction = require('../models/SystemInstruction');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware
const validateSystemInstruction = [
  body('category')
    .isIn([
      'Civil Law', 'Criminal Law', 'Commercial Law', 'Family Law',
      'Administrative Law', 'Constitutional Law', 'Labor Law', 'Tax Law',
      'Real Estate Law', 'Intellectual Property'
    ])
    .withMessage('Invalid category'),
  body('instruction')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Instruction must be between 10 and 2000 characters')
];

// @route   GET /api/system-instructions
// @desc    Get all system instructions
// @access  Private (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const instructions = await SystemInstruction.find()
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ category: 1 });

    res.json({
      success: true,
      data: instructions
    });
  } catch (error) {
    console.error('Get system instructions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system instructions'
    });
  }
});

// @route   GET /api/system-instructions/active
// @desc    Get active system instructions for chat
// @access  Private
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const instructions = await SystemInstruction.find({ isActive: true })
      .select('category instruction')
      .sort({ category: 1 });

    const instructionsMap = {};
    instructions.forEach(inst => {
      instructionsMap[inst.category] = inst.instruction;
    });

    res.json({
      success: true,
      data: instructionsMap
    });
  } catch (error) {
    console.error('Get active system instructions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active system instructions'
    });
  }
});

// @route   POST /api/system-instructions
// @desc    Create or update system instruction
// @access  Private (Admin only)
router.post('/', authenticateToken, requireAdmin, validateSystemInstruction, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { category, instruction } = req.body;

    // Check if instruction already exists for this category
    let systemInstruction = await SystemInstruction.findOne({ category });

    if (systemInstruction) {
      // Update existing instruction
      systemInstruction.instruction = instruction;
      systemInstruction.updatedBy = req.user.id;
      await systemInstruction.save();
    } else {
      // Create new instruction
      systemInstruction = new SystemInstruction({
        category,
        instruction,
        createdBy: req.user.id
      });
      await systemInstruction.save();
    }

    await systemInstruction.populate('createdBy', 'name email');
    await systemInstruction.populate('updatedBy', 'name email');

    res.json({
      success: true,
      message: systemInstruction.isNew ? 'System instruction created successfully' : 'System instruction updated successfully',
      data: systemInstruction
    });
  } catch (error) {
    console.error('Create/update system instruction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving system instruction'
    });
  }
});

// @route   PUT /api/system-instructions/:id/toggle
// @desc    Toggle system instruction active status
// @access  Private (Admin only)
router.put('/:id/toggle', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const instruction = await SystemInstruction.findById(req.params.id);
    
    if (!instruction) {
      return res.status(404).json({
        success: false,
        message: 'System instruction not found'
      });
    }

    instruction.isActive = !instruction.isActive;
    instruction.updatedBy = req.user.id;
    await instruction.save();

    await instruction.populate('createdBy', 'name email');
    await instruction.populate('updatedBy', 'name email');

    res.json({
      success: true,
      message: `System instruction ${instruction.isActive ? 'activated' : 'deactivated'} successfully`,
      data: instruction
    });
  } catch (error) {
    console.error('Toggle system instruction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling system instruction status'
    });
  }
});

// @route   DELETE /api/system-instructions/:id
// @desc    Delete system instruction
// @access  Private (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const instruction = await SystemInstruction.findById(req.params.id);
    
    if (!instruction) {
      return res.status(404).json({
        success: false,
        message: 'System instruction not found'
      });
    }

    await SystemInstruction.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'System instruction deleted successfully'
    });
  } catch (error) {
    console.error('Delete system instruction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting system instruction'
    });
  }
});

module.exports = router;