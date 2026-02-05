/**
 * Add Job Modal Component
 * Provides a form to create new job postings with validation
 */

import { useState, useEffect } from 'react';
import { BriefcaseIcon, AlertCircleIcon } from 'lucide-react';
import Modal, { ModalFooter } from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useCreateJob } from '../../shared/hooks/useJobs';
import { useClients } from '../hooks/useClients';
import { useFormErrorHandler } from '../../shared/hooks/useErrorHandler';
import { ValidationErrorFallback } from '../../shared/components/ErrorFallbacks';

export default function AddJobModal({ isOpen, onClose, onSuccess, preselectedClient = null }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_id: preselectedClient || '',
    location: '',
    job_type: 'full_time',
    salary_min: '',
    salary_max: '',
    currency: 'SGD',
    requirements: '',
    benefits: '',
    status: 'draft',
    application_deadline: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const createJob = useCreateJob();
  const { data: clientsData } = useClients({ limit: 100 }); // Get all clients for dropdown
  const { error, clearError } = useFormErrorHandler();

  // Update client_id when preselectedClient changes
  useEffect(() => {
    if (preselectedClient) {
      setFormData(prev => ({ ...prev, client_id: preselectedClient }));
    }
  }, [preselectedClient]);

  /**
   * Validation rules
   */
  const validateField = (name, value) => {
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

      case 'salary_max':
        if (!value) return 'Maximum salary is required';
        const maxSalary = parseFloat(value);
        const minSalary = parseFloat(formData.salary_min);
        if (isNaN(maxSalary) || maxSalary < 0) return 'Please enter a valid maximum salary';
        if (!isNaN(minSalary) && maxSalary < minSalary) return 'Maximum salary must be greater than minimum salary';
        return '';

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

    // Special validation for salary fields
    if (field === 'salary_min' && formData.salary_max) {
      const maxError = validateField('salary_max', formData.salary_max);
      setErrors(prev => ({ ...prev, salary_max: maxError }));
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
      // Prepare job data with proper types
      const jobData = {
        ...formData,
        salary_min: parseFloat(formData.salary_min),
        salary_max: parseFloat(formData.salary_max),
      };

      const result = await createJob.mutateAsync(jobData);

      // Reset form
      setFormData({
        title: '',
        description: '',
        client_id: preselectedClient || '',
        location: '',
        job_type: 'full_time',
        salary_min: '',
        salary_max: '',
        currency: 'SGD',
        requirements: '',
        benefits: '',
        status: 'draft',
        application_deadline: '',
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
      console.error('Failed to create job:', error);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      client_id: preselectedClient || '',
      location: '',
      job_type: 'full_time',
      salary_min: '',
      salary_max: '',
      currency: 'SGD',
      requirements: '',
      benefits: '',
      status: 'draft',
      application_deadline: '',
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

  // Get minimum date for deadline (tomorrow)
  const getMinDeadlineDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Job"
      description="Post a new job opportunity"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Display */}
        {error && (
          <ValidationErrorFallback
            errors={[error.message]}
            onDismiss={clearError}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Job Title */}
          <div className="md:col-span-2">
            <Input
              label="Job Title"
              placeholder="e.g. Senior Software Engineer"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              onBlur={() => handleBlur('title')}
              error={getFieldError('title')}
              required
            />
          </div>

          {/* Client Selection */}
          <div className="md:col-span-2">
            <Select
              label="Client"
              value={formData.client_id}
              onChange={(value) => handleChange('client_id', value)}
              onBlur={() => handleBlur('client_id')}
              error={getFieldError('client_id')}
              required
              options={[
                { label: 'Select a client...', value: '' },
                ...(clientsData?.clients || []).map(client => ({
                  label: client.name,
                  value: client.id.toString()
                }))
              ]}
            />
          </div>

          {/* Location */}
          <Input
            label="Location"
            placeholder="e.g. Singapore, Central Business District"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            onBlur={() => handleBlur('location')}
            error={getFieldError('location')}
            required
          />

          {/* Job Type */}
          <Select
            label="Job Type"
            value={formData.job_type}
            onChange={(value) => handleChange('job_type', value)}
            options={[
              { label: 'Full Time', value: 'full_time' },
              { label: 'Part Time', value: 'part_time' },
              { label: 'Contract', value: 'contract' },
              { label: 'Freelance', value: 'freelance' },
              { label: 'Internship', value: 'internship' },
              { label: 'Temporary', value: 'temporary' },
            ]}
          />

          {/* Salary Range */}
          <div className="flex gap-2">
            <Input
              label="Min Salary"
              type="number"
              placeholder="3000"
              value={formData.salary_min}
              onChange={(e) => handleChange('salary_min', e.target.value)}
              onBlur={() => handleBlur('salary_min')}
              error={getFieldError('salary_min')}
              required
            />
            <Input
              label="Max Salary"
              type="number"
              placeholder="5000"
              value={formData.salary_max}
              onChange={(e) => handleChange('salary_max', e.target.value)}
              onBlur={() => handleBlur('salary_max')}
              error={getFieldError('salary_max')}
              required
            />
          </div>

          {/* Currency */}
          <Select
            label="Currency"
            value={formData.currency}
            onChange={(value) => handleChange('currency', value)}
            options={[
              { label: 'SGD', value: 'SGD' },
              { label: 'USD', value: 'USD' },
              { label: 'MYR', value: 'MYR' },
              { label: 'EUR', value: 'EUR' },
              { label: 'GBP', value: 'GBP' },
            ]}
          />
        </div>

        {/* Job Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Job Description *
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            rows={4}
            placeholder="Describe the role, responsibilities, and what you're looking for..."
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            onBlur={() => handleBlur('description')}
          />
          {getFieldError('description') && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {getFieldError('description')}
            </p>
          )}
        </div>

        {/* Requirements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Requirements
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            rows={3}
            placeholder="List the key requirements and qualifications..."
            value={formData.requirements}
            onChange={(e) => handleChange('requirements', e.target.value)}
          />
        </div>

        {/* Benefits */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Benefits
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            rows={2}
            placeholder="What benefits and perks are offered?"
            value={formData.benefits}
            onChange={(e) => handleChange('benefits', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Application Deadline */}
          <Input
            label="Application Deadline"
            type="date"
            min={getMinDeadlineDate()}
            value={formData.application_deadline}
            onChange={(e) => handleChange('application_deadline', e.target.value)}
            onBlur={() => handleBlur('application_deadline')}
            error={getFieldError('application_deadline')}
            required
          />

          {/* Status */}
          <Select
            label="Status"
            value={formData.status}
            onChange={(value) => handleChange('status', value)}
            options={[
              { label: 'Draft', value: 'draft' },
              { label: 'Active', value: 'active' },
              { label: 'Paused', value: 'paused' },
            ]}
          />
        </div>

        {/* Form Actions */}
        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={createJob.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={createJob.isPending}
            disabled={hasErrors}
            icon={BriefcaseIcon}
          >
            Create Job
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}