/**
 * Add Candidate Modal Component
 * Provides a form to add new candidates with proper validation and error handling
 */

import { useState } from 'react';
import { UserPlusIcon, AlertCircleIcon } from 'lucide-react';
import Modal, { ModalFooter } from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useCreateCandidate } from '../../shared/hooks/useCandidates';
import { useFormErrorHandler } from '../../shared/hooks/useErrorHandler';
import { ValidationErrorFallback } from '../../shared/components/ErrorFallbacks';

export default function AddCandidateModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    source: 'direct',
    status: 'pending',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const createCandidate = useCreateCandidate();
  const { error, clearError } = useFormErrorHandler();

  /**
   * Validation rules
   */
  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return '';

      case 'email':
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';

      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,15}$/;
        if (!phoneRegex.test(value.trim())) return 'Please enter a valid phone number';
        return '';

      case 'date_of_birth':
        if (!value) return 'Date of birth is required';
        const birthDate = new Date(value);
        const minAge = new Date();
        minAge.setFullYear(minAge.getFullYear() - 16); // Minimum 16 years old
        if (birthDate > minAge) return 'Candidate must be at least 16 years old';
        return '';

      default:
        return '';
    }
  };

  /**
   * Handle field changes with validation
   */
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    if (error) {
      clearError();
    }
  };

  /**
   * Handle field blur for validation
   */
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const fieldError = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: fieldError }));
  };

  /**
   * Validate entire form
   */
  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach(field => {
      if (field === 'source' || field === 'status') return; // Skip dropdown fields
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);
    setTouched(
      Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );

    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const result = await createCandidate.mutateAsync(formData);

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        source: 'direct',
        status: 'pending',
      });
      setErrors({});
      setTouched({});

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result);
      }

      // Close modal
      onClose();
    } catch (error) {
      // Error is handled by the hook
      console.error('Failed to create candidate:', error);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    // Reset form state
    setFormData({
      name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      source: 'direct',
      status: 'pending',
    });
    setErrors({});
    setTouched({});
    clearError();
    onClose();
  };

  /**
   * Get current validation state
   */
  const getFieldError = (field) => touched[field] ? errors[field] : '';
  const hasErrors = Object.values(errors).some(error => error);
  const isFormValid = !hasErrors && Object.keys(touched).length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Candidate"
      description="Add a new candidate to your talent pool"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Display */}
        {error && (
          <ValidationErrorFallback
            errors={[error.message]}
            onDismiss={clearError}
          />
        )}

        {/* Name Field */}
        <Input
          label="Full Name"
          placeholder="e.g. John Doe"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          error={getFieldError('name')}
          required
        />

        {/* Email Field */}
        <Input
          label="Email Address"
          type="email"
          placeholder="e.g. john.doe@example.com"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          error={getFieldError('email')}
          required
        />

        {/* Phone Field */}
        <Input
          label="Phone Number"
          type="tel"
          placeholder="e.g. +65 9123 4567"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={() => handleBlur('phone')}
          error={getFieldError('phone')}
          required
        />

        {/* Date of Birth Field */}
        <Input
          label="Date of Birth"
          type="date"
          value={formData.date_of_birth}
          onChange={(e) => handleChange('date_of_birth', e.target.value)}
          onBlur={() => handleBlur('date_of_birth')}
          error={getFieldError('date_of_birth')}
          required
        />

        {/* Source Field */}
        <Select
          label="Source"
          value={formData.source}
          onChange={(value) => handleChange('source', value)}
          options={[
            { label: 'Direct Application', value: 'direct' },
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'Job Portal', value: 'job_portal' },
            { label: 'Referral', value: 'referral' },
            { label: 'Social Media', value: 'social_media' },
            { label: 'Walk-in', value: 'walk_in' },
            { label: 'Other', value: 'other' },
          ]}
        />

        {/* Status Field */}
        <Select
          label="Initial Status"
          value={formData.status}
          onChange={(value) => handleChange('status', value)}
          options={[
            { label: 'Pending Review', value: 'pending' },
            { label: 'Active', value: 'active' },
            { label: 'Under Review', value: 'under_review' },
          ]}
        />

        {/* Form Actions */}
        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={createCandidate.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={createCandidate.isPending}
            disabled={!isFormValid}
            icon={UserPlusIcon}
          >
            Add Candidate
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}