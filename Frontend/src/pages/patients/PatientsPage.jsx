import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { 
  FiPlus, FiSearch, FiTrash2, FiEye,  FiEdit, FiUsers, 
   FiDownload,
  FiFileText, FiShield, FiX, FiUserPlus, FiCheckCircle, FiClipboard, FiChevronDown, FiXCircle
} from 'react-icons/fi';
import { BsFileEarmarkExcelFill } from 'react-icons/bs';
import {
  useGetAllPatientsQuery,
  useDeletePatientMutation,
  useDeleteChildPatientMutation,
  useGetPatientByIdQuery,
  useMarkReferralSeenMutation,
  useCompleteReferralMutation,
  useAddPatientToMyListMutation,
  useRevokeReferralMutation,
} from '../../features/patients/patientsApiSlice';
import { selectCurrentUser, selectCurrentToken } from '../../features/auth/authSlice';
import {
  downloadPatientReportExcel,
  openPatientReportPrint,
  downloadBulkPatientReportExcel,
} from '../../utils/patientReportApi';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Table from '../../components/Table';
import Pagination from '../../components/Pagination';
import Badge from '../../components/Badge';
import ExportDateRangeModal from '../../components/ExportDateRangeModal';
import {
  isAdmin,
  isMWO,
  PATIENT_REGISTRATION_FORM,
  CLINICAL_PROFORMA_FORM,
  ADL_FILE_FORM,
  PRESCRIPTION_FORM,
  isJuniorResidentUser,
  isSeniorResidentUser,
  canReferPatients,
  canSeeUnassignedPatientsTab,
  canSeeTotalPatientsTab,
  getResidentSubRoleLabel,
  canFillClinicalProforma,
  canFillIntakeRecord,
  canFillClinicalProformaForReferral,
  canFillIntakeRecordForReferral,
} from '../../utils/constants';
import { clinicalApiSlice } from '../../features/clinical/clinicalApiSlice';
import { childClinicalApiSlice } from '../../features/clinical/childClinicalApiSlice';
import { adlApiSlice } from '../../features/adl/adlApiSlice';
import { useGetDoctorsQuery } from '../../features/users/usersApiSlice';
import ReferPatientModal from '../../components/ReferPatientModal';
import BulkReferPatientsModal from '../../components/BulkReferPatientsModal';
import PatientListFilters, {
  PATIENT_LIST_EMPTY_FILTERS,
  PatientListActiveFilters,
} from '../../components/PatientListFilters';
import PGI_Logo from '../../assets/PGI_Logo.png';
import { clinicalProformaRecordsOnly } from '../../utils/clinicalPatientRecords';
import { resolveFinalAssessmentHistory } from '../../utils/adlClosingSections';

const toISTDateString = (dateInput) => {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } catch {
    return '';
  }
};

