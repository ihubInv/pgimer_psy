import React from 'react';
import { FiX, FiLoader } from 'react-icons/fi';

export const IconInput = ({ 
  icon, 
  label, 
  loading = false, 
  error, 
  defaultValue, 
  ...props 
}) => {
  // Convert null/undefined values to empty string to avoid React warnings
  const normalizedValue = props.value === null || props.value === undefined ? '' : props.value;
  const normalizedDefaultValue = defaultValue === null || defaultValue === undefined ? '' : defaultValue;
  
  // Determine if this should be a controlled or uncontrolled component
  // If 'value' prop is provided (even if empty string), it's controlled - don't use defaultValue
  // If 'value' is not provided, it's uncontrolled - use defaultValue
  const isControlled = 'value' in props;
  
  // Remove defaultValue from props if it exists (to avoid conflicts)
  const { defaultValue: _, ...restProps } = props;
  
  // Build input props - only include value OR defaultValue, never both
  const inputProps = isControlled
    ? { ...restProps, value: normalizedValue } // Controlled: use value, exclude defaultValue
    : { ...restProps, defaultValue: normalizedDefaultValue }; // Uncontrolled: use defaultValue, exclude value
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          {icon && <span className="text-primary-600">{icon}</span>}
          {label}
          {loading && (
            <FiLoader className="w-4 h-4 text-blue-500 animate-spin" />
          )}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
            <span className="text-gray-500">{icon}</span>
          </div>
        )}
        <input
          {...inputProps}
          className={`w-full px-4 py-3 ${icon ? 'pl-11' : 'pl-4'} bg-white border-2 border-gray-300/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white transition-all duration-300 hover:bg-white hover:border-primary-400/70 placeholder:text-gray-400 text-gray-900 font-medium ${inputProps.className || ''}`}
        />
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1 font-medium">
          <FiX className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
};