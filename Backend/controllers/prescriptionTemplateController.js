const PrescriptionTemplate = require('../models/PrescriptionTemplate');
const { validationResult } = require('express-validator');

// Create a new prescription template
const createTemplate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, description, prescription } = req.body;
    const created_by = req.user.id;

    // Validate prescription array
    if (!Array.isArray(prescription) || prescription.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Prescription must be a non-empty array'
      });
    }

    // Validate each prescription item has at least a medicine name
    const validPrescriptions = prescription.filter(p => p.medicine && p.medicine.trim());
    if (validPrescriptions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one prescription item with a medicine name is required'
      });
    }

    const template = await PrescriptionTemplate.create({
      name,
      description: description || null,
      created_by,
      prescription: validPrescriptions,
      is_active: true
    });

    // Parse prescription JSON for response
    const templateResponse = {
      ...template,
      prescription: typeof template.prescription === 'string' 
        ? JSON.parse(template.prescription) 
        : template.prescription
    };

    res.status(201).json({
      success: true,
      message: 'Prescription template created successfully',
      data: { template: templateResponse }
    });
  } catch (error) {
    console.error('Error creating prescription template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create prescription template',
      message: error.message
    });
  }
};

// Get all templates (optionally filtered by user)
const getAllTemplates = async (req, res) => {
  try {
    const filters = {};
    
    // If user is not admin, only show their own templates
    if (req.user.role !== 'admin') {
      filters.created_by = req.user.id;
    }
    
    // Filter by active status if provided
    if (req.query.is_active !== undefined) {
      filters.is_active = req.query.is_active === 'true';
    }

    const templates = await PrescriptionTemplate.findAll(filters);

    // Parse prescription JSON for each template
    const templatesResponse = templates.map(template => ({
      ...template,
      prescription: typeof template.prescription === 'string' 
        ? JSON.parse(template.prescription) 
        : template.prescription
    }));

    res.json({
      success: true,
      data: { templates: templatesResponse }
    });
  } catch (error) {
    console.error('Error fetching prescription templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prescription templates',
      message: error.message
    });
  }
};

// Get a specific template by ID
const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await PrescriptionTemplate.findById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Prescription template not found'
      });
    }

    // Check if user has access (own template or admin)
    if (template.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own templates.'
      });
    }

    // Parse prescription JSON
    const templateResponse = {
      ...template,
      prescription: typeof template.prescription === 'string' 
        ? JSON.parse(template.prescription) 
        : template.prescription
    };

    res.json({
      success: true,
      data: { template: templateResponse }
    });
  } catch (error) {
    console.error('Error fetching prescription template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prescription template',
      message: error.message
    });
  }
};

// Update a template
const updateTemplate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const template = await PrescriptionTemplate.findById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Prescription template not found'
      });
    }

    // Check if user has permission (own template or admin)
    if (template.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only update your own templates.'
      });
    }

    const { name, description, prescription, is_active } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (prescription !== undefined) {
      if (!Array.isArray(prescription) || prescription.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Prescription must be a non-empty array'
        });
      }

      const validPrescriptions = prescription.filter(p => p.medicine && p.medicine.trim());
      if (validPrescriptions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one prescription item with a medicine name is required'
        });
      }

      updateData.prescription = validPrescriptions;
    }

    const updatedTemplate = await PrescriptionTemplate.update(id, updateData);

    // Parse prescription JSON for response
    const templateResponse = {
      ...updatedTemplate,
      prescription: typeof updatedTemplate.prescription === 'string' 
        ? JSON.parse(updatedTemplate.prescription) 
        : updatedTemplate.prescription
    };

    res.json({
      success: true,
      message: 'Prescription template updated successfully',
      data: { template: templateResponse }
    });
  } catch (error) {
    console.error('Error updating prescription template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prescription template',
      message: error.message
    });
  }
};

// Delete a template
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await PrescriptionTemplate.findById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Prescription template not found'
      });
    }

    // Check if user has permission (own template or admin)
    if (template.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only delete your own templates.'
      });
    }

    await PrescriptionTemplate.delete(id);

    res.json({
      success: true,
      message: 'Prescription template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting prescription template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete prescription template',
      message: error.message
    });
  }
};

module.exports = {
  createTemplate,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate
};