const PatientsPage = () => {
  const user = useSelector(selectCurrentUser);
  const token = useSelector(selectCurrentToken);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const limit = 10;
  const [patientType, setPatientType] = useState('adult');
  const [referralSubView, setReferralSubView] = useState('to_me'); // to_me | by_me
  const [unassignedSubView, setUnassignedSubView] = useState('adult'); // adult | child
  const [totalSubView, setTotalSubView] = useState('adult'); // adult | child (Total Patients tab)
  const [referModalPatient, setReferModalPatient] = useState(null);
  const [bulkReferModalOpen, setBulkReferModalOpen] = useState(false);
  const [assigningPatientId, setAssigningPatientId] = useState(null);
  const [assignDoctorDropdownPatientId, setAssignDoctorDropdownPatientId] = useState(null);
  const [selectedAssignDoctorId, setSelectedAssignDoctorId] = useState('');
  const assignDoctorDropdownRef = useRef(null);
  const [revokeConfirmRow, setRevokeConfirmRow] = useState(null);
  const [listFilters, setListFilters] = useState(PATIENT_LIST_EMPTY_FILTERS);

  const isUnassignedTab = patientType === 'unassigned';
  const isAdminUser = isAdmin(user?.role);

  const { data: residentsData, isLoading: isLoadingResidents } = useGetDoctorsQuery(
    { page: 1, limit: 200 },
    { skip: !isAdminUser || !isUnassignedTab }
  );

  const residentDoctors = useMemo(() => {
    return (residentsData?.data?.users || [])
      .filter(
        (d) =>
          d.role === 'Resident' &&
          d.is_active !== false &&
          (d.sub_role === 'Junior Resident' || d.sub_role === 'Senior Resident')
      )
      .sort((a, b) => {
        const subOrder = (s) => (s === 'Senior Resident' ? 0 : 1);
        const bySub = subOrder(a.sub_role) - subOrder(b.sub_role);
        if (bySub !== 0) return bySub;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [residentsData]);

  const isReferredTab = patientType === 'referred';
  const isTotalPatientsTab = patientType === 'total';

  // Reset page to 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [search, patientType, referralSubView, unassignedSubView, totalSubView, listFilters]);

  const listFilterParams = useMemo(() => {
    const p = {};
    if (listFilters.state) p.state = listFilters.state;
    if (listFilters.gender) p.gender = listFilters.gender;
    if (listFilters.date_from && listFilters.date_to) {
      p.date_from = listFilters.date_from;
      p.date_to = listFilters.date_to;
    } else if (listFilters.period) {
      p.period = listFilters.period;
    }
    return p;
  }, [listFilters]);

  const isResidentUser =
    isJuniorResidentUser(user) || isSeniorResidentUser(user);

  const patientListTabLabels = useMemo(
    () => ({
      adult: isResidentUser ? 'My Adult Patients' : 'Adult Patients',
      child: isResidentUser ? 'My Child Patients' : 'Child Patients',
      referred: 'Referred Patients',
      total: 'Total Patients',
      unassigned: 'Unassigned Patients',
    }),
    [isResidentUser]
  );

  const patientsTabTitle = isTotalPatientsTab
    ? patientListTabLabels.total
    : isUnassignedTab
      ? patientListTabLabels.unassigned
      : isReferredTab
        ? patientListTabLabels.referred
        : patientType === 'adult'
          ? patientListTabLabels.adult
          : patientType === 'child'
            ? patientListTabLabels.child
            : isResidentUser
              ? 'My Patients'
              : 'Patients';

  // Global patient search uses a larger fetch + client filter; tab-scoped lists search on the server.
  const useServerListSearch =
    isUnassignedTab || isTotalPatientsTab || isReferredTab;
  const fetchLimit = search.trim() && !useServerListSearch ? 100 : limit;

  // Unified patient list. Backend scopes adult/child by `patient_type` query.
  const patientsQueryArgs = useMemo(() => {
    const base = {
      page: search.trim() && !useServerListSearch ? 1 : page,
      limit: fetchLimit,
      search: search.trim() || undefined,
      ...listFilterParams,
    };
    if (isReferredTab) {
      return {
        ...base,
        referral_view: referralSubView === 'by_me' ? 'referred_by_me' : 'referred_to_me',
      };
    }
    if (isUnassignedTab) {
      return {
        ...base,
        patient_type: unassignedSubView,
        unassigned_only: true,
      };
    }
    if (isTotalPatientsTab) {
      return {
        ...base,
        patient_type: totalSubView,
        all_patients: true,
      };
    }
    return {
      ...base,
      patient_type: patientType,
    };
  }, [
    search,
    page,
    fetchLimit,
    listFilterParams,
    isReferredTab,
    isUnassignedTab,
    isTotalPatientsTab,
    referralSubView,
    unassignedSubView,
    totalSubView,
    patientType,
    useServerListSearch,
  ]);

  const { data, isLoading, isFetching, refetch, error } = useGetAllPatientsQuery(patientsQueryArgs, {
    refetchOnMountOrArgChange: true,
  });

  const [markReferralSeen] = useMarkReferralSeenMutation();
  const [completeReferral] = useCompleteReferralMutation();
  const [revokeReferral, { isLoading: isRevoking }] = useRevokeReferralMutation();
  const [addPatientToMyList, { isLoading: isAddingToMyList }] = useAddPatientToMyListMutation();

  const currentIsLoading = isLoading;
  const currentIsFetching = isFetching;
  const currentError = error;

  // Backend response always uses { patients: [...] } now, with each row carrying
  // `patient_type` ('adult' | 'child') so downstream UI checks keep working.
  const allPatients = data?.data?.patients || [];

  // Client-side filtering only for unscoped global search; tab lists use server-side search.
  const filteredPatients = allPatients ? (() => {
    if (!search.trim()) {
      return allPatients;
    }

    if (useServerListSearch) {
      return allPatients;
    }

    const searchLower = search.trim().toLowerCase();
    
    // Filter by all searchable fields including doctor name
    const filtered = allPatients.filter(patient => {
      return (
        patient.name?.toLowerCase().includes(searchLower) ||
        patient.cr_no?.toLowerCase().includes(searchLower) ||
        patient.psy_no?.toLowerCase().includes(searchLower) ||
        patient.adl_no?.toLowerCase().includes(searchLower) ||
        patient.special_clinic_no?.toLowerCase().includes(searchLower) ||
        patient.assigned_doctor_name?.toLowerCase().includes(searchLower) ||
        patient.assigned_doctor_role?.toLowerCase().includes(searchLower) ||
        patient.assigned_room?.toLowerCase().includes(searchLower) ||
        (isReferredTab && (
          patient.referred_by_name?.toLowerCase().includes(searchLower) ||
          patient.referred_to_name?.toLowerCase().includes(searchLower) ||
          patient.referral_reason?.toLowerCase().includes(searchLower) ||
          patient.referral_status?.toLowerCase().includes(searchLower)
        ))
      );
    });

    // Apply pagination to filtered results
    const startIndex = (page - 1) * limit;
    return filtered.slice(startIndex, startIndex + limit);
  })() : [];

  const totalFiltered = search.trim()
    ? useServerListSearch
      ? (data?.data?.pagination?.total ?? allPatients.length)
      : (allPatients?.filter((patient) => {
          const searchLower = search.trim().toLowerCase();
          return (
            patient.name?.toLowerCase().includes(searchLower) ||
            patient.cr_no?.toLowerCase().includes(searchLower) ||
            patient.psy_no?.toLowerCase().includes(searchLower) ||
            patient.adl_no?.toLowerCase().includes(searchLower) ||
            patient.special_clinic_no?.toLowerCase().includes(searchLower) ||
            patient.assigned_doctor_name?.toLowerCase().includes(searchLower) ||
            patient.assigned_doctor_role?.toLowerCase().includes(searchLower) ||
            patient.assigned_room?.toLowerCase().includes(searchLower) ||
            (isReferredTab &&
              (patient.referred_by_name?.toLowerCase().includes(searchLower) ||
                patient.referred_to_name?.toLowerCase().includes(searchLower) ||
                patient.referral_reason?.toLowerCase().includes(searchLower) ||
                patient.referral_status?.toLowerCase().includes(searchLower)))
          );
        }).length || 0)
    : (data?.data?.pagination?.total || 0);

  const totalPages = search.trim()
    ? useServerListSearch
      ? (data?.data?.pagination?.pages || Math.ceil(totalFiltered / limit) || 1)
      : Math.ceil(totalFiltered / limit)
    : (data?.data?.pagination?.pages || 1);
 
  const [deletePatient] = useDeletePatientMutation();
  const [deleteChildPatient] = useDeleteChildPatientMutation();
 

  // Handle view patient details
  const handleView = (row) => {
    const patientId = row.id;
    
    if (!patientId) {
      toast.error('Invalid patient ID. Unable to view patient details.');
      return;
    }

    // Navigate based on patient type
    if (row.patient_type === 'child') {
      navigate(`/child-patient/${patientId}?mode=view`);
    } else {
    // Explicitly set edit=false to ensure view mode and clear any persisted edit state
    navigate(`/patients/${patientId}?edit=false`);
    }
  };

  // Handle edit patient
  const handleEdit = (row) => {
    const patientId = row.id;
    
    if (!patientId) {
      toast.error('Invalid patient ID. Unable to edit patient.');
      return;
    }
    
    // Navigate based on patient type
    if (row.patient_type === 'child') {
      navigate(`/child-patient/${patientId}?mode=edit`);
    } else {
    navigate(`/patients/${patientId}?edit=true`);
    }
  };

  const handleViewReferred = async (row) => {
    if (row.referral_id && referralSubView === 'to_me') {
      try {
        await markReferralSeen(row.referral_id).unwrap();
      } catch {
        /* non-blocking */
      }
    }
    handleView(row);
  };

  const handleAddToMyList = async (row) => {
    const patientId = row?.id;
    if (!patientId) {
      toast.error('Invalid patient ID');
      return;
    }
    const confirmed = window.confirm(
      `Add "${row.name || 'this patient'}" to your patient list? They will be removed from the Unassigned list.`
    );
    if (!confirmed) return;

    setAssigningPatientId(patientId);
    try {
      const pt = row.patient_type === 'child' ? 'child' : 'adult';
      const result = await addPatientToMyList({ patientId, patient_type: pt }).unwrap();
      toast.success(result.message || 'Patient added to your list');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to add patient to your list');
    } finally {
      setAssigningPatientId(null);
    }
  };

  const handleAddToDoctorList = async (row, doctorId) => {
    const patientId = row?.id;
    if (!patientId) {
      toast.error('Invalid patient ID');
      return;
    }
    if (!doctorId) {
      toast.warning('Please select a resident doctor');
      return;
    }
    const doctor = residentDoctors.find((d) => String(d.id) === String(doctorId));
    const pt = row.patient_type === 'child' ? 'child' : 'adult';
    const listLabel = pt === 'child' ? 'child' : 'adult';
    const subLabel = doctor?.sub_role ? getResidentSubRoleLabel(doctor.sub_role) : '';
    const confirmed = window.confirm(
      `Add "${row.name || 'this patient'}" to Dr. ${doctor?.name || 'selected doctor'}${subLabel ? ` (${subLabel})` : ''}'s ${listLabel} patient list? They will be removed from the Unassigned list.`
    );
    if (!confirmed) return;

    setAssigningPatientId(patientId);
    try {
      const result = await addPatientToMyList({
        patientId,
        patient_type: pt,
        doctor_id: parseInt(doctorId, 10),
      }).unwrap();
      toast.success(result.message || 'Patient added to doctor list');
      setAssignDoctorDropdownPatientId(null);
      setSelectedAssignDoctorId('');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to add patient to doctor list');
    } finally {
      setAssigningPatientId(null);
    }
  };

  useEffect(() => {
    if (!assignDoctorDropdownPatientId) return undefined;
    const handleClickOutside = (event) => {
      if (
        assignDoctorDropdownRef.current &&
        !assignDoctorDropdownRef.current.contains(event.target)
      ) {
        setAssignDoctorDropdownPatientId(null);
        setSelectedAssignDoctorId('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [assignDoctorDropdownPatientId]);

  const handleCompleteReferral = async (row) => {
    if (!row.referral_id) return;
    const confirmed = window.confirm('Mark this referral as completed?');
    if (!confirmed) return;
    try {
      await completeReferral({ referralId: row.referral_id }).unwrap();
      toast.success('Referral marked as completed');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to complete referral');
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeConfirmRow?.referral_id) return;
    try {
      await revokeReferral({ referralId: revokeConfirmRow.referral_id }).unwrap();
      toast.success('Referral revoked successfully');
      setRevokeConfirmRow(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to revoke referral');
      setRevokeConfirmRow(null);
    }
  };

  const markReferredSeenIfNeeded = useCallback(
    async (row) => {
      if (referralSubView === 'to_me' && row.referral_id) {
        try {
          await markReferralSeen(row.referral_id).unwrap();
        } catch {
          /* non-blocking */
        }
      }
    },
    [referralSubView, markReferralSeen]
  );

  const handleReferredClinicalProforma = useCallback(
    async (row) => {
      const patientId = row?.id;
      if (!patientId) {
        toast.error('Invalid patient ID');
        return;
      }
      await markReferredSeenIfNeeded(row);

      if (row.patient_type === 'child') {
        try {
          const result = await dispatch(
            childClinicalApiSlice.endpoints.getChildClinicalProformasByChildPatientId.initiate(
              patientId
            )
          ).unwrap();
          const proformas = result?.data?.proformas || [];
          const latest = proformas[0];
          if (latest?.id) {
            navigate(`/child-clinical-proformas/${latest.id}/edit?from=referred`);
          } else {
            navigate(`/child-clinical-proformas/new?child_patient_id=${patientId}&from=referred`);
          }
        } catch {
          navigate(`/child-clinical-proformas/new?child_patient_id=${patientId}&from=referred`);
        }
        return;
      }

      try {
        const result = await dispatch(
          clinicalApiSlice.endpoints.getClinicalProformaByPatientId.initiate(patientId)
        ).unwrap();
        const proformas = clinicalProformaRecordsOnly(
          result?.data?.proformas || result?.data || []
        );
        const today = toISTDateString(new Date());
        const todayProforma = proformas.find(
          (p) => toISTDateString(p.visit_date || p.created_at) === today
        );
        const target = todayProforma || proformas[0];
        if (target?.id) {
          navigate(`/clinical/${target.id}/edit?from=referred`);
        } else {
          navigate(`/clinical/new?patient_id=${patientId}&from=referred`);
        }
      } catch {
        navigate(`/clinical/new?patient_id=${patientId}&from=referred`);
      }
    },
    [dispatch, navigate, markReferredSeenIfNeeded]
  );

  const handleReferredIntakeRecord = useCallback(
    async (row) => {
      const patientId = row?.id;
      if (!patientId) {
        toast.error('Invalid patient ID');
        return;
      }
      await markReferredSeenIfNeeded(row);

      if (row.patient_type === 'child') {
        navigate(`/child-patient/${patientId}?mode=edit&from=referred`);
        return;
      }

      try {
        const result = await dispatch(
          adlApiSlice.endpoints.getADLFileByPatientId.initiate(patientId)
        ).unwrap();
        const files =
          result?.data?.adlFiles || result?.data?.files || result?.data || [];
        const list = Array.isArray(files) ? files : [];
        if (list.length > 0 && list[0]?.id) {
          navigate(`/adl/patient/${patientId}?from=referred`);
        } else {
          navigate(`/adl/new?patient_id=${patientId}&from=referred`);
        }
      } catch {
        navigate(`/adl/new?patient_id=${patientId}&from=referred`);
      }
    },
    [dispatch, navigate, markReferredSeenIfNeeded]
  );

  const handleDelete = async (id, patientTypeParam) => {
    if (!id) {
      toast.error('Invalid patient ID. Cannot delete patient.');
      return;
    }
  
    console.log('[handleDelete] Attempting to delete:', { id, patientTypeParam, userRole: user?.role });
  
    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete this ${patientTypeParam === 'child' ? 'child patient' : 'patient'}? This action cannot be undone and will delete all related records (clinical proformas, follow-ups, prescriptions, etc.).`
    );
    
    if (!confirmed) {
      return;
    }
  
    try {
      if (patientTypeParam === 'child') {
        console.log('[handleDelete] Deleting child patient:', id);
        await deleteChildPatient(id).unwrap();
        toast.success('Child patient and all related records deleted successfully');
      } else {
        console.log('[handleDelete] Deleting adult patient:', id);
        await deletePatient(id).unwrap();
        toast.success('Patient and all related records deleted successfully');
      }
      refetch();
    } catch (err) {
      console.error('[handleDelete] Error deleting patient:', err);
      toast.error(err?.data?.message || err?.message || 'Failed to delete patient');
    }
  };
  

  const handleExport = async (patientId) => {
    if (!patientId) {
      toast.error('Invalid patient ID. Unable to export patient details.');
      return;
    }

    try {
      toast.info('Generating Excel report...');
      await downloadPatientReportExcel(patientId);
      toast.success('Patient report exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      toast.error(err?.message || 'Failed to export patient report');
    }
  };

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

  const handleExportAll = async (dateRange = null) => {
    let progressToastId = null;
    try {
      progressToastId = toast.loading('Generating bulk Excel export...', { autoClose: false });
      await downloadBulkPatientReportExcel({
        dateFrom: dateRange?.start || null,
        dateTo: dateRange?.end || null,
      });
      toast.dismiss(progressToastId);
      toast.success('Bulk patient export downloaded successfully');
    } catch (err) {
      console.error('Bulk export error:', err);
      if (progressToastId) toast.dismiss(progressToastId);
      toast.error(err?.message || 'Failed to export patients');
    }
  };

  // Handle print patient details
  const handlePrint = async (patientId) => {
    if (!patientId) {
      toast.error('Invalid patient ID. Unable to print patient details.');
      return;
    }

    try {
      toast.info('Loading print report...');
      await openPatientReportPrint(patientId);
      toast.success('Print dialog opened');
    } catch (err) {
      console.error('Print error:', err);
      toast.error(err?.message || 'Failed to print patient details');
    }
  };


  /** Unassigned tab: only "Add to my list". Other tabs: full action toolbar. */
  const renderPatientActions = useCallback(
    (row) => {
      const patientId = row.id;

      if (patientType === 'unassigned') {
        const isAssigning = assigningPatientId === patientId && isAddingToMyList;
        const dropdownOpen = assignDoctorDropdownPatientId === patientId;

        if (isAdminUser) {
          return (
            <div
              className="relative min-w-[12rem]"
              ref={dropdownOpen ? assignDoctorDropdownRef : null}
            >
              <Button
                type="button"
                size="sm"
                disabled={isAssigning}
                onClick={() => {
                  if (dropdownOpen) {
                    setAssignDoctorDropdownPatientId(null);
                    setSelectedAssignDoctorId('');
                  } else {
                    setAssignDoctorDropdownPatientId(patientId);
                    setSelectedAssignDoctorId('');
                  }
                }}
                className="h-9 px-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-sm whitespace-nowrap inline-flex items-center gap-1.5"
                title="Assign this patient to a resident doctor's list"
              >
                <FiUserPlus className="w-4 h-4 shrink-0" />
                {isAssigning ? 'Adding…' : 'Add to the doctor list'}
                <FiChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </Button>
              {dropdownOpen && (
                <div className="absolute z-[80] right-0 mt-1 w-72 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-xl p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Select resident (Junior or Senior)
                  </p>
                  {isLoadingResidents ? (
                    <p className="text-sm text-gray-500 py-2">Loading doctors…</p>
                  ) : residentDoctors.length === 0 ? (
                    <p className="text-sm text-amber-700 py-2">No active residents found.</p>
                  ) : (
                    <>
                      <select
                        value={selectedAssignDoctorId}
                        onChange={(e) => setSelectedAssignDoctorId(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                        disabled={isAssigning}
                      >
                        <option value="">Choose doctor…</option>
                        {residentDoctors.map((doc) => (
                          <option key={doc.id} value={String(doc.id)}>
                            {doc.name} — {getResidentSubRoleLabel(doc.sub_role)}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          disabled={!selectedAssignDoctorId || isAssigning}
                          onClick={() => handleAddToDoctorList(row, selectedAssignDoctorId)}
                          className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isAssigning ? 'Adding…' : 'Assign'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAssignDoctorDropdownPatientId(null);
                            setSelectedAssignDoctorId('');
                          }}
                          className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-2 leading-snug">
                        {row.patient_type === 'child'
                          ? 'Adds to that doctor\'s My Child Patients list.'
                          : 'Adds to that doctor\'s My Adult Patients list.'}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        }

        return (
          <Button
            type="button"
            size="sm"
            disabled={isAssigning}
            onClick={() => handleAddToMyList(row)}
            className="h-9 px-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-sm whitespace-nowrap"
            title="Assign this patient to you and add to My Patients"
          >
            <FiUserPlus className="w-4 h-4 mr-1.5 shrink-0" />
            {isAssigning ? 'Adding…' : 'Add to my list'}
          </Button>
        );
      }

      if (isReferredTab) {
        const showReferredClinical = canFillClinicalProformaForReferral(user);
        const showReferredIntake = canFillIntakeRecordForReferral(user);
        const referralStatus = (row.referral_status || '').toLowerCase();
        const referralCompleted = referralStatus === 'completed';
        const referralRevoked = referralStatus === 'revoked' || referralStatus === 'cancelled';
        const canRevoke = isAdmin(user?.role) && referralSubView === 'by_me' && !referralCompleted && !referralRevoked && row.referral_id;

        const referredBtnBase =
          'w-full h-9 flex items-center justify-center gap-1 px-1.5 text-[11px] sm:text-xs font-medium rounded-lg shadow-sm';

        return (
          <div className="grid grid-cols-2 gap-2 w-[15.75rem] sm:w-[17.5rem]">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                referralSubView === 'to_me' ? handleViewReferred(row) : handleView(row)
              }
              className={`${referredBtnBase} bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300`}
              title="View patient details"
            >
              <FiEye className="w-3.5 h-3.5 shrink-0" />
              <span>View Details</span>
            </Button>
            {showReferredClinical ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReferredClinicalProforma(row)}
                className={`${referredBtnBase} bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 hover:border-blue-300`}
                title="Create or edit walk-in clinical proforma"
              >
                <FiFileText className="w-3.5 h-3.5 shrink-0" />
                <span>Clinical Proforma</span>
              </Button>
            ) : (
              <div className="h-9" aria-hidden />
            )}
            {showReferredIntake ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReferredIntakeRecord(row)}
                className={`${referredBtnBase} bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100 hover:border-purple-300`}
                title="Create or edit out-patient intake record"
              >
                <FiClipboard className="w-3.5 h-3.5 shrink-0" />
                <span>Intake Record</span>
              </Button>
            ) : (
              <div className="h-9" aria-hidden />
            )}
            {row.referral_id ? (
              referralRevoked ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className={`${referredBtnBase} bg-red-50 border-red-200 text-red-400 cursor-not-allowed`}
                  title="Referral has been revoked"
                >
                  <FiXCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Revoked</span>
                </Button>
              ) : referralCompleted ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className={`${referredBtnBase} bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed`}
                  title="Referral already completed"
                >
                  <FiCheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Completed</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCompleteReferral(row)}
                  className={`${referredBtnBase} bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300`}
                  title="Mark referral as completed"
                >
                  <FiCheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Complete</span>
                </Button>
              )
            ) : (
              <div className="h-9" aria-hidden />
            )}
            {canRevoke ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevokeConfirmRow(row)}
                className={`col-span-2 ${referredBtnBase} bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-400`}
                title="Revoke this referral"
              >
                <FiXCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Revoke Referral</span>
              </Button>
            ) : null}
          </div>
        );
      }

      return (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              isReferredTab && referralSubView === 'to_me'
                ? handleViewReferred(row)
                : handleView(row)
            }
            className="h-9 w-9 p-0 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
            title={`View Details for Patient ID: ${patientId || 'N/A'}`}
          >
            <FiEye className="w-4 h-4 text-blue-600" />
          </Button>
          {!isReferredTab && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(row)}
              className="h-9 w-9 p-0 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 hover:border-green-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
              title="Edit Patient"
            >
              <FiEdit className="w-4 h-4 text-green-600" />
            </Button>
          )}
          {!isReferredTab && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleExport(patientId)}
              className="h-9 w-9 p-0 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
              title="Export Patient"
            >
              <BsFileEarmarkExcelFill className="w-4 h-4 text-green-600" />
            </Button>
          )}
          {canReferPatients(user) && !isReferredTab && patientId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReferModalPatient(row)}
              className="h-9 w-9 p-0 bg-gradient-to-r from-sky-50 to-cyan-50 hover:from-sky-100 hover:to-cyan-100 border border-sky-200 hover:border-sky-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
              title="Refer Patient to Doctor"
            >
              <FiUserPlus className="w-4 h-4 text-sky-700" />
            </Button>
          )}
          {isAdmin(user?.role) && patientId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 border border-red-200 hover:border-red-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
              title={`Delete ${row.patient_type === 'child' ? 'Child Patient' : 'Patient'} (Admin Only)`}
              onClick={() => handleDelete(patientId, row.patient_type || 'adult')}
            >
              <FiTrash2 className="w-4 h-4 text-red-600" />
            </Button>
          )}
        </div>
      );
    },
    [
      patientType,
      isReferredTab,
      referralSubView,
      assigningPatientId,
      isAddingToMyList,
      isAdminUser,
      assignDoctorDropdownPatientId,
      selectedAssignDoctorId,
      residentDoctors,
      isLoadingResidents,
      user,
      handleAddToMyList,
      handleAddToDoctorList,
      handleView,
      handleViewReferred,
      handleEdit,
      handleExport,
      handleCompleteReferral,
      handleReferredClinicalProforma,
      handleReferredIntakeRecord,
      handleDelete,
    ]
  );

  const columns = useMemo(
    () => [
    {
      header: (
        <div className="flex items-center gap-2">
          <FiFileText className="w-4 h-4 text-primary-600" />
          <span className="font-semibold">CR No</span>
        </div>
      ),
      accessor: 'cr_no',
      render: (row) => (
        <span className="font-medium text-gray-900 tabular-nums">{row.cr_no || 'N/A'}</span>
      ),
    },
    {
      header: (
        <div className="flex items-center gap-2">
          <FiUsers className="w-4 h-4 text-primary-600" />
          <span className="font-semibold">Patient Info</span>
        </div>
      ),
      render: (row) => (
        <div className="min-w-[10rem] max-w-[14rem]">
          <p className="font-medium text-gray-900 truncate" title={row.name}>
            {row.name}
            {row.patient_type === 'child' && (
              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700">
                Child
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {row.patient_type === 'child' ? row.age_group || '—' : `${row.age ?? '—'} yrs`}
            <span className="mx-1 text-gray-300">·</span>
            {row.sex || '—'}
          </p>
        </div>
      ),
    },
    ...(isReferredTab
      ? [
          {
            header: (
              <div className="flex items-center gap-2">
                <FiUsers className="w-4 h-4 text-primary-600" />
                <span className="font-semibold">
                  {referralSubView === 'by_me' ? 'Referred To' : 'Referred By'}
                </span>
              </div>
            ),
            render: (row) => (
              <div className="space-y-0.5">
                {referralSubView === 'by_me' ? (
                  <>
                    <span className="font-medium text-gray-900">{row.referred_to_name || 'N/A'}</span>
                    {row.referred_to_sub_role ? (
                      <p className="text-xs text-gray-500">{getResidentSubRoleLabel(row.referred_to_sub_role)}</p>
                    ) : row.referred_to_role ? (
                      <p className="text-xs text-gray-500">{row.referred_to_role}</p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <span className="font-medium text-gray-900">{row.referred_by_name || 'N/A'}</span>
                    {row.referred_by_sub_role ? (
                      <p className="text-xs text-gray-500">{getResidentSubRoleLabel(row.referred_by_sub_role)}</p>
                    ) : row.referred_by_role ? (
                      <p className="text-xs text-gray-500">{row.referred_by_role}</p>
                    ) : null}
                  </>
                )}
              </div>
            ),
          },
          {
            header: (
              <div className="flex items-center gap-2">
                <FiFileText className="w-4 h-4 text-primary-600" />
                <span className="font-semibold">Reason</span>
              </div>
            ),
            render: (row) => (
              <p className="text-sm text-gray-700 max-w-xs line-clamp-3" title={row.referral_reason || ''}>
                {row.referral_reason?.trim() ? row.referral_reason : '—'}
              </p>
            ),
          },
          {
            header: (
              <div className="flex items-center gap-2">
                <FiShield className="w-4 h-4 text-primary-600" />
                <span className="font-semibold">Status</span>
              </div>
            ),
            render: (row) => {
              const st = (row.referral_status || 'pending').toLowerCase();
              const styles =
                st === 'completed'
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : st === 'seen'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : st === 'revoked' || st === 'cancelled'
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : 'bg-amber-100 text-amber-900 border-amber-200';
              const label =
                st === 'completed'
                  ? 'Completed'
                  : st === 'seen'
                    ? 'Seen'
                    : st === 'revoked' || st === 'cancelled'
                      ? 'Revoked'
                      : 'Pending';
              return (
                <Badge className={`border ${styles}`}>
                  {label}
                </Badge>
              );
            },
          },
        ]
      : []),
    ...(isUnassignedTab
      ? [
          {
            header: (
              <div className="flex items-center gap-2">
                <FiShield className="w-4 h-4 text-amber-600" />
                <span className="font-semibold">Room</span>
              </div>
            ),
            render: (row) => (
              <span className="font-medium text-gray-900">
                {row.assigned_room?.trim() ? row.assigned_room : '—'}
              </span>
            ),
          },
        ]
      : []),
    // {
    //   header: (
    //     <div className="flex items-center gap-2">
    //       <FiShield className="w-4 h-4 text-primary-600" />
    //       <span className="font-semibold">Doctor</span>
    //     </div>
    //   ),
    //   render: (row) => (
    //     row.assigned_doctor_name ? (
    //       <div className="flex items-center gap-2">
    //         <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
    //           <FiUsers className="w-4 h-4 text-purple-600" />
    //         </div>
    //         <div>
    //           <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-200">
    //             {row.assigned_doctor_name}
    //           </Badge>
    //           <p className="text-xs text-gray-500 mt-1">{row.assigned_doctor_role}</p>
    //         </div>
    //       </div>
    //     ) : (
    //       <div className="flex items-center gap-2">
    //         <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
    //           <FiUsers className="w-4 h-4 text-gray-400" />
    //         </div>
    //         <span className="text-gray-400 text-sm">Unassigned</span>
    //       </div>
    //     )
    //   ),
    // },
    ...(!isReferredTab
      ? [
          {
            header: (
              <div className="flex items-center gap-2">
                <FiFileText className="w-4 h-4 text-primary-600" />
                <span className="font-semibold">
                  {isUnassignedTab
                    ? unassignedSubView === 'child'
                      ? 'CGC No'
                      : 'PSY No'
                    : isTotalPatientsTab
                      ? totalSubView === 'child'
                        ? 'CGC No'
                        : 'PSY No'
                      : patientType === 'child'
                        ? 'CGC No'
                        : 'PSY No'}
                </span>
              </div>
            ),
            accessor: 'psy_no',
            render: (row) => (
              <span className="font-medium text-gray-900 tabular-nums">
                {row.patient_type === 'child'
                  ? row.special_clinic_no || 'N/A'
                  : row.psy_no || 'N/A'}
              </span>
            ),
          },
        ]
      : []),
    {
      header: (
        <div className="flex items-center gap-2">
          {/* <FiMoreVertical className="w-4 h-4 text-primary-600" /> */}
          <span className="font-semibold">{isUnassignedTab ? 'Action' : 'Actions'}</span>
        </div>
      ),
      render: renderPatientActions,
    },
  ],
    [
      patientType,
      isReferredTab,
      isUnassignedTab,
      isTotalPatientsTab,
      unassignedSubView,
      totalSubView,
      referralSubView,
      renderPatientActions,
    ]
  );

  return (
    <div className="max-w-[1600px] mx-auto w-full">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 pb-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{patientsTabTitle}</h1>
            {isJuniorResidentUser(user) &&
              !isReferredTab &&
              !isUnassignedTab &&
              !isTotalPatientsTab && (
              <p className="text-sm text-gray-600 mt-1">
                Patients assigned to you when you select your room for the day.
              </p>
            )}
            {isSeniorResidentUser(user) &&
              !isReferredTab &&
              !isUnassignedTab &&
              !isTotalPatientsTab && (
              <p className="text-sm text-gray-600 mt-1">
                Patients linked to you through room assignment, walk-in clinical proforma, or visits.
              </p>
            )}
            {isTotalPatientsTab && canSeeTotalPatientsTab(user) && (
              <p className="text-sm text-gray-600 mt-1">
                All registered patients in the department. Use Adult / Child below to switch lists.
              </p>
            )}
            {isReferredTab && (
              <p className="text-sm text-gray-600 mt-1">
                {referralSubView === 'by_me'
                  ? 'Patients you referred to other doctors. Actions: View Details, Clinical Proforma, Intake Record, and Complete (bottom-right).'
                  : 'Patients referred to you. Actions: View Details, Clinical Proforma, Intake Record, and Complete (bottom-right).'}
              </p>
            )}
            {/* {isUnassignedTab && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
                <p className="font-medium text-amber-900">What is this tab?</p>
                <p className="mt-1 text-amber-800/95">
                  {unassignedSubView === 'child' ? (
                    <>
                      Child patients <strong>not linked to any treating doctor</strong> yet (no follow-up visit or clinical proforma tied to a doctor).
                      Use <strong>Add to my list</strong> to assign them to yourself; they will leave this list and appear under Child Patients in your patient list.
                    </>
                  ) : (
                    <>
                      Adult patients <strong>not linked to any treating doctor</strong> yet (no assigned doctor on their record).
                      They often appear here after PWO registration before a doctor selects today&apos;s room.
                      Use <strong>Add to my list</strong> to assign them to yourself; they will leave this list and appear under Adult Patients in your patient list.
                    </>
                  )}
                </p>
              </div>
            )} */}
          </div>
          <div className="mt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-thin">
            <div className="flex gap-0.5 border-b border-gray-200 min-w-max">
              <button
                type="button"
                onClick={() => setPatientType('adult')}
                className={`px-4 sm:px-5 py-2.5 font-semibold text-sm whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  patientType === 'adult'
                    ? 'border-primary-600 text-primary-600 bg-primary-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                aria-current={patientType === 'adult' ? 'page' : undefined}
              >
                {patientListTabLabels.adult}
              </button>
              <button
                type="button"
                onClick={() => setPatientType('child')}
                className={`px-4 sm:px-5 py-2.5 font-semibold text-sm whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  patientType === 'child'
                    ? 'border-primary-600 text-primary-600 bg-primary-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                aria-current={patientType === 'child' ? 'page' : undefined}
              >
                {patientListTabLabels.child}
              </button>
              {canReferPatients(user) && (
                <button
                  type="button"
                  onClick={() => {
                    setPatientType('referred');
                    setReferralSubView('to_me');
                  }}
                  className={`px-4 sm:px-5 py-2.5 font-semibold text-sm whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    patientType === 'referred'
                      ? 'border-primary-600 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  aria-current={patientType === 'referred' ? 'page' : undefined}
                >
                  {patientListTabLabels.referred}
                </button>
              )}
              {canSeeTotalPatientsTab(user) && (
                <button
                  type="button"
                  onClick={() => {
                    setPatientType('total');
                    setTotalSubView('adult');
                  }}
                  className={`px-4 sm:px-5 py-2.5 font-semibold text-sm whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    patientType === 'total'
                      ? 'border-primary-600 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  aria-current={patientType === 'total' ? 'page' : undefined}
                >
                  {patientListTabLabels.total}
                </button>
              )}
              {canSeeUnassignedPatientsTab(user) && (
                <button
                  type="button"
                  onClick={() => {
                    setPatientType('unassigned');
                    setUnassignedSubView('adult');
                  }}
                  className={`px-4 sm:px-5 py-2.5 font-semibold text-sm whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    patientType === 'unassigned'
                      ? 'border-primary-600 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  aria-current={patientType === 'unassigned' ? 'page' : undefined}
                >
                  {patientListTabLabels.unassigned}
                </button>
              )}
            </div>
          </div>

          {currentError && (
            <div className="mx-4 sm:mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-red-100 rounded-lg flex-shrink-0">
                  <FiShield className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-red-800 font-semibold text-base mb-1">Error Loading Patients</p>
                  <p className="text-red-600 text-sm">{currentError?.data?.message || 'Failed to load patients. Please try again.'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 sm:px-6 py-4 border-y border-gray-100 bg-slate-50/50 space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
              <div className="flex-1 min-w-0 relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiSearch className="w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <Input
                  placeholder={
                    isReferredTab
                      ? 'Search by CR No, patient name, referrer, reason...'
                      : isUnassignedTab
                        ? unassignedSubView === 'child'
                          ? 'Search by CR No, Child Name, CGC No, Room...'
                          : 'Search by CR No, Patient Name, PSY No, Room...'
                        : isTotalPatientsTab
                          ? totalSubView === 'child'
                            ? 'Search by CR No, Child Name, CGC No...'
                            : 'Search by CR No, Patient Name, PSY No, Doctor...'
                          : patientType === 'child'
                            ? 'Search by CR No, Child Name, CGC No...'
                            : 'Search by CR No, Patient Name, PSY No...'
                  }
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 pr-12 h-12 w-full bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-200 shadow-sm"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                {!isMWO(user?.role) && canReferPatients(user) && isReferredTab && (
                  <Button
                    type="button"
                    onClick={() => setBulkReferModalOpen(true)}
                    className="h-12 px-4 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 shadow-md whitespace-nowrap"
                  >
                    <FiUserPlus className="mr-2" />
                    Refer Patient(s)
                  </Button>
                )}
                {!isMWO(user?.role) && !isReferredTab && !isUnassignedTab && (
                  <Link
                    to={
                      (isTotalPatientsTab ? totalSubView : patientType) === 'child'
                        ? '/child-patient/new'
                        : '/patients/new'
                    }
                  >
                    <Button className="h-12 px-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-md whitespace-nowrap">
                      <FiPlus className="mr-2" />
                      {(isTotalPatientsTab ? totalSubView : patientType) === 'child'
                        ? 'Add Child Patient'
                        : 'Add Patient'}
                    </Button>
                  </Link>
                )}
                <PatientListFilters
                  appliedFilters={listFilters}
                  onApply={setListFilters}
                  onReset={() => setListFilters(PATIENT_LIST_EMPTY_FILTERS)}
                  isLoading={currentIsLoading || currentIsFetching}
                />
                <Button
                  variant="outline"
                  className="h-12 px-4 bg-white border-2 border-gray-200 hover:bg-gray-50 shadow-sm whitespace-nowrap disabled:opacity-50"
                  onClick={() => setIsExportModalOpen(true)}
                  disabled={filteredPatients.length === 0 && (!data?.data?.patients || data.data.patients.length === 0)}
                >
                  <FiDownload className="mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <PatientListActiveFilters
              appliedFilters={listFilters}
              onClear={(key) =>
                setListFilters((prev) => ({ ...prev, [key]: '' }))
              }
              onClearAll={() => setListFilters(PATIENT_LIST_EMPTY_FILTERS)}
            />

            {isReferredTab && (
              <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setReferralSubView('to_me')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                    referralSubView === 'to_me'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Referred to Me
                </button>
                <button
                  type="button"
                  onClick={() => setReferralSubView('by_me')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                    referralSubView === 'by_me'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  My Referrals
                </button>
              </div>
            )}
            {isTotalPatientsTab && (
              <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setTotalSubView('adult')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                    totalSubView === 'adult'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Adult Patients
                </button>
                <button
                  type="button"
                  onClick={() => setTotalSubView('child')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                    totalSubView === 'child'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Child Patients
                </button>
              </div>
            )}
            {isUnassignedTab && (
              <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setUnassignedSubView('adult')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                    unassignedSubView === 'adult'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Adult Unassigned Patient
                </button>
                <button
                  type="button"
                  onClick={() => setUnassignedSubView('child')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                    unassignedSubView === 'child'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Child Unassigned Patient
                </button>
              </div>
            )}
          </div>

          <div className="px-4 sm:px-6 py-4">
          {(currentIsLoading || currentIsFetching) ? (
            <div className="flex flex-col items-center justify-center py-14">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FiUsers className="w-8 h-8 text-primary-600" />
                </div>
              </div>
              <p className="mt-6 text-gray-600 font-medium text-lg">Loading patients...</p>
              <p className="mt-2 text-gray-500 text-sm">Please wait while we fetch the data</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
                <FiUsers className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-xl font-semibold text-gray-700 mb-2">No patients found</p>
              <p className="text-gray-500 text-center max-w-md">
                {search 
                  ? `No patients match your search "${search}". Try searching by ${isUnassignedTab ? (unassignedSubView === 'child' ? 'CR No, Child Name, CGC No, or Room' : 'CR No, Patient Name, PSY No, or Room') : isTotalPatientsTab ? (totalSubView === 'child' ? 'CR No, Child Name, or CGC No' : 'CR No, Patient Name, PSY No, or Doctor') : patientType === 'child' ? 'CR No, Child Name, CGC No' : 'CR No, Patient Name, PSY No, Doctor Name, or Doctor Role'}.`
                  : isUnassignedTab
                    ? unassignedSubView === 'child'
                      ? 'No unassigned child patients found. All child registrations are linked to a treating doctor.'
                      : 'No unassigned adult patients found. All registered adults are linked to a treating doctor.'
                    : isTotalPatientsTab
                      ? totalSubView === 'child'
                        ? 'No child patients registered in the system yet.'
                        : 'No adult patients registered in the system yet.'
                    : allPatients?.length === 0
                      ? `There are no ${patientType} patients in the system yet.`
                      : 'No patients match the current filters. Try adjusting your search criteria.'}
              </p>
              {search && (
                <Button
                  onClick={() => setSearch('')}
                  variant="outline"
                  className="mt-4"
                >
                  <FiX className="mr-2" />
                  Clear Search
                </Button>
              )}
              {user?.role !== 'MWO' && !search && allPatients?.length === 0 && (
                <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center justify-center">
                  {canReferPatients(user) && isReferredTab && (
                    <Button
                      type="button"
                      onClick={() => setBulkReferModalOpen(true)}
                      className="bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 shadow-lg"
                    >
                      <FiUserPlus className="mr-2" />
                      Refer Existing Patient(s)
                    </Button>
                  )}
                  {!isReferredTab && !isUnassignedTab && (
                    <Link to={patientType === 'child' ? '/child-patient/new' : '/patients/new'}>
                      <Button variant="outline" className="border-2 border-primary-200">
                        <FiPlus className="mr-2" />
                        {patientType === 'child' ? 'Register First Child Patient' : 'Register New Patient'}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Search Results Info */}
              {search && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">{totalFiltered}</span> patient(s) found matching "<span className="font-semibold">{search}</span>"
                    {totalPages > 1 && (
                      <span className="ml-2 text-blue-600">(Page {page} of {totalPages})</span>
                    )}
                  </p>
                </div>
              )}
              
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <Table
                  key={isUnassignedTab ? `unassigned-${unassignedSubView}` : patientType}
                  columns={columns}
                  data={filteredPatients}
                  loading={isLoading}
                  flush
                />
              </div>
            </>
          )}
          </div>

          {filteredPatients.length > 0 && !currentIsLoading && !currentIsFetching && (
            <Pagination
              currentPage={page}
              totalPages={Math.max(totalPages, 1)}
              totalItems={totalFiltered}
              itemsPerPage={limit}
              onPageChange={setPage}
            />
          )}
      </div>

      <BulkReferPatientsModal
        isOpen={bulkReferModalOpen}
        onClose={() => setBulkReferModalOpen(false)}
        currentUserId={user?.id}
        onSuccess={() => refetch()}
      />

      <ReferPatientModal
        isOpen={!!referModalPatient}
        onClose={() => setReferModalPatient(null)}
        patient={referModalPatient}
        currentUserId={user?.id}
        onSuccess={() => refetch()}
      />

      {/* Export Date Range Modal */}
      <ExportDateRangeModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExportAll}
      />

      {/* Revoke Referral Confirmation Modal */}
      {revokeConfirmRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 bg-red-50 border-b border-red-100">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                <FiXCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-red-800">Revoke Referral</h3>
                <p className="text-xs text-red-600">This action cannot be undone</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700 leading-relaxed">
                Are you sure you want to revoke this referral? The patient{' '}
                <span className="font-semibold text-gray-900">
                  {revokeConfirmRow.name || 'this patient'}
                </span>{' '}
                will no longer be visible to{' '}
                <span className="font-semibold text-gray-900">
                  Dr. {revokeConfirmRow.referred_to_name || 'the selected doctor'}
                </span>
                .
              </p>
            </div>
            <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevokeConfirmRow(null)}
                disabled={isRevoking}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 border-transparent disabled:opacity-60"
              >
                {isRevoking ? 'Revoking…' : 'Yes, Revoke Referral'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsPage;

