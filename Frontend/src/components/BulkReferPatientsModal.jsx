import { useState, useEffect, useMemo } from 'react';
import { FiSearch, FiUserPlus, FiChevronRight, FiChevronLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import Pagination from './Pagination';
import { useGetAllPatientsQuery, useBulkReferPatientsMutation } from '../features/patients/patientsApiSlice';
import { useGetDoctorsQuery } from '../features/users/usersApiSlice';
import { getResidentSubRoleLabel } from '../utils/constants';

const patientKey = (p) => `${p.patient_type || 'adult'}-${p.id}`;

const BulkReferPatientsModal = ({
  isOpen,
  onClose,
  currentUserId,
  onSuccess,
}) => {
  const [step, setStep] = useState(1);
  const [listType, setListType] = useState('adult');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [selectedPatientsMap, setSelectedPatientsMap] = useState(new Map());
  const [targetDoctorId, setTargetDoctorId] = useState('');
  const [reason, setReason] = useState('');

  const limit = 10;

  const { data, isLoading, isFetching } = useGetAllPatientsQuery(
    {
      page,
      limit,
      search: search.trim() || undefined,
      patient_type: listType,
    },
    { skip: !isOpen, refetchOnMountOrArgChange: true }
  );

  const { data: doctorsData, isLoading: loadingDoctors } = useGetDoctorsQuery(
    { page: 1, limit: 200 },
    { skip: !isOpen || step !== 2 }
  );

  const [bulkRefer, { isLoading: isSubmitting }] = useBulkReferPatientsMutation();

  const patients = data?.data?.patients || [];
  const pagination = data?.data?.pagination || { page: 1, pages: 1, total: 0 };

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

  const selectedPatients = useMemo(
    () => Array.from(selectedPatientsMap.values()),
    [selectedPatientsMap]
  );

  const pageKeys = patients.map(patientKey);
  const allOnPageSelected =
    pageKeys.length > 0 && pageKeys.every((key) => selectedKeys.has(key));
  const someOnPageSelected =
    pageKeys.some((key) => selectedKeys.has(key)) && !allOnPageSelected;

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setListType('adult');
      setPage(1);
      setSearch('');
      setSearchInput('');
      setSelectedKeys(new Set());
      setSelectedPatientsMap(new Map());
      setTargetDoctorId('');
      setReason('');
    }
  }, [isOpen]);

  useEffect(() => {
    setPage(1);
  }, [listType, search]);

  const togglePatient = (patient) => {
    const key = patientKey(patient);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSelectedPatientsMap((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, patient);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        pageKeys.forEach((k) => next.delete(k));
        return next;
      });
      setSelectedPatientsMap((prev) => {
        const next = new Map(prev);
        pageKeys.forEach((k) => next.delete(k));
        return next;
      });
    } else {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        pageKeys.forEach((k) => next.add(k));
        return next;
      });
      setSelectedPatientsMap((prev) => {
        const next = new Map(prev);
        patients.forEach((p) => next.set(patientKey(p), p));
        return next;
      });
    }
  };

  const handleSearch = () => {
    setSearch(searchInput.trim());
  };

  const goToReferStep = () => {
    if (selectedPatients.length === 0) {
      toast.error('Select at least one patient');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!targetDoctorId) {
      toast.error('Please select a doctor');
      return;
    }

    try {
      const result = await bulkRefer({
        patients: selectedPatients.map((p) => ({
          patient_id: p.id,
          patient_type: p.patient_type || 'adult',
        })),
        referred_to_doctor_id: parseInt(targetDoctorId, 10),
        referral_reason: reason.trim() || undefined,
      }).unwrap();

      const skipped = result?.data?.skipped?.length || 0;
      toast.success(
        skipped > 0
          ? `${result.message} (${skipped} skipped — already referred)`
          : result.message
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to refer patients');
    }
  };

  const displayName = (p) => p?.name || p?.child_name || '—';
  const displayCr = (p) => p?.cr_no || p?.cr_number || '—';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 1 ? 'Select Patients to Refer' : 'Refer to Doctor'}
      size="lg"
      footer={
        step === 1 ? (
          <div className="flex justify-between w-full gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={goToReferStep}
              disabled={selectedPatients.length === 0}
              className="bg-gradient-to-r from-primary-600 to-primary-700"
            >
              Next: Choose Doctor ({selectedPatients.length})
              <FiChevronRight className="ml-2" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-between w-full gap-3">
            <Button variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>
              <FiChevronLeft className="mr-2" />
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || loadingDoctors || !targetDoctorId}
              className="bg-gradient-to-r from-primary-600 to-primary-700"
            >
              <FiUserPlus className="mr-2" />
              {isSubmitting ? 'Referring...' : `Refer ${selectedPatients.length} Patient(s)`}
            </Button>
          </div>
        )
      }
    >
      {step === 1 ? (
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-gray-200">
            {['adult', 'child'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setListType(type)}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  listType === type
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {type === 'adult' ? 'Adult Patients' : 'Child Patients'}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by CR No, name, PSY No..."
              className="flex-1"
            />
            <Button onClick={handleSearch} variant="outline" className="shrink-0">
              <FiSearch className="w-4 h-4 mr-1" />
              Search
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someOnPageSelected;
                }}
                onChange={toggleSelectAllOnPage}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Select all on this page
            </label>
            <span className="text-sm text-gray-600">
              {selectedPatients.length} selected
              {pagination.total > 0 && (
                <span className="text-gray-400 ml-1">· {pagination.total} total</span>
              )}
            </span>
          </div>

          {(isLoading || isFetching) ? (
            <p className="text-center py-8 text-gray-500">Loading patients...</p>
          ) : patients.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No patients found.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
              {patients.map((p) => {
                const key = patientKey(p);
                const checked = selectedKeys.has(key);
                return (
                  <li key={key}>
                    <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePatient(p)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 truncate">{displayName(p)}</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          CR: {displayCr(p)}
                          {p.psy_no ? ` · PSY: ${p.psy_no}` : ''}
                          {p.patient_type === 'child' ? ' · Child' : ''}
                        </div>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {pagination.pages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              itemsPerPage={limit}
              onPageChange={setPage}
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm">
            <p className="font-semibold text-gray-900">
              {selectedPatients.length} patient{selectedPatients.length !== 1 ? 's' : ''} selected
            </p>
            <p className="text-gray-600 mt-1 line-clamp-2">
              {selectedPatients.slice(0, 5).map(displayName).join(', ')}
              {selectedPatients.length > 5 ? ` +${selectedPatients.length - 5} more` : ''}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refer to doctor <span className="text-red-500">*</span>
            </label>
            <Select
              value={targetDoctorId}
              onChange={(e) => setTargetDoctorId(e.target.value)}
              options={[
                { value: '', label: loadingDoctors ? 'Loading doctors...' : 'Select doctor' },
                ...doctorOptions,
              ]}
              disabled={loadingDoctors || isSubmitting}
              searchable
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for referral</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Optional reason shared for all selected patients"
              disabled={isSubmitting}
            />
          </div>

          <p className="text-xs text-gray-500">
            Only patients from your list are shown (My Patients / Total Patients scope). Referred patients appear under{' '}
            <strong>Referred Patients → My Referrals</strong> for you and <strong>Referred to Me</strong> for the receiving doctor.
          </p>
        </div>
      )}
    </Modal>
  );
};

export default BulkReferPatientsModal;
