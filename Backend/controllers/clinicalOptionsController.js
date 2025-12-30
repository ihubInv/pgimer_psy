const ClinicalOption = require('../models/ClinicalOption');

class ClinicalOptionsController {
  // Get all options for a specific group
  static async getGroup(req, res) {
    try {
      const group = req.params.group;
      const options = await ClinicalOption.findByGroup(group, true);
      const optionLabels = options.map(opt => opt.option_label);
      const optionData = options.map(opt => ({
        label: opt.option_label,
        is_system: opt.is_system
      }));
      
      return res.json({ 
        success: true, 
        data: { 
          group, 
          options: optionLabels,
          optionsWithMeta: optionData // Include metadata for frontend to know which are system
        } 
      });
    } catch (error) {
      console.error('Get options error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get options',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all groups with their options
  static async getAllGroups(req, res) {
    try {
      const groupedOptions = await ClinicalOption.findAllGroups(true);
      
      // Convert to format expected by frontend (array of labels, but preserve is_system info)
      const formattedOptions = {};
      for (const [group, options] of Object.entries(groupedOptions)) {
        // If options are objects with label and is_system, extract labels
        if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'object' && options[0].label) {
          formattedOptions[group] = options.map(opt => opt.label);
        } else {
          formattedOptions[group] = options;
        }
      }
      
      return res.json({ 
        success: true, 
        data: formattedOptions 
      });
    } catch (error) {
      console.error('Get all groups error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get all groups',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Add a new option to a group
  static async addOption(req, res) {
    try {
      const group = req.params.group;
      const { label, display_order } = req.body;
      
      if (!label || !label.trim()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Label is required' 
        });
      }

      const option = await ClinicalOption.create({
        option_group: group,
        option_label: label.trim(),
        display_order: display_order,
        is_system: false // Explicitly set to false for user-created options
      });

      // Get updated list of options for this group with metadata
      const allOptions = await ClinicalOption.findByGroup(group, true);
      const optionLabels = allOptions.map(opt => opt.option_label);
      const optionData = allOptions.map(opt => ({
        label: opt.option_label,
        is_system: opt.is_system
      }));

      res.status(201).json({ 
        success: true, 
        message: 'Option added successfully',
        data: { 
          group, 
          option: option.toJSON(),
          options: optionLabels,
          optionsWithMeta: optionData // Include metadata so frontend knows which are system
        } 
      });
    } catch (error) {
      console.error('Add option error:', error);
      
      if (error.message === 'Option already exists in this group') {
        return res.status(409).json({ 
          success: false, 
          message: error.message 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Failed to add option',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update an existing option
  static async updateOption(req, res) {
    try {
      const { id } = req.params;
      const { label, display_order, is_active } = req.body;

      const option = await ClinicalOption.findById(id);
      if (!option) {
        return res.status(404).json({ 
          success: false, 
          message: 'Option not found' 
        });
      }

      const updateData = {};
      if (label !== undefined) updateData.option_label = label.trim();
      if (display_order !== undefined) updateData.display_order = display_order;
      if (is_active !== undefined) updateData.is_active = is_active;

      await option.update(updateData);

      // Get updated list of options for this group
      const allOptions = await ClinicalOption.findByGroup(option.option_group, true);
      const optionLabels = allOptions.map(opt => opt.option_label);

      res.json({ 
        success: true, 
        message: 'Option updated successfully',
        data: { 
          option: option.toJSON(),
          group: option.option_group,
          options: optionLabels 
        } 
      });
    } catch (error) {
      console.error('Update option error:', error);
      
      if (error.message === 'Option label already exists in this group') {
        return res.status(409).json({ 
          success: false, 
          message: error.message 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update option',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete an option (hard delete by default to permanently remove, or soft delete if specified)
  static async deleteOption(req, res) {
    try {
      const group = req.params.group;
      const { label, id, hard_delete = true } = req.body; // Default to hard delete

      let option = null;

      // Find option by ID or by group + label
      if (id) {
        option = await ClinicalOption.findById(id);
      } else if (label) {
        option = await ClinicalOption.findByGroupAndLabel(group, label);
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Either id or label is required' 
        });
      }

      if (!option) {
        return res.status(404).json({ 
          success: false, 
          message: 'Option not found' 
        });
      }

      // Prevent deletion of system options
      if (option.is_system) {
        return res.status(403).json({ 
          success: false, 
          message: 'Cannot delete system option. System options are protected and cannot be removed.' 
        });
      }

      // Perform delete (hard delete by default, soft delete if explicitly requested)
      try {
        if (hard_delete) {
          await option.hardDelete();
        } else {
          await option.delete();
        }
      } catch (deleteError) {
        console.error('Delete operation error:', deleteError);
        // If hard delete fails (e.g., due to constraint), try soft delete
        if (hard_delete && deleteError.code !== '23503') { // Not a foreign key constraint
          try {
            await option.delete();
            console.log('Hard delete failed, performed soft delete instead');
          } catch (softError) {
            throw deleteError; // Re-throw original error if soft delete also fails
          }
        } else {
          throw deleteError;
        }
      }

      // Get updated list of options for this group
      const allOptions = await ClinicalOption.findByGroup(group, true);
      const optionLabels = allOptions.map(opt => opt.option_label);

      res.json({ 
        success: true, 
        message: hard_delete ? 'Option permanently deleted' : 'Option deleted successfully',
        data: { 
          group, 
          options: optionLabels 
        } 
      });
    } catch (error) {
      console.error('Delete option error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete option',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Seed all clinical options from JSON file
  static async seedOptions(req, res) {
    try {
      const seedClinicalOptions = require('../scripts/seedClinicalOptions');
      const result = await seedClinicalOptions();
      
      return res.json({
        success: true,
        message: 'Clinical options seeded successfully',
        data: result
      });
    } catch (error) {
      console.error('Seed options error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to seed clinical options',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = ClinicalOptionsController;


