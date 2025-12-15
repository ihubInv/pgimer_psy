import { useState, useEffect } from 'react';
import { FiCalendar, FiX } from 'react-icons/fi';
import Modal from './Modal';
import Button from './Button';
import CustomDatePicker from './CustomDatePicker';

const ExportDateRangeModal = ({ isOpen, onClose, onExport }) => {
  const [dateRangeType, setDateRangeType] = useState('all'); // 'all', 'monthly', 'last6months', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDateRangeType('all');
      setStartDate('');
      setEndDate('');
    }
  }, [isOpen]);

  // Helper function to get date range based on type
  const getDateRange = (type) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (type) {
      case 'monthly': {
        // Last month (first day of last month to last day of last month)
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start: firstDayLastMonth.toISOString().split('T')[0],
          end: lastDayLastMonth.toISOString().split('T')[0],
        };
      }
      case 'last6months': {
        // Last 6 months from today
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        return {
          start: sixMonthsAgo.toISOString().split('T')[0],
          end: todayStr,
        };
      }
      case 'custom': {
        if (!startDate || !endDate) {
          return null;
        }
        return {
          start: startDate,
          end: endDate,
        };
      }
      case 'all':
      default:
        return null; // null means export all
    }
  };

  const handleExport = () => {
    if (dateRangeType === 'custom' && (!startDate || !endDate)) {
      return; // Validation will be handled by disabled state
    }

    if (dateRangeType === 'custom' && startDate > endDate) {
      return; // Validation will be handled by disabled state
    }

    const dateRange = getDateRange(dateRangeType);
    onExport(dateRange);
    onClose();
  };

  const isExportDisabled = () => {
    if (dateRangeType === 'custom') {
      return !startDate || !endDate || startDate > endDate;
    }
    return false;
  };

  const getDateRangeDescription = () => {
    switch (dateRangeType) {
      case 'all':
        return 'Export all patients regardless of date';
      case 'monthly': {
        const range = getDateRange('monthly');
        return `Export patients from ${new Date(range.start).toLocaleDateString('en-IN')} to ${new Date(range.end).toLocaleDateString('en-IN')}`;
      }
      case 'last6months': {
        const range = getDateRange('last6months');
        return `Export patients from ${new Date(range.start).toLocaleDateString('en-IN')} to ${new Date(range.end).toLocaleDateString('en-IN')}`;
      }
      case 'custom':
        if (startDate && endDate) {
          return `Export patients from ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`;
        }
        return 'Select start and end dates';
      default:
        return '';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Date Range Selection"
      size="md"
      closeOnOverlayClick={true}
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          Select a date range option for exporting patient data. The export will include patients created or with visits within the selected date range.
        </p>

        {/* Date Range Type Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Select Date Range Option
          </label>
          
          <div className="grid grid-cols-2 gap-3">
            {/* All Patients */}
            <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 hover:border-primary-300"
              style={{
                borderColor: dateRangeType === 'all' ? '#3b82f6' : '#e5e7eb',
                backgroundColor: dateRangeType === 'all' ? '#eff6ff' : 'transparent',
              }}
            >
              <input
                type="radio"
                name="dateRangeType"
                value="all"
                checked={dateRangeType === 'all'}
                onChange={(e) => setDateRangeType(e.target.value)}
                className="mr-2 w-4 h-4 text-primary-600 focus:ring-primary-500 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">All Patients</div>
                <div className="text-xs text-gray-500 truncate">Export all patients</div>
              </div>
            </label>

            {/* Last Month */}
            <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 hover:border-primary-300"
              style={{
                borderColor: dateRangeType === 'monthly' ? '#3b82f6' : '#e5e7eb',
                backgroundColor: dateRangeType === 'monthly' ? '#eff6ff' : 'transparent',
              }}
            >
              <input
                type="radio"
                name="dateRangeType"
                value="monthly"
                checked={dateRangeType === 'monthly'}
                onChange={(e) => setDateRangeType(e.target.value)}
                className="mr-2 w-4 h-4 text-primary-600 focus:ring-primary-500 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">Last Month</div>
                <div className="text-xs text-gray-500 truncate">
                  {(() => {
                    const range = getDateRange('monthly');
                    return `${new Date(range.start).toLocaleDateString('en-IN')} - ${new Date(range.end).toLocaleDateString('en-IN')}`;
                  })()}
                </div>
              </div>
            </label>

            {/* Last 6 Months */}
            <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 hover:border-primary-300"
              style={{
                borderColor: dateRangeType === 'last6months' ? '#3b82f6' : '#e5e7eb',
                backgroundColor: dateRangeType === 'last6months' ? '#eff6ff' : 'transparent',
              }}
            >
              <input
                type="radio"
                name="dateRangeType"
                value="last6months"
                checked={dateRangeType === 'last6months'}
                onChange={(e) => setDateRangeType(e.target.value)}
                className="mr-2 w-4 h-4 text-primary-600 focus:ring-primary-500 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">Last 6 Months</div>
                <div className="text-xs text-gray-500 truncate">
                  {(() => {
                    const range = getDateRange('last6months');
                    return `${new Date(range.start).toLocaleDateString('en-IN')} - ${new Date(range.end).toLocaleDateString('en-IN')}`;
                  })()}
                </div>
              </div>
            </label>

            {/* Custom Date Range */}
            <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 hover:border-primary-300"
              style={{
                borderColor: dateRangeType === 'custom' ? '#3b82f6' : '#e5e7eb',
                backgroundColor: dateRangeType === 'custom' ? '#eff6ff' : 'transparent',
              }}
            >
              <input
                type="radio"
                name="dateRangeType"
                value="custom"
                checked={dateRangeType === 'custom'}
                onChange={(e) => setDateRangeType(e.target.value)}
                className="mr-2 w-4 h-4 text-primary-600 focus:ring-primary-500 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">Custom Range</div>
                <div className="text-xs text-gray-500 truncate">Select dates</div>
              </div>
            </label>
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {dateRangeType === 'custom' && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200 overflow-visible">
            <div className="grid grid-cols-2 gap-4 relative" style={{ zIndex: 1 }}>
              <div className="relative" style={{ zIndex: 100 }}>
                <CustomDatePicker
                  label="Start Date"
                  name="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required={dateRangeType === 'custom'}
                  max={endDate || new Date().toISOString().split('T')[0]}
                  icon={<FiCalendar className="w-4 h-4" />}
                  dropdownZIndex={1000000}
                />
              </div>
              <div className="relative" style={{ zIndex: 100 }}>
                <CustomDatePicker
                  label="End Date"
                  name="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required={dateRangeType === 'custom'}
                  min={startDate}
                  max={new Date().toISOString().split('T')[0]}
                  icon={<FiCalendar className="w-4 h-4" />}
                  dropdownZIndex={1000000}
                />
              </div>
            </div>
            {startDate && endDate && startDate > endDate && (
              <p className="text-sm text-red-600">Start date must be before or equal to end date</p>
            )}
          </div>
        )}

        {/* Date Range Description */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">
            <FiCalendar className="inline mr-2" />
            {getDateRangeDescription()}
          </p>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExportDisabled()}
            className="bg-primary-600 hover:bg-primary-700"
          >
            Export Patients
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportDateRangeModal;

