/**
 * Job Form Fields Component
 * All form input fields for the Add Job modal
 */

import Input from '../ui/Input';
import Select from '../ui/Select';

export default function JobFormFields({ formData, handleChange, handleBlur, getFieldError, clientsData, getMinDeadlineDate }) {
  return (
    <>
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
    </>
  );
}
