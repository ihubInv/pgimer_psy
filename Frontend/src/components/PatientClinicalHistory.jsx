import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiUser, FiFileText, FiPlus, FiEye, FiClock, FiMapPin } from 'react-icons/fi';
import Card from './Card';
import Button from './Button';
// Format date helper function
const formatDate = (dateString) => {
  if (!dateString) return 'Date not available';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (error) {
    return 'Date not available';
  }
};

const PatientClinicalHistory = ({ 
  patient, 
  visitHistory = [], 
  clinicalProformas = [], 
  onAddNewProforma,
  isLoading = false 
}) => {
  const navigate = useNavigate();

  const hasHistory = visitHistory.length > 0 || clinicalProformas.length > 0;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading patient history...</span>
        </div>
      </Card>
    );
  }

  // If patient has no history, show message and button to add first proforma
  if (!hasHistory) {
    return (
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiFileText className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">New Patient - First Visit</h3>
          <p className="text-gray-600 mb-6">
            This is a new patient with no previous visit history. You can create their first walk-in clinical proforma.
          </p>
          <Button
            onClick={onAddNewProforma}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 px-6 py-3 rounded-md flex items-center gap-2 mx-auto hover:from-blue-600 hover:to-blue-700 hover:shadow-xl hover:shadow-blue-500/40"
          >
            <FiPlus className="w-5 h-5" />
            Create First Walk-in Clinical Proforma
          </Button>
        </div>
      </Card>
    );
  }

  // Patient has history - show it
  return (
    <div className="space-y-6">
      {/* Header with Add New Button */}
      {/* <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Patient Visit History
            </h2>
            <p className="text-gray-600">
              {patient?.name || 'Patient'} - {patient?.cr_no || 'N/A'}
            </p>
          </div>
          <Button
            onClick={onAddNewProforma}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 px-6 py-3 rounded-md flex items-center gap-2 hover:from-green-600 hover:to-emerald-700 hover:shadow-xl hover:shadow-green-500/40"
          >
            <FiPlus className="w-5 h-5" />
            Add New Proforma
          </Button>
        </div>
      </Card> */}

      {/* Visit History Section */}
      {/* {visitHistory.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiCalendar className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">Visit History</h3>
            <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {visitHistory.length} {visitHistory.length === 1 ? 'Visit' : 'Visits'}
            </span>
          </div>
          
          <div className="space-y-4">
            {visitHistory.map((visit, index) => (
              <div
                key={visit.id || index}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold text-gray-900">
                          {formatDate(visit.visit_date)}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        visit.visit_type === 'first_visit' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {visit.visit_type === 'first_visit' ? 'First Visit' : 'Follow-up'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        visit.visit_status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : visit.visit_status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {visit.visit_status || 'Scheduled'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {visit.doctor_name && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiUser className="w-4 h-4" />
                          <span>Doctor: <span className="font-medium text-gray-800">{visit.doctor_name}</span></span>
                        </div>
                      )}
                      {visit.room_no && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiMapPin className="w-4 h-4" />
                          <span>Room: <span className="font-medium text-gray-800">{visit.room_no}</span></span>
                        </div>
                      )}
                      {visit.notes && (
                        <div className="flex items-start gap-2 text-sm text-gray-600 md:col-span-2">
                          <FiFileText className="w-4 h-4 mt-0.5" />
                          <span className="italic">{visit.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )} */}

      {/* Clinical Proformas Section */}
      {/* {clinicalProformas.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FiFileText className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">Previous Walk-in Clinical Proformas</h3>
            <span className="ml-auto px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {clinicalProformas.length} {clinicalProformas.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
          
          <div className="space-y-4">
            {clinicalProformas.map((proforma, index) => (
              <div
                key={proforma.id || index}
                className="border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold text-gray-900">
                          {formatDate(proforma.visit_date)}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        proforma.visit_type === 'first_visit' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {proforma.visit_type === 'first_visit' ? 'First Visit' : 'Follow-up'}
                      </span>
                      {proforma.doctor_decision && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          proforma.doctor_decision === 'complex_case' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {proforma.doctor_decision === 'complex_case' 
                            ? 'Complex Case' 
                            : 'Simple Case'}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {proforma.doctor_name && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiUser className="w-4 h-4" />
                          <span>Doctor: <span className="font-medium text-gray-800">{proforma.doctor_name}</span></span>
                        </div>
                      )}
                      {proforma.room_no && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiMapPin className="w-4 h-4" />
                          <span>Room: <span className="font-medium text-gray-800">{proforma.room_no}</span></span>
                        </div>
                      )}
                      {proforma.diagnosis && (
                        <div className="flex items-start gap-2 text-sm text-gray-600 md:col-span-2">
                          <FiFileText className="w-4 h-4 mt-0.5" />
                          <span><span className="font-medium text-gray-800">Diagnosis:</span> {proforma.diagnosis}</span>
                        </div>
                      )}
                      {proforma.icd_code && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiFileText className="w-4 h-4" />
                          <span><span className="font-medium text-gray-800">ICD Code:</span> {proforma.icd_code}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/clinical/${proforma.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
                    >
                      <FiEye className="w-3.5 h-3.5" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )} */}

      {/* Empty state if no history but patient exists */}
      {!hasHistory && (
        <Card className="p-6 bg-gray-50">
          <div className="text-center py-8">
            <p className="text-gray-600">No visit history or clinical proformas found for this patient.</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PatientClinicalHistory;

