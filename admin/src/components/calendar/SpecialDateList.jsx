import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { OVERRIDE_TYPES } from './SpecialDateForm';

/**
 * Get type configuration for a special date type
 */
const getTypeConfig = (type) => {
  return OVERRIDE_TYPES.find(t => t.value === type) || OVERRIDE_TYPES[0];
};

/**
 * SpecialDateList - Displays list of configured special dates with edit/delete actions
 */
const SpecialDateList = ({ dates, onEdit, onDelete }) => {
  return (
    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">
        Special Dates ({dates.length})
      </h4>

      {dates.length > 0 ? (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {dates
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(dateItem => {
              const typeConfig = getTypeConfig(dateItem.type);
              return (
                <div
                  key={dateItem.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {dateItem.title}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {format(parseISO(dateItem.date), 'EEEE, MMMM dd, yyyy')}
                    </div>
                    {dateItem.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {dateItem.description}
                      </div>
                    )}
                    {dateItem.customHours?.length > 0 && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Custom hours: {dateItem.customHours.map(h => `${h.start}-${h.end}`).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(dateItem)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(dateItem.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No special dates configured
        </div>
      )}
    </div>
  );
};

export default SpecialDateList;
