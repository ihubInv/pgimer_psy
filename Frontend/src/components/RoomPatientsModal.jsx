import { FiX, FiUsers, FiFileText, FiUser } from 'react-icons/fi';
import Modal from './Modal';
import Button from './Button';
import { useGetPatientsByRoomQuery } from '../features/patients/patientsApiSlice';
import LoadingSpinner from './LoadingSpinner';
import { formatDate } from '../utils/formatters';
import { Link } from 'react-router-dom';

const RoomPatientsModal = ({ isOpen, onClose, roomNumber }) => {
  const { data, isLoading, error } = useGetPatientsByRoomQuery(roomNumber, {
    skip: !isOpen || !roomNumber,
  });

  const patients = data?.data?.patients || [];
  const count = data?.data?.count || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Patients in Room ${roomNumber}`} size="lg">
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            Failed to load patients
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FiUsers className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Patients</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
              </div>
            </div>

            {/* Patients List */}
            {patients.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FiUsers className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No patients assigned to this room today</p>
                <p className="text-sm mt-2">Patients registered today or with visits today will appear here</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Link
                            to={`/patients/${patient.id}`}
                            className="font-semibold text-gray-900 hover:text-primary-600 transition-colors"
                          >
                            {patient.name || 'N/A'}
                          </Link>
                          {patient.has_adl_file && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                              ADL
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">CR No:</span> {patient.cr_no || 'N/A'}
                          </div>
                          {patient.psy_no && (
                            <div>
                              <span className="font-medium">PSY No:</span> {patient.psy_no}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Age:</span> {patient.age || 'N/A'} / {patient.sex || 'N/A'}
                          </div>
                          {patient.assigned_doctor_name && (
                            <div className="flex items-center gap-1">
                              <FiUser className="w-3 h-3" />
                              <span className="font-medium">Doctor:</span> {patient.assigned_doctor_name}
                            </div>
                          )}
                        </div>
                        
                        {patient.created_at && (
                          <div className="mt-2 text-xs text-gray-500">
                            <FiFileText className="w-3 h-3 inline mr-1" />
                            Registered: {formatDate(patient.created_at)}
                          </div>
                        )}
                      </div>
                      
                      <Link
                        to={`/patients/${patient.id}`}
                        className="ml-4 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200 transition-colors"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

export default RoomPatientsModal;
