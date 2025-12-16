import { PATIENT_REGISTRATION_FORM } from './constants';

/**
 * Get field label by field name from PATIENT_REGISTRATION_FORM
 * @param {string} fieldName - The field name to look up
 * @returns {string} - The label for the field, or the field name if not found
 */
const getFieldLabel = (fieldName) => {
  const field = PATIENT_REGISTRATION_FORM.find(f => f.value === fieldName);
  return field ? field.label : fieldName;
};

/**
 * Validate a single field value based on its type and rules
 * @param {string} fieldName - The field name
 * @param {any} value - The value to validate
 * @param {Object} options - Validation options (required, min, max, pattern, etc.)
 * @returns {string|null} - Error message if invalid, null if valid
 */
const validateFieldValue = (fieldName, value, options = {}) => {
  const { required = false, min, max, pattern, type, customValidator } = options;
  const fieldLabel = getFieldLabel(fieldName);

  // Check if field is required
  if (required) {
    // Special handling for department field with default value
    if (fieldName === 'department') {
      // Department is always "Psychiatry" by default, so accept it even if not in formData
      // The validation will pass if value is "Psychiatry" or if it's empty (will use default)
      if (value === 'Psychiatry' || value === null || value === undefined || value === '') {
        return null; // Department has default value, so it's always valid
      }
    } else if (fieldName === 'contact_number' || fieldName === 'mobile_no') {
      // Special handling for phone number fields - check if there are any digits
      const isEmpty = value === null || 
                     value === undefined || 
                     value === '' || 
                     (typeof value === 'string' && value.trim() === '');
      
      if (isEmpty) {
        return `${fieldLabel} is required`;
      }
      
      // For phone numbers, also check if there are any digits after removing non-digits
      // This handles cases where user enters formatted numbers like "123-456-7890"
      const trimmedValue = String(value).trim();
      const digitsOnly = trimmedValue.replace(/\D/g, '');
      
      // If no digits at all, it's considered empty
      if (digitsOnly.length === 0) {
        return `${fieldLabel} is required`;
      }
    } else {
      // Check if value is truly empty
      const isEmpty = value === null || 
                     value === undefined || 
                     value === '' || 
                     (typeof value === 'string' && value.trim() === '');
      
      if (isEmpty) {
        return `${fieldLabel} is required`;
      }
    }
  }

  // Skip further validation if value is empty and not required
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Type-specific validation
  if (type === 'number' || type === 'integer') {
    const numValue = type === 'integer' ? parseInt(value) : parseFloat(value);
    if (isNaN(numValue)) {
      return `${fieldLabel} must be a valid number`;
    }
    if (min !== undefined && numValue < min) {
      return `${fieldLabel} must be at least ${min}`;
    }
    if (max !== undefined && numValue > max) {
      return `${fieldLabel} must be at most ${max}`;
    }
  }

  if (type === 'string') {
    const strValue = String(value).trim();
    if (min !== undefined && strValue.length < min) {
      return `${fieldLabel} must be at least ${min} characters`;
    }
    if (max !== undefined && strValue.length > max) {
      return `${fieldLabel} must be at most ${max} characters`;
    }
    if (pattern && !pattern.test(strValue)) {
      return `${fieldLabel} format is invalid`;
    }
  }

  // Custom validator
  if (customValidator) {
    const customError = customValidator(value, fieldLabel);
    if (customError) return customError;
  }

  return null;
};

/**
 * Get validation rules for a field
 * @param {string} fieldName - The field name
 * @param {number} step - The current step
 * @param {string} userRole - The user's role (optional)
 * @returns {Object} - Validation rules for the field
 */
