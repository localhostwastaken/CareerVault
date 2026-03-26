import React from 'react';
import { useField } from 'formik';

interface FormikInputProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  helperText?: string;
  autoComplete?: string;
  className?: string;
}

const FormikInput: React.FC<FormikInputProps> = ({ 
  label, 
  helperText, 
  className = '',
  ...props 
}) => {
  const [field, meta] = useField(props.name);
  const hasError = meta.touched && meta.error;

  return (
    <div className="w-full">
      <label 
        htmlFor={props.name} 
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <input
        {...field}
        {...props}
        id={props.name}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${hasError ? 'border-red-500' : 'border-gray-300'}
          ${className}
        `}
      />
      {hasError && (
        <p className="mt-1 text-xs text-red-600">{meta.error}</p>
      )}
      {helperText && !hasError && (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default FormikInput;