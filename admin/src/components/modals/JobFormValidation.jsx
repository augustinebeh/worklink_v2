/**
 * Job Form Validation Hook
 * Encapsulates all validation logic for the Add Job form
 */

import { useState, useCallback } from 'react';

export default function useJobFormValidation(formData) {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  /**
   * Validation rules
   */
  const validateField = useCallback((name, value) => {
    switch (name) {
      case 'title':
        if (!value.trim()) return 'Job title is required';
        if (value.trim().length < 3) return 'Job title must be at least 3 characters';
        return '';

      case 'description':
        if (!value.trim()) return 'Job description is required';
        if (value.trim().length < 10) return 'Description must be at least 10 characters';
        return '';

      case 'client_id':
        if (!value) return 'Please select a client';
        return '';

      case 'location':
        if (!value.trim()) return 'Location is required';
        return '';

      case 'salary_min':
        if (!value) return 'Minimum salary is required';
        const minSalary = parseFloat(value);
        if (isNaN(minSalary) || minSalary < 0) return 'Please enter a valid minimum salary';
        return '';

      case 'salary_max': {
        if (!value) return 'Maximum salary is required';
        const maxSalary = parseFloat(value);
        const currentMin = parseFloat(formData.salary_min);
        if (isNaN(maxSalary) || maxSalary < 0) return 'Please enter a valid maximum salary';
        if (!isNaN(currentMin) && maxSalary < currentMin) return 'Maximum salary must be greater than minimum salary';
        return '';
      }

      case 'application_deadline':
        if (!value) return 'Application deadline is required';
        const deadline = new Date(value);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (deadline < tomorrow) return 'Deadline must be at least 1 day from now';
        return '';

      default:
        return '';
    }
  }, [formData.salary_min]);

  /**
   * Handle field blur for validation
   */
  const handleBlur = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const fieldError = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: fieldError }));
  }, [formData, validateField]);

  /**
   * Clear error for a specific field
   */
  const clearFieldError = useCallback((field) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  /**
   * Re-validate a dependent field (e.g., salary_max when salary_min changes)
   */
  const revalidateField = useCallback((field) => {
    const fieldError = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: fieldError }));
  }, [formData, validateField]);

  /**
   * Validate entire form
   */
  const validateForm = useCallback(() => {
    const newErrors = {};
    const requiredFields = ['title', 'description', 'client_id', 'location', 'salary_min', 'salary_max', 'application_deadline'];

    requiredFields.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);
    setTouched(
      requiredFields.reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );

    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  /**
   * Reset validation state
   */
  const resetValidation = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  /**
   * Get current validation state
   */
  const getFieldError = useCallback((field) => touched[field] ? errors[field] : '', [touched, errors]);
  const hasErrors = Object.values(errors).some(error => error);

  /**
   * Get minimum date for deadline (tomorrow)
   */
  const getMinDeadlineDate = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);

  return {
    errors,
    touched,
    handleBlur,
    clearFieldError,
    revalidateField,
    validateForm,
    resetValidation,
    getFieldError,
    hasErrors,
    getMinDeadlineDate,
  };
}
