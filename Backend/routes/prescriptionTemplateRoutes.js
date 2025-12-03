const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  createTemplate,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate
} = require('../controllers/prescriptionTemplateController');

// Validation rules
const templateValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Template name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Template name must be between 1 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('prescription')
    .isArray({ min: 1 })
    .withMessage('Prescription must be a non-empty array'),
  body('prescription.*.medicine')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Medicine name must be less than 255 characters'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

// All routes require authentication
router.use(authenticateToken);

// Create a new template
router.post(
  '/',
  templateValidation,
  createTemplate
);

// Get all templates (filtered by user if not admin)
router.get(
  '/',
  getAllTemplates
);

// Get a specific template by ID
router.get(
  '/:id',
  getTemplateById
);

// Update a template
router.put(
  '/:id',
  templateValidation,
  updateTemplate
);

// Delete a template
router.delete(
  '/:id',
  deleteTemplate
);

module.exports = router;

