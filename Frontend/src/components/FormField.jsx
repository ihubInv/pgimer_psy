import { memo } from 'react';
import Input from './Input';
import Textarea from './Textarea';
import Select from './Select';
import CustomDatePicker from './CustomDatePicker';

/**
 * Reusable FormField component that wraps Input, Textarea, Select, and DatePicker
 * with consistent styling and error handling
 */
const FormField = memo(({
  type = 'text',
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className = '',
  options = [],
  rows,
  ...props
}) => {
  const commonProps = {
    label,
    name,
    value,
    onChange,
    placeholder,
    error,
    required,
    disabled,
    className,
  };

  switch (type) {
    case 'textarea':
      return <Textarea {...commonProps} rows={rows} {...props} />;
    
    case 'select':
      return <Select {...commonProps} options={options} {...props} />;
    
    case 'date':
      return <CustomDatePicker {...commonProps} {...props} />;
    
    default:
      return <Input {...commonProps} type={type} {...props} />;
  }
});

FormField.displayName = 'FormField';

export default FormField;

