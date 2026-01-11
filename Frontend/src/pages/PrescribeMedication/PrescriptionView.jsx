
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { useGetPrescriptionByIdQuery, useGetPrescriptionsByPatientIdQuery } from '../../features/prescriptions/prescriptionApiSlice';
import { useGetClinicalProformaByIdQuery } from '../../features/clinical/clinicalApiSlice';
import { useGetPatientByIdQuery } from '../../features/patients/patientsApiSlice';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { FiPackage, FiUser, FiEdit, FiPrinter, FiFileText, FiArrowLeft, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import LoadingSpinner from '../../components/LoadingSpinner';
import { isAdmin, isJrSr } from '../../utils/constants';

const PrescriptionView = ({ prescription: prescriptionProp, clinicalProformaId: clinicalProformaIdProp, patientId: patientIdProp, visitDate: visitDateProp }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Use prop if provided, otherwise get from searchParams
  const clinicalProformaId = clinicalProformaIdProp || searchParams.get('clinical_proforma_id');
  const patientId = patientIdProp || searchParams.get('patient_id');
  const returnTab = searchParams.get('returnTab');
  
  const currentUser = useSelector(selectCurrentUser);
 
  // Helper function to convert date to IST date string (YYYY-MM-DD)
  const toISTDateString = (dateInput) => {
    try {
      if (!dateInput) return '';
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
    } catch (_) {
      return '';
    }
  };

  // Fetch proforma data if clinicalProformaId is available
  const { data: proformaData, isLoading: loadingProforma } = useGetClinicalProformaByIdQuery(
    clinicalProformaId,
    { skip: !clinicalProformaId }
  );

  const proforma = proformaData?.data?.proforma;

  // Fetch patient data
  const { data: patientData, isLoading: loadingPatient } = useGetPatientByIdQuery(
    patientId,
    { skip: !patientId }
  );

  // Fetch prescriptions data by clinical_proforma_id (if available)
  const { data: prescriptionsData, isLoading: loadingPrescriptionsByProforma } = useGetPrescriptionByIdQuery(
    { clinical_proforma_id: clinicalProformaId },
    { skip: !clinicalProformaId }
  );

  // Also fetch prescriptions by patient_id (for prescriptions without clinical_proforma_id)
  const { data: patientPrescriptionsData, isLoading: loadingPrescriptionsByPatient } = useGetPrescriptionsByPatientIdQuery(
    patientId,
    { skip: !patientId || !!clinicalProformaId } // Skip if we have a proforma ID (prefer proforma-based fetch)
  );

  const loadingPrescriptions = loadingPrescriptionsByProforma || loadingPrescriptionsByPatient;

  
  const prescriptionData = prescriptionsData?.data?.prescription;
  
  // Combine prescriptions from both sources
  const prescriptions = useMemo(() => {
    // If prescription prop is provided, use it
    if (prescriptionProp) {
      return Array.isArray(prescriptionProp) ? prescriptionProp : [prescriptionProp];
    }
    
    // If we have prescriptions from proforma query, use them
    if (prescriptionData?.prescription && prescriptionData.prescription.length > 0) {
      return prescriptionData.prescription;
    }
    
    // Otherwise, try to get prescriptions from patient-level query
    const patientPrescriptions = patientPrescriptionsData?.data?.prescriptions || [];
    if (patientPrescriptions.length > 0) {
      // If visitDate is provided, filter to only prescriptions from that date
      const visitDateStr = visitDateProp ? toISTDateString(visitDateProp) : null;
      
      let allPrescriptionItems = [];
      patientPrescriptions.forEach(prescRecord => {
        if (prescRecord.prescription && Array.isArray(prescRecord.prescription)) {
          // If we have a visit date, filter by date
          if (visitDateStr) {
            const prescDateStr = toISTDateString(prescRecord.visit_date || prescRecord.created_at);
            if (prescDateStr === visitDateStr) {
              allPrescriptionItems.push(...prescRecord.prescription);
            }
          } else {
            // No date filter, include all
            allPrescriptionItems.push(...prescRecord.prescription);
          }
        }
      });
      return allPrescriptionItems;
    }
    
    return [];
  }, [prescriptionProp, prescriptionData, patientPrescriptionsData, visitDateProp]);

  



  if (loadingProforma || loadingPatient || loadingPrescriptions) {
    return <LoadingSpinner />;
  }

  if (!proforma && !patientId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <FiFileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Walk-in Clinical Proforma Not Found</h2>
          <p className="text-gray-600 mb-6">Please provide a clinical proforma ID or patient ID to view prescriptions.</p>
          <Button onClick={() => navigate(-1)} variant="primary">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
   
            <Card 
              
              className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden"
            >
            {loadingPrescriptions ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading prescriptions...</p>
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="text-center py-12">
                <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Prescriptions Found</h3>
                <p className="text-gray-600 mb-6">No medications have been prescribed for this clinical proforma yet.</p>
                {(isJrSr(currentUser?.role) || isAdmin(currentUser?.role)) && clinicalProformaId && (
                  <Button
                    onClick={() => navigate(`/prescriptions/create?patient_id=${patientId}&clinical_proforma_id=${clinicalProformaId}&returnTab=${returnTab || ''}`)}
                    variant="primary"
                    className="flex items-center gap-2 mx-auto"
                  >
                    <FiPackage className="w-4 h-4" />
                    Create Prescription
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-6">
                <div className="overflow-x-auto rounded-xl border border-white/40 shadow-lg" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table className="min-w-full text-sm" style={{ position: 'relative' }}>
                    <thead className="backdrop-blur-md bg-white/50 border-b border-white/40 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider backdrop-blur-md bg-white/50">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider backdrop-blur-md bg-white/50">Medicine</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider backdrop-blur-md bg-white/50">Dosage</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider backdrop-blur-md bg-white/50">When</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider backdrop-blur-md bg-white/50">Frequency</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider backdrop-blur-md bg-white/50">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider backdrop-blur-md bg-white/50">Qty</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider backdrop-blur-md bg-white/50">Details</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider backdrop-blur-md bg-white/50">Notes</th>
                        {/* {(isJrSr(currentUser?.role) || isAdmin(currentUser?.role)) && (
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider backdrop-blur-md bg-white/50">Actions</th>
                        )} */}
                      </tr>
                    </thead>
                    <tbody className="backdrop-blur-sm bg-white/40 divide-y divide-white/30">
                      {prescriptions.map((prescription, idx) => (
                        <tr key={idx} className="hover:bg-white/60 transition-colors duration-200">
                          <td className="px-4 py-3 text-gray-600">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium">{prescription.medicine || '-'}</td>
                          <td className="px-4 py-3">{prescription.dosage || '-'}</td>
                          <td className="px-4 py-3">{prescription.when_to_take || '-'}</td>
                          <td className="px-4 py-3">{prescription.frequency || '-'}</td>
                          <td className="px-4 py-3">{prescription.duration || '-'}</td>
                          <td className="px-4 py-3">{prescription.quantity || '-'}</td>
                          <td className="px-4 py-3">{prescription.details || '-'}</td>
                          <td className="px-4 py-3">{prescription.notes || '-'}</td>
                          
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            </Card>
          
    </>
  );
};

export default PrescriptionView;

