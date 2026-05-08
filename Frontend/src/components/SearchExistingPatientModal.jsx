import { useState, useEffect } from 'react';
import { FiSearch, FiUser, FiPhone, FiClock, FiChevronRight } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import {
  useLazySearchPatientsQuery,
  useCreatePatientMutation,
  useAddChildPatientToTodayListMutation,
} from '../features/patients/patientsApiSlice';

const SearchExistingPatientModal = ({ isOpen, onClose, onSelectPatient, currentRoom }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [triggerSearch, searchState] = useLazySearchPatientsQuery();
  const { data: searchResponse, isLoading, isFetching, error } = searchState;

  const patients = searchResponse?.data?.patients || [];
  const foundPatient = selectedPatient;
  const patientType = foundPatient?.patient_type;
  const isChildPatient = patientType === 'child';

  const displayRoom =
    currentRoom && currentRoom.trim() !== ''
      ? currentRoom
      : foundPatient?.assigned_room || '';

  const [createPatient, { isLoading: isCreatingVisit }] = useCreatePatientMutation();
  const [addChildPatientToTodayList, { isLoading: isAddingChildPatient }] =
    useAddChildPatientToTodayListMutation();

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedPatient(null);
    }
  }, [isOpen]);

  // Auto-select when exactly one match
  useEffect(() => {
    if (!searchResponse?.data?.patients) return;
    const list = searchResponse.data.patients;
    if (list.length === 1) {
      setSelectedPatient(list[0]);
    } else {
      setSelectedPatient(null);
    }
  }, [searchResponse]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      toast.error('Enter at least 2 characters (CR number, name, or mobile)');
      return;
    }
    setSelectedPatient(null);
    try {
      await triggerSearch({ search: q, page: 1, limit: 25 }).unwrap();
    } catch {
      // RTK Query surfaces errors on searchState.error
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSelectPatient = async () => {
    if (!foundPatient) return;

    try {
      if (isChildPatient) {
        const roomToUse =
          currentRoom && currentRoom.trim() !== ''
            ? currentRoom
            : foundPatient.assigned_room || undefined;

        await addChildPatientToTodayList({
          child_patient_id: parseInt(foundPatient.id, 10),
          assigned_room: roomToUse,
        }).unwrap();

        toast.success("Child patient added to today's list successfully!");

        if (onSelectPatient) {
          onSelectPatient(foundPatient);
        }

        handleClose();
        return;
      }

      const roomToUse =
        currentRoom && currentRoom.trim() !== ''
          ? currentRoom
          : foundPatient.assigned_room || undefined;

      await createPatient({
        name: foundPatient.name,
        patient_id: parseInt(foundPatient.id, 10),
        assigned_room: roomToUse,
      }).unwrap();

      toast.success("Patient added to today's list successfully!");

      if (onSelectPatient) {
        onSelectPatient(foundPatient);
      }

      handleClose();
    } catch (err) {
      console.error("Failed to add patient to today's list:", err);
      if (
        err?.status === 400 &&
        (err?.data?.message?.includes('already exists') ||
          err?.data?.message?.includes('already has'))
      ) {
        toast.info("Patient is already in today's list");
        if (onSelectPatient) {
          onSelectPatient(foundPatient);
        }
        handleClose();
      } else {
        toast.error(err?.data?.message || "Failed to add patient to today's list");
      }
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedPatient(null);
    onClose();
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const displayName = (p) => p?.name || p?.child_name || '—';
  const displayCr = (p) => p?.cr_no || p?.cr_number || '—';
  const displayPhone = (p) => {
    if (!p) return null;
    if (p.patient_type === 'child') return p.mobile_no || null;
    return p.contact_number || null;
  };

  const searching = isLoading || isFetching;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Search Existing Patient" size="md">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Search by CR number, patient name, or mobile number
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="CR number, name, or mobile…"
              className="flex-1"
            />
            <Button onClick={handleSearch} loading={searching} className="px-4 shrink-0">
              <FiSearch className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Use at least 2 characters. Results include adult and child registrations.
          </p>
        </div>

        {error && searchQuery.trim().length >= 2 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              {error?.data?.message || 'Search failed. Please try again.'}
            </p>
          </div>
        )}

        {patients.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {patients.length} match{patients.length !== 1 ? 'es' : ''} — tap to select
            </p>
            <ul
              className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white"
              role="listbox"
            >
              {patients.map((p) => {
                const selected = selectedPatient?.id === p.id && selectedPatient?.patient_type === p.patient_type;
                return (
                  <li key={`${p.patient_type || 'adult'}-${p.id}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => setSelectedPatient(p)}
                      className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 text-sm transition-colors ${
                        selected ? 'bg-primary-50 border-l-4 border-l-primary-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 truncate">{displayName(p)}</div>
                        <div className="text-xs text-gray-600 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>
                            CR: <span className="font-medium text-gray-800">{displayCr(p)}</span>
                          </span>
                          {displayPhone(p) && (
                            <span className="flex items-center gap-1">
                              <FiPhone className="w-3 h-3 shrink-0 text-gray-400" />
                              {displayPhone(p)}
                            </span>
                          )}
                          {p.patient_type === 'child' && (
                            <span className="text-purple-700 font-medium">Child</span>
                          )}
                        </div>
                      </div>
                      <FiChevronRight className={`w-4 h-4 shrink-0 ${selected ? 'text-primary-600' : 'text-gray-300'}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {searchResponse && patients.length === 0 && searchQuery.trim().length >= 2 && !searching && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
            No patients found. Try another CR number, name, or mobile.
          </div>
        )}

        {foundPatient && patients.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-green-50/30 to-white border-l-4 border-l-green-500 rounded-lg shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-lg font-bold text-gray-900 truncate">{displayName(foundPatient)}</h4>
                <div className="flex items-center gap-2 shrink-0">
                  {isChildPatient && (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                      Child Patient
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                    Selected
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-gray-600">
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <FiUser className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-medium">{foundPatient.sex || '—'}</span>
                  {!isChildPatient && foundPatient.age && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>{foundPatient.age}y</span>
                    </>
                  )}
                  {isChildPatient && foundPatient.age_group && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>{foundPatient.age_group}</span>
                    </>
                  )}
                </span>
                {displayPhone(foundPatient) && (
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <FiPhone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{displayPhone(foundPatient)}</span>
                  </span>
                )}
                {foundPatient.created_at && (
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <FiClock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{formatTime(foundPatient.created_at)}</span>
                  </span>
                )}
                <span className="text-gray-500">
                  CR:{' '}
                  <span className="font-medium text-gray-700">{displayCr(foundPatient)}</span>
                </span>
                {!isChildPatient && foundPatient.psy_no && (
                  <span className="text-gray-500">
                    PSY:{' '}
                    <span className="font-medium text-gray-700">{foundPatient.psy_no}</span>
                  </span>
                )}
                {isChildPatient && (foundPatient.cgc_number || foundPatient.special_clinic_no) && (
                  <span className="text-gray-500">
                    CGC:{' '}
                    <span className="font-medium text-gray-700">
                      {foundPatient.cgc_number || foundPatient.special_clinic_no}
                    </span>
                  </span>
                )}
                {displayRoom && displayRoom.trim() !== '' && (
                  <span className="text-gray-500">
                    Room: <span className="font-medium text-gray-700">{displayRoom}</span>
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <Button
                  onClick={handleSelectPatient}
                  loading={isCreatingVisit || isAddingChildPatient}
                  disabled={isCreatingVisit || isAddingChildPatient}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  Add to Today&apos;s List
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SearchExistingPatientModal;
