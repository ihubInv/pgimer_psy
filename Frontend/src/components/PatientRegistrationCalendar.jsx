import { useState, useMemo } from 'react';
import { FiCalendar, FiX, FiChevronLeft, FiChevronRight, FiUser, FiClock, FiMapPin, FiHome } from 'react-icons/fi';
import Modal from './Modal';
import Button from './Button';
import Badge from './Badge';
import LoadingSpinner from './LoadingSpinner';
import { useGetRegistrationsByDateQuery, useGetPatientsByRegistrationDateQuery } from '../features/patients/patientsApiSlice';
import { formatDateTime } from '../utils/formatters';

// Patient List Modal Component
const PatientListModal = ({ isOpen, onClose, date, dateFormatted }) => {
  const { data, isLoading, error } = useGetPatientsByRegistrationDateQuery(date, {
    skip: !isOpen || !date,
  });

  const patients = data?.data?.patients || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Patients Registered on ${dateFormatted}`} size="lg">
      <div className="flex flex-col" style={{ maxHeight: 'calc(80vh - 120px)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            <p>Failed to load patient data</p>
            <p className="text-sm mt-2 text-gray-500">{error?.data?.message || 'Unknown error occurred'}</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FiUser className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No Patients Registered</p>
            <p className="text-sm mt-1">No patients were registered on this date.</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiUser className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Registrations</p>
                  <p className="text-2xl font-bold text-blue-700">{patients.length}</p>
                </div>
              </div>
            </div>

            {/* Patient List - Scrollable */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-0" style={{ maxHeight: 'calc(80vh - 280px)' }}>
              {patients.map((patient, index) => (
                <div
                  key={patient.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg shadow-sm shrink-0">
                        <FiUser className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{patient.name || 'N/A'}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">CR No:</span> {patient.cr_no || 'N/A'}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {patient.age && (
                            <Badge variant="info" className="text-xs">
                              Age: {patient.age}
                            </Badge>
                          )}
                          {patient.sex && (
                            <Badge variant={patient.sex === 'M' || patient.sex === 'Male' ? 'primary' : 'secondary'} className="text-xs">
                              {patient.sex === 'M' ? 'Male' : patient.sex === 'F' ? 'Female' : patient.sex}
                            </Badge>
                          )}
                          {patient.locality && (
                            <Badge variant={patient.locality === 'Urban' ? 'success' : 'warning'} className="text-xs">
                              {patient.locality}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm shrink-0">
                      <div className="flex items-center gap-1 text-gray-500">
                        <FiClock className="w-3 h-3" />
                        <span>{patient.created_at ? new Date(patient.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {patient.room_no && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiHome className="w-4 h-4 text-gray-400" />
                        <span>Room: {patient.room_no}</span>
                      </div>
                    )}
                    {(patient.district || patient.state) && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiMapPin className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{[patient.district, patient.state].filter(Boolean).join(', ') || 'N/A'}</span>
                      </div>
                    )}
                    {patient.assigned_doctor_name && (
                      <div className="col-span-1 sm:col-span-2 flex items-center gap-2 text-gray-600">
                        <FiUser className="w-4 h-4 text-gray-400" />
                        <span>Dr. {patient.assigned_doctor_name} ({patient.assigned_doctor_role || 'Doctor'})</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200 mt-4 shrink-0">
          <Button variant="outline" onClick={onClose}>
            <FiX className="mr-2" />
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const PatientRegistrationCalendar = ({ isOpen, onClose }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDateForPatients, setSelectedDateForPatients] = useState(null);

  // Calculate date range for the current month view
  const startDate = new Date(selectedYear, selectedMonth, 1);
  const endDate = new Date(selectedYear, selectedMonth + 1, 0);

  // Format dates as YYYY-MM-DD for API (using local date)
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const startDateStr = formatDateLocal(startDate);
  const endDateStr = formatDateLocal(endDate);

  // Fetch with polling for real-time updates (every 30 seconds)
  const { data, isLoading, error } = useGetRegistrationsByDateQuery(
    { start_date: startDateStr, end_date: endDateStr },
    { 
      skip: !isOpen,
      pollingInterval: isOpen ? 30000 : 0, // Poll every 30 seconds when open
      refetchOnMountOrArgChange: true,
    }
  );

  // Create a map of date -> count for quick lookup (using YYYY-MM-DD format)
  const registrationsMap = useMemo(() => {
    const map = {};
    if (data?.data?.registrations) {
      data.data.registrations.forEach((item) => {
        // Parse the registration_date and format consistently
        const regDate = new Date(item.registration_date);
        const dateKey = formatDateLocal(regDate);
        map[dateKey] = parseInt(item.patient_count, 10);
      });
    }
    return map;
  }, [data]);

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

  // Handle date click
  const handleDateClick = (day) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateForPatients(dateStr);
  };

  // Format date for display
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  // Calculate total registrations for the month
  const totalMonthRegistrations = useMemo(() => {
    if (!data?.data?.registrations) return 0;
    return data.data.registrations.reduce((sum, item) => sum + parseInt(item.patient_count, 10), 0);
  }, [data]);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Patient Registration Calendar" size="xl">
        <div className="flex flex-col" style={{ height: 'calc(85vh - 120px)', maxHeight: '700px' }}>
          {/* Calendar Header - Fixed */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FiChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 min-w-[160px] sm:min-w-[200px] text-center">
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
            <div className="flex-1 flex items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-red-600">
              <div className="text-center">
                <p>Failed to load registration data</p>
                <p className="text-sm mt-2 text-gray-500">{error?.data?.message || 'Unknown error occurred'}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Calendar Grid - Scrollable Container */}
              <div className="flex-1 overflow-auto min-h-0">
                <div className="min-w-[280px]">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2 sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-2">
                    {dayNames.map((day) => (
                      <div
                        key={day}
                        className="text-center text-xs sm:text-sm font-semibold text-gray-600 py-1"
                      >
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{day.charAt(0)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days Grid */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {calendarDays.map((day, index) => {
                      if (day === null) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                      }

                      const count = getPatientCount(day);
                      const today = isToday(day);

                      return (
                        <div
                          key={day}
                          onClick={() => handleDateClick(day)}
                          className={`
                            aspect-square border-2 rounded-lg p-1 sm:p-2 flex flex-col items-center justify-center
                            ${today ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' : 'border-gray-200 hover:border-gray-300'}
                            ${count > 0 ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white hover:bg-gray-50'}
                            transition-all duration-200 cursor-pointer hover:shadow-md active:scale-95
                          `}
                          title={count > 0 ? `${count} patient${count > 1 ? 's' : ''} registered - Click to view` : 'Click to view details'}
                        >
                          <span className={`text-xs sm:text-sm font-medium ${today ? 'text-primary-700' : 'text-gray-700'}`}>
                            {day}
                          </span>
                          {count > 0 && (
                            <span className="text-[10px] sm:text-xs font-bold text-blue-600 mt-0.5 sm:mt-1 bg-blue-100 px-1 sm:px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Legend - Fixed at bottom */}
              <div className="shrink-0 pt-3 mt-3 border-t border-gray-200">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-primary-500 bg-primary-50 rounded ring-2 ring-primary-200"></div>
                    <span className="text-xs sm:text-sm text-gray-600">Today</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-200 bg-blue-50 rounded"></div>
                    <span className="text-xs sm:text-sm text-gray-600">Has Registrations</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-200 bg-white rounded"></div>
                    <span className="text-xs sm:text-sm text-gray-600">No Registrations</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-600 mt-2">
                  <FiUser className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Click any date to view patients</span>
                </div>
              </div>

              {/* Summary */}
              <div className="shrink-0 pt-3 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-sm text-gray-600">
                    Total patients in {monthNames[selectedMonth]} {selectedYear}:{' '}
                    <span className="font-bold text-gray-900 text-lg">
                      {totalMonthRegistrations}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Real-time updates enabled</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-3 border-t border-gray-200 mt-3 shrink-0">
            <Button variant="outline" onClick={onClose}>
              <FiX className="mr-2" />
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Patient List Modal */}
      <PatientListModal
        isOpen={!!selectedDateForPatients}
        onClose={() => setSelectedDateForPatients(null)}
        date={selectedDateForPatients}
        dateFormatted={formatDateForDisplay(selectedDateForPatients)}
      />
    </>
  );
};

export default PatientRegistrationCalendar;
