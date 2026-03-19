/**
 * Add Job Modal Component
 * Orchestrator shell that composes JobFormFields and useJobFormValidation for job creation
 */

import { useState, useEffect } from 'react';
import { BriefcaseIcon } from 'lucide-react';
import Modal, { ModalFooter } from '../ui/Modal';
import Button from '../ui/Button';
import { useCreateJob } from '../../shared/hooks/useJobs';
import { useClients } from '../hooks/useClients';
import { useFormErrorHandler } from '../../shared/hooks/useErrorHandler';
import { ValidationErrorFallback } from '../../shared/components/ErrorFallbacks';
import JobFormFields from './JobFormFields';
import useJobFormValidation from './JobFormValidation';

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

  const createJob = useCreateJob();
  const { data: clientsData } = useClients({ limit: 100 }); // Get all clients for dropdown
  const { error, clearError } = useFormErrorHandler();

  const {
    handleBlur,
    clearFieldError,
    revalidateField,
    validateForm,
    resetValidation,
    getFieldError,
    hasErrors,
    getMinDeadlineDate,
  } = useJobFormValidation(formData);

  // Update client_id when preselectedClient changes
  useEffect(() => {
    if (preselectedClient) {
      setFormData(prev => ({ ...prev, client_id: preselectedClient }));
    }
  }, [preselectedClient]);

  /**
   * Handle field changes with validation
   */
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    clearFieldError(field);

    if (error) {
      clearError();
    }

    // Special validation for salary fields
    if (field === 'salary_min' && formData.salary_max) {
      revalidateField('salary_max');
    }
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
      resetValidation();

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result);
      }

      // Close modal
      onClose();
    } catch (error) {
      // Failed to create job
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
    resetValidation();
    clearError();
    onClose();
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

        <JobFormFields
          formData={formData}
          handleChange={handleChange}
          handleBlur={handleBlur}
          getFieldError={getFieldError}
          clientsData={clientsData}
          getMinDeadlineDate={getMinDeadlineDate}
        />

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
