const Medicine = require('../models/Medicine');
const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');

/**
 * Create a new medicine
 */
const createMedicine = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { name, category, is_active = true } = req.body;

    // Check if medicine already exists
    const existing = await Medicine.findByName(name);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Medicine with this name already exists'
      });
    }

    const medicine = await Medicine.create({ name, category, is_active });

    res.status(201).json({
      success: true,
      message: 'Medicine created successfully',
      data: {
        medicine: medicine.toJSON()
      }
    });
  } catch (error) {
    console.error('[createMedicine] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create medicine',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get all medicines with pagination and filters
 */
const getAllMedicines = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const { category, search, is_active } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (search) filters.search = search;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const result = await Medicine.findAll(page, limit, filters);

    res.status(200).json({
      success: true,
      message: 'Medicines retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('[getAllMedicines] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medicines',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get medicine by ID
 */
const getMedicineById = async (req, res) => {
  try {
    const { id } = req.params;
    const medicine = await Medicine.findById(id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Medicine retrieved successfully',
      data: {
        medicine: medicine.toJSON()
      }
    });
  } catch (error) {
    console.error('[getMedicineById] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medicine',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get medicines by category
 */
const getMedicinesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const medicines = await Medicine.findByCategory(category);

    res.status(200).json({
      success: true,
      message: 'Medicines retrieved successfully',
      data: {
        medicines: medicines.map(m => m.toJSON())
      }
    });
  } catch (error) {
    console.error('[getMedicinesByCategory] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medicines',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get all categories
 */
const getCategories = async (req, res) => {
  try {
    const categories = await Medicine.getCategories();

    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: {
        categories
      }
    });
  } catch (error) {
    console.error('[getCategories] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Update medicine
 */
const updateMedicine = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const medicine = await Medicine.findById(id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    // If name is being updated, check for duplicates
    if (req.body.name && req.body.name !== medicine.name) {
      const existing = await Medicine.findByName(req.body.name);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Medicine with this name already exists'
        });
      }
    }

    const updatedMedicine = await medicine.update(req.body);

    res.status(200).json({
      success: true,
      message: 'Medicine updated successfully',
      data: {
        medicine: updatedMedicine.toJSON()
      }
    });
  } catch (error) {
    console.error('[updateMedicine] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medicine',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Delete medicine (soft delete)
 */
const deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const medicine = await Medicine.findById(id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    await medicine.delete();

    res.status(200).json({
      success: true,
      message: 'Medicine deleted successfully'
    });
  } catch (error) {
    console.error('[deleteMedicine] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete medicine',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Bulk import medicines from JSON file
 */
const bulkImportMedicines = async (req, res) => {
  try {
    const medicinesFilePath = path.join(__dirname, '../data/medicines.json');
    
    if (!fs.existsSync(medicinesFilePath)) {
      return res.status(404).json({
        success: false,
        message: 'Medicines JSON file not found'
      });
    }

    const medicinesData = JSON.parse(fs.readFileSync(medicinesFilePath, 'utf8'));
    const result = await Medicine.bulkCreate(medicinesData);

    res.status(201).json({
      success: true,
      message: `Bulk import completed. ${result.medicines.length} medicines created, ${result.errors.length} errors`,
      data: {
        created: result.medicines.length,
        errors: result.errors.length,
        details: result.errors.length > 0 ? result.errors : undefined
      }
    });
  } catch (error) {
    console.error('[bulkImportMedicines] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import medicines',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  createMedicine,
  getAllMedicines,
  getMedicineById,
  getMedicinesByCategory,
  getCategories,
  updateMedicine,
  deleteMedicine,
  bulkImportMedicines
};

