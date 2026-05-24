import { useState } from 'react';
import { FiUserPlus } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Modal from './Modal';
import Button from './Button';
import Select from './Select';
import { useGetDoctorsQuery } from '../features/users/usersApiSlice';
import { useReferPatientToDoctorMutation } from '../features/patients/patientsApiSlice';
import { getResidentSubRoleLabel } from '../utils/constants';

const ReferPatientModal = ({ isOpen, onClose, patient, onSuccess, currentUserId }) => {
  const [targetDoctorId, setTargetDoctorId] = useState('');
  const [reason, setReason] = useState('');

  const { data: doctorsData, isLoading: loadingDoctors } = useGetDoctorsQuery(
    { page: 1, limit: 200 },
    { skip: !isOpen }
  );
  const [referPatient, { isLoading: isSubmitting }] = useReferPatientToDoctorMutation();

  const doctors = (doctorsData?.data?.users || []).filter(
    (doc) => doc.id !== currentUserId && doc.is_active !== false
  );

  const doctorOptions = doctors.map((doc) => {
    const subLabel =
      doc.role === 'Resident' && doc.sub_role
        ? ` (${getResidentSubRoleLabel(doc.sub_role)})`
        : '';
    return {
      value: String(doc.id),
      label: `${doc.name} — ${doc.role}${subLabel}`,
    };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patient?.id) {
      toast.error('Invalid patient');
      return;
    }
    if (!targetDoctorId) {
      toast.error('Please select a doctor');
      return;
    }

    try {
      await referPatient({
        patientId: patient.id,
        referred_to_doctor_id: parseInt(targetDoctorId, 10),
        referral_reason: reason.trim() || undefined,
        patient_type: patient.patient_type || 'adult',
      }).unwrap();
      toast.success('Patient referred successfully');
      setTargetDoctorId('');
      setReason('');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to refer patient');
    }
  };

  const handleClose = () => {
    setTargetDoctorId('');
    setReason('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Refer Patient to Doctor"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || loadingDoctors}
            className="bg-gradient-to-r from-primary-600 to-primary-700"
          >
            <FiUserPlus className="mr-2" />
            {isSubmitting ? 'Referring...' : 'Refer Patient'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">{patient?.name || 'Patient'}</p>
          <p className="mt-1">
            CR: {patient?.cr_no || 'N/A'}
            {patient?.psy_no ? ` · PSY: ${patient.psy_no}` : ''}
            {patient?.patient_type === 'child' ? ' · Child patient' : ''}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Refer to doctor <span className="text-red-500">*</span>
          </label>
          <Select
            value={targetDoctorId}
            onChange={(e) => setTargetDoctorId(e.target.value)}
            options={[{ value: '', label: loadingDoctors ? 'Loading doctors...' : 'Select doctor' }, ...doctorOptions]}
            disabled={loadingDoctors || isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for referral
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g. Need senior opinion, complex case review..."
            disabled={isSubmitting}
          />
        </div>
      </form>
    </Modal>
  );
};

export default ReferPatientModal;
