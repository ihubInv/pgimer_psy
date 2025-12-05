const moment = require('moment');

// Generate unique identifiers
const generateUniqueId = (prefix = 'ID') => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${randomStr}`.toUpperCase();
};

// Format date for display
const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return null;
  return moment(date).format(format);
};

// Format date and time for display
const formatDateTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return null;
  return moment(date).format(format);
};

// Parse date from string
const parseDate = (dateString) => {
  if (!dateString) return null;
  return moment(dateString).toDate();
};

// Calculate age from birth date
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  return moment().diff(moment(birthDate), 'years');
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Normalize email address (only converts to lowercase, preserves dots and plus signs)
// Example: Jasdeep.Singh.Inbox@gmail.com -> jasdeep.singh.inbox@gmail.com
// Note: jasdeep.singh.inbox@gmail.com and jasdeepsinghinbox@gmail.com are treated as DIFFERENT emails
const normalizeEmail = (email) => {
  if (!email) return email;
  
  // Just trim and convert to lowercase, keep all characters including dots and plus signs
  return email.trim().toLowerCase();
};

// Validate phone number (Indian format)
const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// Sanitize string input
const sanitizeString = (str) => {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, '');
};

// Generate pagination metadata
const generatePagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total: parseInt(total),
    pages: totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

// Format currency (Indian Rupees)
const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
};

// Generate file name with timestamp
const generateFileName = (originalName, prefix = 'file') => {
  const timestamp = Date.now();
  const extension = originalName ? originalName.split('.').pop() : 'txt';
  return `${prefix}_${timestamp}.${extension}`;
};

// Check if date is today
const isToday = (date) => {
  if (!date) return false;
  return moment(date).isSame(moment(), 'day');
};

// Check if date is in the past
const isPast = (date) => {
  if (!date) return false;
  return moment(date).isBefore(moment(), 'day');
};

// Check if date is in the future
const isFuture = (date) => {
  if (!date) return false;
  return moment(date).isAfter(moment(), 'day');
};

// Get date range for a period
const getDateRange = (period = 'today') => {
  const now = moment();
  
  switch (period) {
    case 'today':
      return {
        start: now.clone().startOf('day').toDate(),
        end: now.clone().endOf('day').toDate()
      };
    case 'yesterday':
      return {
        start: now.clone().subtract(1, 'day').startOf('day').toDate(),
        end: now.clone().subtract(1, 'day').endOf('day').toDate()
      };
    case 'thisWeek':
      return {
        start: now.clone().startOf('week').toDate(),
        end: now.clone().endOf('week').toDate()
      };
    case 'thisMonth':
      return {
        start: now.clone().startOf('month').toDate(),
        end: now.clone().endOf('month').toDate()
      };
    case 'thisYear':
      return {
        start: now.clone().startOf('year').toDate(),
        end: now.clone().endOf('year').toDate()
      };
    default:
      return {
        start: now.clone().startOf('day').toDate(),
        end: now.clone().endOf('day').toDate()
      };
  }
};

// Generate random string
const generateRandomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Mask sensitive data
const maskSensitiveData = (data, type = 'email') => {
  if (!data) return '';
  
  switch (type) {
    case 'email':
      const [username, domain] = data.split('@');
      return `${username.substring(0, 2)}***@${domain}`;
    case 'phone':
      return data.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2');
    case 'name':
      const parts = data.split(' ');
      return parts.map(part => part.charAt(0) + '*'.repeat(part.length - 1)).join(' ');
    default:
      return data;
  }
};

// Convert object keys to camelCase
const toCamelCase = (str) => {
  return str.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase().replace('-', '').replace('_', '');
  });
};

// Convert object to camelCase
const objectToCamelCase = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(objectToCamelCase);
  }
  
  const converted = {};
  Object.keys(obj).forEach(key => {
    const camelKey = toCamelCase(key);
    converted[camelKey] = objectToCamelCase(obj[key]);
  });
  
  return converted;
};

// Deep clone object
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(deepClone);
  if (typeof obj === 'object') {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
};

// Remove empty values from object
const removeEmptyValues = (obj) => {
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== null && value !== undefined && value !== '') {
      cleaned[key] = value;
    }
  });
  return cleaned;
};

module.exports = {
  generateUniqueId,
  formatDate,
  formatDateTime,
  parseDate,
  calculateAge,
  isValidEmail,
  normalizeEmail,
  isValidPhoneNumber,
  sanitizeString,
  generatePagination,
  formatCurrency,
  generateFileName,
  isToday,
  isPast,
  isFuture,
  getDateRange,
  generateRandomString,
  maskSensitiveData,
  toCamelCase,
  objectToCamelCase,
  deepClone,
  removeEmptyValues
};