const getFieldValidationRules = (fieldName, step, userRole = null) => {
  // Fields that should be optional for Psychiatric Welfare Officers
  const isMWO = userRole === 'Psychiatric Welfare Officer';
  const mwoOptionalFields = ['category', 'unit_consit', 'room_no', 'serial_no', 'file_no', 'unit_days'];
  const isMWOOptionalField = isMWO && mwoOptionalFields.includes(fieldName);
  const rules = {
    // Step 1 Required Fields (Out Patient Card)
    name: { required: true, type: 'string', min: 1, max: 255 },
    sex: { required: true, type: 'string' },
    age: { 
      required: true, 
      type: 'integer', 
      min: 0, 
      max: 150,
      customValidator: (value) => {
        const age = parseInt(value);
        if (isNaN(age) || age < 0 || age > 150) {
          return 'Age must be between 0 and 150';
        }
        return null;
      }
    },
    address_line: { required: step === 1, type: 'string', min: 1, max: 500 },
    state: { required: step === 1, type: 'string', min: 1, max: 100 },
    district: { required: step === 1, type: 'string', min: 1, max: 100 },
    city: { required: step === 1, type: 'string', min: 1, max: 100 },
    pin_code: { 
      required: false, 
      type: 'string',
      pattern: /^\d{6}$/,
      customValidator: (value) => {
        const pinCode = String(value).trim();
        if (pinCode && !/^\d{6}$/.test(pinCode)) {
          return 'Pin Code must be exactly 6 digits';
        }
        return null;
      }
    },

    // Step 1 Required Fields (all fields in Out Patient Card are required)
    cr_no: { required: step === 1, type: 'string', max: 50 },
    date: { required: step === 1, type: 'string' },
    mobile_no: { 
      // mobile_no is not required if contact_number is used (they're the same field)
      required: false, 
      type: 'string',
      customValidator: (value, label) => {
        // Only validate format if value exists
        if (value && value.trim() !== '') {
          const trimmedValue = String(value).trim();
          const digitsOnly = trimmedValue.replace(/\D/g, '');
          
          if (digitsOnly.length === 10) {
            if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
              return `${label} must be 10 digits and start with 6-9`;
            }
          } else if (digitsOnly.length > 10) {
            return `${label} must not be greater than 10 digits`;
          }
        }
        return null;
      }
    },
    contact_number: { 
      required: step === 1, 
      type: 'string', 
      max: 10,
      customValidator: (value, label) => {
        // Only validate format if value exists and is not empty
        // Required check is handled separately, so don't check for empty here
        if (!value || value === '' || (typeof value === 'string' && value.trim() === '')) {
          // Empty value - let the required check handle this
          return null;
        }
        
        const trimmedValue = String(value).trim();
        // Remove any non-digit characters for validation
        const digitsOnly = trimmedValue.replace(/\D/g, '');
        
        // If no digits found after removing non-digits, let required check handle it
        if (digitsOnly.length === 0) {
          return null; // Let required check handle empty values
        }
        
        // Only validate format if we have digits
        if (digitsOnly.length > 10) {
          return `${label} must not be greater than 10 digits`;
        }
        
        // Only validate format if we have exactly 10 digits
        if (digitsOnly.length === 10) {
          if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
            return `${label} must be 10 digits and start with 6-9`;
          }
        } else if (digitsOnly.length < 10 && digitsOnly.length > 0) {
          // If less than 10 digits but has some digits, only validate if it starts with wrong digit
          // Don't show error for incomplete numbers (user might still be typing)
          if (!/^[6-9]/.test(digitsOnly)) {
            return `${label} must start with 6-9`;
          }
        }
        
        return null;
      }
    },
    category: { required: step === 1 && !isMWOOptionalField, type: 'string' },
    father_name: { required: step === 1, type: 'string', max: 255 },
    department: { required: step === 1, type: 'string', max: 100 },
    unit_consit: { required: step === 1 && !isMWOOptionalField, type: 'string', max: 100 },
    room_no: { required: step === 1 && !isMWOOptionalField, type: 'string', max: 50 },
    serial_no: { required: step === 1 && !isMWOOptionalField, type: 'string', max: 50 },
    file_no: { required: step === 1 && !isMWOOptionalField, type: 'string', max: 50 },
    unit_days: { required: step === 1 && !isMWOOptionalField, type: 'string' },
    seen_in_walk_in_on: { required: step === 2, type: 'string' },
    worked_up_on: { required: false, type: 'string' },
    country: { required: step === 1, type: 'string', max: 100 },
    psy_no: { required: false, type: 'string', max: 50 },
    special_clinic_no: { required: false, type: 'string', max: 50 },
    age_group: { required: step === 2, type: 'string', max: 20 },
    marital_status: { required: step === 2, type: 'string', max: 50 },
    year_of_marriage: { 
      required: false, 
      type: 'integer', 
      min: 1900, 
      max: new Date().getFullYear(),
      customValidator: (value, label) => {
        if (value) {
          const year = parseInt(value);
          const currentYear = new Date().getFullYear();
          if (isNaN(year) || year < 1900 || year > currentYear) {
            return `${label} must be between 1900 and ${currentYear}`;
          }
        }
        return null;
      }
    },
    no_of_children_male: { 
      required: false, 
      type: 'integer', 
      min: 0, 
      max: 20 
    },
    no_of_children_female: { 
      required: false, 
      type: 'integer', 
      min: 0, 
      max: 20 
    },
    occupation: { required: step === 2, type: 'string', max: 255 },
    education: { required: step === 2, type: 'string', max: 100 },
    locality: { required: step === 2, type: 'string', max: 100 },
    patient_income: { 
      required: step === 2, 
      type: 'number', 
      min: 0,
      customValidator: (value, label) => {
        if (value && parseFloat(value) < 0) {
          return `${label} cannot be negative`;
        }
        return null;
      }
    },
    family_income: { 
      required: step === 2, 
      type: 'number', 
      min: 0,
      customValidator: (value, label) => {
        if (value && parseFloat(value) < 0) {
          return `${label} cannot be negative`;
        }
        return null;
      }
    },
    religion: { required: step === 2, type: 'string', max: 100 },
    family_type: { required: step === 2, type: 'string', max: 100 },
    head_name: { required: step === 2, type: 'string', max: 255 },
    head_age: { 
      required: step === 2, 
      type: 'integer', 
      min: 0, 
      max: 150 
    },
    head_relationship: { required: step === 2, type: 'string', max: 100 },
    head_education: { required: step === 2, type: 'string', max: 100 },
    head_occupation: { required: step === 2, type: 'string', max: 255 },
    head_income: { 
      required: step === 2, 
      type: 'number', 
      min: 0,
      customValidator: (value, label) => {
        if (value && parseFloat(value) < 0) {
          return `${label} cannot be negative`;
        }
        return null;
      }
    },
    distance_from_hospital: { required: step === 2, type: 'string', max: 255 },
    mobility: { required: step === 2, type: 'string', max: 100 },
    referred_by: { required: step === 2, type: 'string', max: 255 },
    
    // Present Address fields (actual field names used in form)
    present_address_line_1: { required: false, type: 'string', max: 500 },
    present_address_line_2: { required: false, type: 'string', max: 500 },
    present_city_town_village: { required: false, type: 'string', max: 100 },
    present_city_town_village_2: { required: false, type: 'string', max: 100 },
    present_district: { required: false, type: 'string', max: 100 },
    present_district_2: { required: false, type: 'string', max: 100 },
    present_state: { required: false, type: 'string', max: 100 },
    present_state_2: { required: false, type: 'string', max: 100 },
    present_pin_code: { 
      required: false, 
      type: 'string',
      pattern: /^\d{6}$/,
      customValidator: (value) => {
        if (value) {
          const pinCode = String(value).trim();
          if (pinCode && !/^\d{6}$/.test(pinCode)) {
            return 'Present Pin Code must be exactly 6 digits';
          }
        }
        return null;
      }
    },
    present_pin_code_2: { 
      required: false, 
      type: 'string',
      pattern: /^\d{6}$/,
      customValidator: (value) => {
        if (value) {
          const pinCode = String(value).trim();
          if (pinCode && !/^\d{6}$/.test(pinCode)) {
            return 'Present Pin Code 2 must be exactly 6 digits';
          }
        }
        return null;
      }
    },
    present_country: { required: false, type: 'string', max: 100 },
    present_country_2: { required: false, type: 'string', max: 100 },
    
    // Permanent Address fields (actual field names used in form)
    permanent_address_line_1: { required: false, type: 'string', max: 500 },
    permanent_city_town_village: { required: false, type: 'string', max: 100 },
    permanent_district: { required: false, type: 'string', max: 100 },
    permanent_state: { required: false, type: 'string', max: 100 },
    permanent_pin_code: { 
      required: false, 
      type: 'string',
      pattern: /^\d{6}$/,
      customValidator: (value) => {
        if (value) {
          const pinCode = String(value).trim();
          if (pinCode && !/^\d{6}$/.test(pinCode)) {
            return 'Permanent Pin Code must be exactly 6 digits';
          }
        }
        return null;
      }
    },
    permanent_country: { required: false, type: 'string', max: 100 },
    
    // Local Address
    local_address: { required: false, type: 'string', max: 500 },
    
    // Legacy field names (for backward compatibility)
    present_address_line: { required: false, type: 'string', max: 500 },
    present_city: { required: false, type: 'string', max: 100 },
    permanent_address_line: { required: false, type: 'string', max: 500 },
    permanent_city: { required: false, type: 'string', max: 100 },
    
    // Additional fields
    assigned_doctor_name: { required: false, type: 'string', max: 255 },
    assigned_doctor_id: { 
      required: false, 
      type: 'integer', 
      min: 1 
    },
    assigned_room: { required: false, type: 'string', max: 50 },
  };

  return rules[fieldName] || { required: false };
};

