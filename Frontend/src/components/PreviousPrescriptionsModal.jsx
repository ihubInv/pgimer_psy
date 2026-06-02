import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FiPackage,
  FiPrinter,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
  FiX,
} from 'react-icons/fi';
import Modal from './Modal';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { useGetPrescriptionsByPatientIdQuery } from '../features/prescriptions/prescriptionApiSlice';
import { usePatientForPrescriptionPrint } from '../hooks/usePatientForPrescriptionPrint';
import { formatDate } from '../utils/formatters';
import {
  buildPrescriptionPrintHtml,
  openPrescriptionPrintWindow,
} from '../utils/prescriptionPrint';

const toDateKey = (dateInput) => {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } catch {
    return '';
  }
};

/**
 * Lists all saved prescriptions for a patient, grouped by date, with per-record Print.
 */
export default function PreviousPrescriptionsModal({
  isOpen,
  onClose,
  patientId,
  patientInfo: patientInfoProp,
  patientType,
}) {
  const [expandedDates, setExpandedDates] = useState({});

  const skipFetch = !patientId || !isOpen;

  const { data, isLoading, isFetching } = useGetPrescriptionsByPatientIdQuery(patientId, {
    skip: skipFetch,
    refetchOnMountOrArgChange: true,
  });

  const { patientForPrint, isLoadingPatient } = usePatientForPrescriptionPrint(patientId, {
    patientType,
    apiPatient: data?.data?.patient,
    skip: skipFetch || !!patientInfoProp?.name,
  });

  const resolvedPatient = patientInfoProp?.name ? patientInfoProp : patientForPrint;

  const dateGroups = useMemo(() => {
    const raw = data?.data?.prescriptions || [];
    const byDate = {};

    raw.forEach((rec) => {
      const meds = Array.isArray(rec.prescription)
        ? rec.prescription.filter((m) => m.medicine || m.dosage || m.frequency || m.details)
        : [];
      if (meds.length === 0) return;

      const dateKey = toDateKey(rec.visit_date || rec.created_at) || 'unknown';
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          dateKey,
          dateLabel:
            dateKey === 'unknown'
              ? 'Unknown date'
              : formatDate(rec.visit_date || rec.created_at),
          items: [],
        };
      }
      byDate[dateKey].items.push({
        id: rec.id,
        meds,
        visitType: rec.visit_type,
        createdAt: rec.created_at,
        visitDate: rec.visit_date || rec.created_at,
        dateLabel: formatDate(rec.visit_date || rec.created_at),
      });
    });

    Object.values(byDate).forEach((g) => {
      g.items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    });

    return Object.values(byDate).sort((a, b) => {
      if (a.dateKey === 'unknown') return 1;
      if (b.dateKey === 'unknown') return -1;
      return b.dateKey.localeCompare(a.dateKey);
    });
  }, [data]);

  const toggleDate = (dateKey) => {
    setExpandedDates((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const handlePrint = (item) => {
    if (!resolvedPatient?.name) {
      toast.warning('Patient details are still loading. Please try again in a moment.');
      return;
    }

    const html = buildPrescriptionPrintHtml(resolvedPatient, item.meds, {
      prescriptionDate: item.dateLabel,
      visitType: item.visitType,
    });
    openPrescriptionPrintWindow(
      html,
      `Prescription - ${resolvedPatient.name} - ${item.dateLabel}`
    );
  };

  const totalRecords = dateGroups.reduce((n, g) => n + g.items.length, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Previous Prescriptions" size="xl">
      <p className="mb-4 text-sm text-gray-600">
        All prescriptions saved for this patient, grouped by date. Each print includes the
        patient&apos;s name, CR number, and other registration details on the prescription
        letterhead.
      </p>

      {isLoadingPatient ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <LoadingSpinner size="sm" />
          Loading patient details for print…
        </div>
      ) : resolvedPatient?.name ? (
        <div className="mb-4 rounded-lg border border-gray-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Patient (on print)
          </p>
          <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            <p>
              <span className="font-semibold text-gray-900">Name:</span>{' '}
              {resolvedPatient.name}
            </p>
            {resolvedPatient.cr_no && (
              <p>
                <span className="font-semibold text-gray-900">CR No.:</span>{' '}
                {resolvedPatient.cr_no}
              </p>
            )}
            {(resolvedPatient.age || resolvedPatient.sex) && (
              <p>
                <span className="font-semibold text-gray-900">Age / Sex:</span>{' '}
                {[resolvedPatient.age, resolvedPatient.sex].filter(Boolean).join(', ')}
              </p>
            )}
            {resolvedPatient.cgc_number && (
              <p>
                <span className="font-semibold text-gray-900">CGC No.:</span>{' '}
                {resolvedPatient.cgc_number}
              </p>
            )}
            {resolvedPatient.psy_no && (
              <p>
                <span className="font-semibold text-gray-900">PSY No.:</span>{' '}
                {resolvedPatient.psy_no}
              </p>
            )}
            {resolvedPatient.mobile_no && (
              <p>
                <span className="font-semibold text-gray-900">Mobile:</span>{' '}
                {resolvedPatient.mobile_no}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Patient registration details could not be loaded. Prints may not include the patient
          name until the record is available.
        </div>
      )}

      {isLoading || isFetching ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : totalRecords === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
          <FiPackage className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-600">No previous prescriptions found</p>
          <p className="mt-1 text-sm text-gray-500">
            Prescriptions will appear here after you save them for this patient.
          </p>
        </div>
      ) : (
        <div className="max-h-[min(70vh,560px)] space-y-3 overflow-y-auto pr-1">
          {dateGroups.map((group) => {
            const expanded = expandedDates[group.dateKey] !== false;
            return (
              <div
                key={group.dateKey}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleDate(group.dateKey)}
                  className="flex w-full items-center justify-between gap-3 border-b border-gray-100 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
                      <FiCalendar className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{group.dateLabel}</p>
                      <p className="text-xs text-gray-500">
                        {group.items.length} prescription
                        {group.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {expanded ? (
                    <FiChevronUp className="h-5 w-5 shrink-0 text-gray-400" />
                  ) : (
                    <FiChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
                  )}
                </button>

                {expanded && (
                  <div className="space-y-3 p-4">
                    {group.items.map((item, idx) => (
                      <div
                        key={item.id || `${group.dateKey}-${idx}`}
                        className="rounded-lg border border-gray-100 bg-gray-50/80"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2">
                          <span className="text-sm font-medium text-gray-800">
                            Prescription {group.items.length > 1 ? `#${idx + 1}` : ''}
                            {item.visitType && (
                              <span className="ml-2 font-normal text-gray-500">
                                ({item.visitType.replace(/_/g, ' ')})
                              </span>
                            )}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(item)}
                            disabled={isLoadingPatient || !resolvedPatient?.name}
                            className="flex items-center gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                          >
                            <FiPrinter className="h-4 w-4" />
                            Print
                          </Button>
                        </div>
                        <div className="overflow-x-auto p-2">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-200 text-left text-gray-600">
                                <th className="px-2 py-1.5">#</th>
                                <th className="px-2 py-1.5">Medicine</th>
                                <th className="px-2 py-1.5">Dosage</th>
                                <th className="px-2 py-1.5">When</th>
                                <th className="px-2 py-1.5">Frequency</th>
                                <th className="px-2 py-1.5">Duration</th>
                                <th className="px-2 py-1.5">Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.meds.map((m, mi) => (
                                <tr key={mi} className="border-b border-gray-100 text-gray-800">
                                  <td className="px-2 py-1.5">{mi + 1}</td>
                                  <td className="px-2 py-1.5 font-medium">{m.medicine || '—'}</td>
                                  <td className="px-2 py-1.5">{m.dosage || '—'}</td>
                                  <td className="px-2 py-1.5">{m.when_to_take || m.when || '—'}</td>
                                  <td className="px-2 py-1.5">{m.frequency || '—'}</td>
                                  <td className="px-2 py-1.5">{m.duration || '—'}</td>
                                  <td className="px-2 py-1.5">{m.quantity || m.qty || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          <FiX className="mr-1 h-4 w-4" />
          Close
        </Button>
      </div>
    </Modal>
  );
}
