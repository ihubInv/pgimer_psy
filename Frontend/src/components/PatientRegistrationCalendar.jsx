import { useState } from 'react';
import { FiCalendar, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import Modal from './Modal';
import Button from './Button';
import { useGetRegistrationsByDateQuery } from '../features/patients/patientsApiSlice';
import LoadingSpinner from './LoadingSpinner';

const PatientRegistrationCalendar = ({ isOpen, onClose }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Calculate date range for the current month view
  const startDate = new Date(selectedYear, selectedMonth, 1);
  const endDate = new Date(selectedYear, selectedMonth + 1, 0);

  // Format dates as YYYY-MM-DD for API
  const startDateStr = startDate.toISOString().slice(0, 10);
  const endDateStr = endDate.toISOString().slice(0, 10);

  const { data, isLoading, error } = useGetRegistrationsByDateQuery(
    { start_date: startDateStr, end_date: endDateStr },
    { skip: !isOpen }
  );

  // Create a map of date -> count for quick lookup
  const registrationsMap = {};
  if (data?.data?.registrations) {
    data.data.registrations.forEach((item) => {
      const date = new Date(item.registration_date).toISOString().slice(0, 10);
      registrationsMap[date] = parseInt(item.patient_count, 10);
    });
  }

  // Get days in month
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();

  // Navigate months
  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  // Get day count for a specific date
  const getPatientCount = (day) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return registrationsMap[dateStr] || 0;
  };

  // Check if a date is today
  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      selectedMonth === today.getMonth() &&
      selectedYear === today.getFullYear()
    );
  };

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Day names (short)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Patient Registration Calendar" size="lg">
      <div className="space-y-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <FiChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
              {monthNames[selectedMonth]} {selectedYear}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <FiChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-sm"
          >
            Today
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            Failed to load registration data
          </div>
        ) : (
          <>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-gray-600 py-2"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const count = getPatientCount(day);
                const today = isToday(day);

                return (
                  <div
                    key={day}
                    className={`
                      aspect-square border-2 rounded-lg p-2 flex flex-col items-center justify-center
                      ${today ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}
                      ${count > 0 ? 'bg-blue-50' : 'bg-white'}
                      transition-colors cursor-pointer
                    `}
                    title={count > 0 ? `${count} patient${count > 1 ? 's' : ''} registered on ${day}/${selectedMonth + 1}/${selectedYear}` : 'No registrations'}
                  >
                    <span className={`text-sm font-medium ${today ? 'text-primary-700' : 'text-gray-700'}`}>
                      {day}
                    </span>
                    {count > 0 && (
                      <span className="text-xs font-bold text-blue-600 mt-1">
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-500 bg-primary-50 rounded"></div>
                <span className="text-sm text-gray-600">Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-200 bg-blue-50 rounded"></div>
                <span className="text-sm text-gray-600">Has Registrations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-200 bg-white rounded"></div>
                <span className="text-sm text-gray-600">No Registrations</span>
              </div>
            </div>

            {/* Summary */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Total patients registered in {monthNames[selectedMonth]} {selectedYear}:{' '}
                <span className="font-semibold text-gray-900">
                  {data?.data?.registrations?.reduce((sum, item) => sum + parseInt(item.patient_count, 10), 0) || 0}
                </span>
              </p>
            </div>
          </>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            <FiX className="mr-2" />
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PatientRegistrationCalendar;
