import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { format, addDays } from 'date-fns';
import ExportOptions, { EXPORT_FORMATS, EXPORT_RANGES } from './ExportOptions';
import ExportPreview from './ExportPreview';

const CalendarExport = ({
  isOpen,
  onClose,
  interviews = [],
  availability = [],
  className = ''
}) => {
  const [selectedFormat, setSelectedFormat] = useState('ics');
  const [selectedRange, setSelectedRange] = useState('week');
  const [includeAvailability, setIncludeAvailability] = useState(false);
  const [includePrivateInfo, setIncludePrivateInfo] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);

      const exportData = {
        format: selectedFormat,
        range: selectedRange,
        includeAvailability,
        includePrivateInfo,
        emailAddress: selectedFormat === 'email' ? emailAddress : undefined
      };

      if (selectedFormat === 'ics') {
        await exportToCalendar(exportData);
      } else if (selectedFormat === 'csv') {
        await exportToCSV(exportData);
      } else if (selectedFormat === 'json') {
        await exportToJSON(exportData);
      } else if (selectedFormat === 'email') {
        await sendEmailSummary(exportData);
      }

      onClose();
    } catch (error) {
      // Export failed - error state could be added here for UI feedback
    } finally {
      setLoading(false);
    }
  };

  const exportToCalendar = async (exportData) => {
    const filteredInterviews = filterInterviewsByRange(interviews, exportData.range);

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WorkLink//Interview Calendar//EN',
      'CALSCALE:GREGORIAN'
    ];

    filteredInterviews.forEach(interview => {
      const startDate = new Date(interview.scheduled_datetime);
      const endDate = new Date(startDate.getTime() + (interview.duration || 30) * 60000);

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:interview-${interview.id}@worklink.com`,
        `DTSTART:${formatDateForICS(startDate)}`,
        `DTEND:${formatDateForICS(endDate)}`,
        `SUMMARY:Interview - ${interview.candidate_name}`,
        `DESCRIPTION:Interview with ${interview.candidate_name}${interview.candidate_email ? ` (${interview.candidate_email})` : ''}${interview.notes ? `\\n\\nNotes: ${interview.notes}` : ''}`,
        `LOCATION:${interview.meeting_link || 'Video Call'}`,
        `STATUS:${interview.status.toUpperCase()}`,
        'END:VEVENT'
      );
    });

    if (exportData.includeAvailability) {
      const filteredAvailability = filterAvailabilityByRange(availability, exportData.range);

      filteredAvailability.forEach((slot, index) => {
        const startDate = new Date(slot.datetime);
        const endDate = new Date(startDate.getTime() + 60 * 60000);

        icsContent.push(
          'BEGIN:VEVENT',
          `UID:availability-${index}@worklink.com`,
          `DTSTART:${formatDateForICS(startDate)}`,
          `DTEND:${formatDateForICS(endDate)}`,
          'SUMMARY:Available for Interviews',
          'DESCRIPTION:Available time slot for scheduling interviews',
          'TRANSP:TRANSPARENT',
          'END:VEVENT'
        );
      });
    }

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar' });
    downloadFile(blob, `interview-calendar-${format(new Date(), 'yyyy-MM-dd')}.ics`);
  };

  const exportToCSV = async (exportData) => {
    const filteredInterviews = filterInterviewsByRange(interviews, exportData.range);

    const headers = [
      'Date',
      'Time',
      'Candidate Name',
      exportData.includePrivateInfo ? 'Email' : null,
      'Duration (min)',
      'Type',
      'Status',
      'Meeting Link',
      'Notes'
    ].filter(Boolean);

    const rows = filteredInterviews.map(interview => [
      format(new Date(interview.scheduled_datetime), 'yyyy-MM-dd'),
      format(new Date(interview.scheduled_datetime), 'HH:mm'),
      interview.candidate_name,
      exportData.includePrivateInfo ? interview.candidate_email : null,
      interview.duration || 30,
      interview.interview_type || 'video',
      interview.status,
      interview.meeting_link || '',
      interview.notes || ''
    ].filter((_, index) => headers[index] !== null));

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadFile(blob, `interview-schedule-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const exportToJSON = async (exportData) => {
    const filteredInterviews = filterInterviewsByRange(interviews, exportData.range);

    const jsonData = {
      exported_at: new Date().toISOString(),
      range: exportData.range,
      total_interviews: filteredInterviews.length,
      interviews: filteredInterviews.map(interview => ({
        id: interview.id,
        candidate_name: interview.candidate_name,
        candidate_email: exportData.includePrivateInfo ? interview.candidate_email : undefined,
        scheduled_datetime: interview.scheduled_datetime,
        duration_minutes: interview.duration || 30,
        interview_type: interview.interview_type,
        status: interview.status,
        meeting_link: interview.meeting_link,
        notes: interview.notes
      }))
    };

    if (exportData.includeAvailability) {
      jsonData.availability = filterAvailabilityByRange(availability, exportData.range);
    }

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    downloadFile(blob, `interview-data-${format(new Date(), 'yyyy-MM-dd')}.json`);
  };

  const sendEmailSummary = async (exportData) => {
    const response = await fetch('/api/v1/interview-scheduling/export/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailAddress: exportData.emailAddress,
        range: exportData.range,
        includeAvailability: exportData.includeAvailability,
        includePrivateInfo: exportData.includePrivateInfo
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }
  };

  const filterInterviewsByRange = (interviews, range) => {
    const today = new Date();
    const rangeConfig = EXPORT_RANGES.find(r => r.id === range);
    const endDate = addDays(today, rangeConfig.days);

    return interviews.filter(interview => {
      const interviewDate = new Date(interview.scheduled_datetime);
      return interviewDate >= today && (rangeConfig.days === 0 ?
        interviewDate.toDateString() === today.toDateString() :
        interviewDate <= endDate
      );
    });
  };

  const filterAvailabilityByRange = (availability, range) => {
    const today = new Date();
    const rangeConfig = EXPORT_RANGES.find(r => r.id === range);
    const endDate = addDays(today, rangeConfig.days);

    return availability.filter(slot => {
      const slotDate = new Date(slot.datetime);
      return slotDate >= today && (rangeConfig.days === 0 ?
        slotDate.toDateString() === today.toDateString() :
        slotDate <= endDate
      );
    });
  };

  const formatDateForICS = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const selectedFormatConfig = EXPORT_FORMATS.find(f => f.id === selectedFormat);
  const filteredCount = filterInterviewsByRange(interviews, selectedRange).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Export Calendar
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>

          <ExportOptions
            selectedFormat={selectedFormat}
            setSelectedFormat={setSelectedFormat}
            selectedRange={selectedRange}
            setSelectedRange={setSelectedRange}
            includeAvailability={includeAvailability}
            setIncludeAvailability={setIncludeAvailability}
            includePrivateInfo={includePrivateInfo}
            setIncludePrivateInfo={setIncludePrivateInfo}
            emailAddress={emailAddress}
            setEmailAddress={setEmailAddress}
            filteredCount={filteredCount}
          />

          <ExportPreview
            onClose={onClose}
            onExport={handleExport}
            loading={loading}
            selectedFormat={selectedFormat}
            emailAddress={emailAddress}
            formatLabel={selectedFormatConfig?.label}
          />
        </div>
      </div>
    </div>
  );
};

export default CalendarExport;