/**
 * Validate patient registration form data
 * @param {Object} formData - The form data to validate
 * @param {number} step - The current step (1 for Out Patient Card, 2 for remaining sections)
 * @returns {Object} - Object containing isValid boolean, errors object, and missingFields array
 */
export const validatePatientRegistration = (formData, step = 1) => {
  const errors = {};
  const missingFields = [];

  // Get all unique field names from PATIENT_REGISTRATION_FORM and formData
  const allFieldNames = new Set();
  
  // Add fields from PATIENT_REGISTRATION_FORM
  PATIENT_REGISTRATION_FORM.forEach(({ value: fieldName }) => {
    allFieldNames.add(fieldName);
  });
  
  // Add fields from formData (to catch any additional fields)
  Object.keys(formData).forEach(fieldName => {
    allFieldNames.add(fieldName);
  });

  // Validate all fields
  allFieldNames.forEach(fieldName => {
    let value = formData[fieldName];
    
    // Special handling for department field - use default value if not set
    if (fieldName === 'department' && (!value || value === '')) {
      value = 'Psychiatry';
    }
    
    const rules = getFieldValidationRules(fieldName, step, userRole);
    
    // Only validate if rules exist (field is known) or if value is provided
    if (rules && Object.keys(rules).length > 0) {
      // Skip validation for mobile_no if contact_number is being used and has a value
      // mobile_no and contact_number are the same field, just different names
      if (fieldName === 'mobile_no') {
        // If contact_number exists and has a value, skip mobile_no validation
        if (formData.contact_number && formData.contact_number.trim() !== '') {
          return; // Skip mobile_no validation if contact_number is filled
        }
        // If mobile_no doesn't exist but contact_number does, use contact_number value
        if (!value && formData.contact_number) {
          value = formData.contact_number;
        }
      }
      
      const error = validateFieldValue(fieldName, value, rules);

      if (error) {
        // Map field names to error keys used in the component
        const errorKey = fieldName === 'name' ? 'patientName' : 
                         fieldName === 'sex' ? 'patientSex' : 
                         fieldName === 'age' ? 'patientAge' : fieldName;
        
        errors[errorKey] = error;
        
        // Add to missingFields only if it's a required field error
        if (rules.required && error.includes('is required')) {
          const fieldLabel = getFieldLabel(fieldName);
          missingFields.push(fieldLabel);
        }
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingFields,
  };
};

/**
 * Validate a specific field
 * @param {string} fieldName - The field name to validate
 * @param {any} value - The value to validate
 * @param {Object} formData - The complete form data (for context-dependent validation)
 * @param {number} step - The current step (1 for Out Patient Card, 2 for remaining sections)
 * @returns {string|null} - Error message if invalid, null if valid
 */
export const validateField = (fieldName, value, formData = {}, step = 1) => {
  const rules = getFieldValidationRules(fieldName, step);
  return validateFieldValue(fieldName, value, rules);
};

