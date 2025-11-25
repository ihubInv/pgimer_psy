// Utility function to get human-friendly labels for enum values
export const getEnumLabel = (value, options) => {
  if (!value || !options) return value;
  const option = options.find(opt => opt.value === value);
  return option ? option.label : value;
};

// Specific mapping functions for common enums
export const getSexLabel = (sex) => getEnumLabel(sex, SEX_OPTIONS);
export const getMaritalStatusLabel = (status) => getEnumLabel(status, MARITAL_STATUS);
export const getFamilyTypeLabel = (type) => getEnumLabel(type, FAMILY_TYPE_OPTIONS);
export const getLocalityLabel = (locality) => getEnumLabel(locality, LOCALITY_OPTIONS);
export const getReligionLabel = (religion) => getEnumLabel(religion, RELIGION_OPTIONS);
export const getAgeGroupLabel = (ageGroup) => getEnumLabel(ageGroup, AGE_GROUP_OPTIONS);
export const getOccupationLabel = (occupation) => getEnumLabel(occupation, OCCUPATION_OPTIONS);
export const getEducationLabel = (education) => getEnumLabel(education, EDUCATION_OPTIONS);
export const getMobilityLabel = (mobility) => getEnumLabel(mobility, MOBILITY_OPTIONS);
export const getReferredByLabel = (referredBy) => getEnumLabel(referredBy, REFERRED_BY_OPTIONS);
export const getFileStatusLabel = (status) => getEnumLabel(status, FILE_STATUS);
export const getCaseSeverityLabel = (severity) => getEnumLabel(severity, CASE_SEVERITY);
export const getDoctorDecisionLabel = (decision) => getEnumLabel(decision, DOCTOR_DECISION);

// Format address helper
export const formatAddress = (addressData) => {
  if (!addressData) return '';
  
  const parts = [];
  if (addressData.address_line) parts.push(addressData.address_line);
  if (addressData.address_line_2) parts.push(addressData.address_line_2);
  if (addressData.city) parts.push(addressData.city);
  if (addressData.district) parts.push(addressData.district);
  if (addressData.state) parts.push(addressData.state);
  if (addressData.pin_code) parts.push(addressData.pin_code);
  if (addressData.country) parts.push(addressData.country);
  
  return parts.join(', ');
};

// Format currency helper
export const formatCurrency = (amount) => {
  if (!amount) return 'Not specified';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

// Format date helper
export const formatDate = (dateString) => {
  if (!dateString) return 'Not specified';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Format datetime helper
export const formatDateTime = (dateString) => {
  if (!dateString) return 'Not specified';
  return new Date(dateString).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Import constants
import { 
  SEX_OPTIONS, MARITAL_STATUS, FAMILY_TYPE_OPTIONS, LOCALITY_OPTIONS, RELIGION_OPTIONS, 
  AGE_GROUP_OPTIONS, OCCUPATION_OPTIONS, EDUCATION_OPTIONS, 
  MOBILITY_OPTIONS, REFERRED_BY_OPTIONS, FILE_STATUS, CASE_SEVERITY, DOCTOR_DECISION 
} from './constants';
