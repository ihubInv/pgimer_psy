import { format, parseISO } from 'date-fns';

export const formatDate = (date, formatStr = 'PPP') => {
  if (!date) return '-';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    return '-';
  }
};

export const formatDateTime = (date) => {
  return formatDate(date, 'PPP p');
};

/** ADL / Out Patient Intake: prefer file_created_date, else DB created_at (with time). */
export const formatAdlRecordCreated = (adlFile) => {
  if (!adlFile) return '';
  if (adlFile.file_created_date) {
    const s = formatDate(adlFile.file_created_date);
    return s === '-' ? '' : s;
  }
  if (adlFile.created_at) {
    const s = formatDateTime(adlFile.created_at);
    return s === '-' ? '' : s;
  }
  return '';
};

export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return '-';
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
};

export const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const truncate = (str, length = 50) => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};



export const formatDateForDatePicker = (dateValue) => {
  if (!dateValue) return '';
  if (typeof dateValue === 'string') {
    // If it's already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    // If it's an ISO string with time, extract date part
    if (dateValue.includes('T')) return dateValue.split('T')[0];
    // Try to parse and format
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch {
      return '';
    }
  }
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '';
};