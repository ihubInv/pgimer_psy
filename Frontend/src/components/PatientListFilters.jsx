import { useState, useEffect } from 'react';
import { FiFilter, FiX, FiCalendar } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Button from './Button';
import CustomDatePicker from './CustomDatePicker';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Chandigarh',
  'Puducherry',
];

const EMPTY_FILTERS = {
  state: '',
  gender: '',
  period: '',
  date_from: '',
  date_to: '',
};

const PERIOD_LABELS = {
  week: 'This week',
  month: 'This month',
};

const todayIso = () => new Date().toISOString().split('T')[0];

const formatChipDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const PatientListFilters = ({ appliedFilters, onApply, onReset, isLoading }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ ...EMPTY_FILTERS, ...appliedFilters });
  const maxDate = todayIso();

  useEffect(() => {
    if (open) {
      setDraft({ ...EMPTY_FILTERS, ...appliedFilters });
    }
  }, [open, appliedFilters]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const activeCount = [
    appliedFilters.state,
    appliedFilters.gender,
    appliedFilters.period,
    appliedFilters.date_from && appliedFilters.date_to ? 'date_range' : '',
  ].filter(Boolean).length;

  const handlePeriodChange = (period) => {
    setDraft((prev) => ({
      ...prev,
      period,
      ...(period ? { date_from: '', date_to: '' } : {}),
    }));
  };

  const handleDateFromChange = (e) => {
    const date_from = e.target.value;
    setDraft((prev) => ({
      ...prev,
      date_from,
      period: date_from || prev.date_to ? '' : prev.period,
    }));
  };

  const handleDateToChange = (e) => {
    const date_to = e.target.value;
    setDraft((prev) => ({
      ...prev,
      date_to,
      period: date_to || prev.date_from ? '' : prev.period,
    }));
  };

  const handleApply = () => {
    const date_from = draft.date_from || '';
    const date_to = draft.date_to || '';
    const period = draft.period || '';

    if ((date_from && !date_to) || (!date_from && date_to)) {
      toast.error('Please select both start and end dates for the date range');
      return;
    }
    if (date_from && date_to && date_from > date_to) {
      toast.error('Start date cannot be after end date');
      return;
    }

    onApply({
      state: draft.state || '',
      gender: draft.gender || '',
      period: date_from && date_to ? '' : period,
      date_from: date_from && date_to ? date_from : '',
      date_to: date_from && date_to ? date_to : '',
    });
    setOpen(false);
  };

  const handleReset = () => {
    setDraft({ ...EMPTY_FILTERS });
    onReset();
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={`h-12 px-4 border-2 shadow-sm whitespace-nowrap inline-flex items-center gap-2 ${
          activeCount > 0
            ? 'border-primary-400 bg-primary-50 text-primary-800'
            : 'border-gray-200 bg-white hover:bg-gray-50'
        }`}
        onClick={() => setOpen(true)}
        disabled={isLoading}
      >
        <FiFilter className="w-4 h-4 shrink-0" />
        <span>Filter</span>
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary-600 text-white text-xs font-bold">
            {activeCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            className="fixed inset-0 bg-black/45 backdrop-blur-sm"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          />
          <div
            className="relative z-[101] w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="patient-filter-title"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 id="patient-filter-title" className="text-base font-bold text-gray-900">
                Filter patients
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-gray-700">State</span>
                <select
                  value={draft.state}
                  onChange={(e) => setDraft({ ...draft, state: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                >
                  <option value="">All states</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Gender</span>
                <select
                  value={draft.gender}
                  onChange={(e) => setDraft({ ...draft, gender: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                >
                  <option value="">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Quick period</span>
                <select
                  value={draft.period}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                  disabled={Boolean(draft.date_from || draft.date_to)}
                >
                  <option value="">All time</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                </select>
              </label>

              <div className="sm:col-span-2 border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Registration date range
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Filter patients registered between two dates (IST). Overrides quick period when both dates are set.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CustomDatePicker
                    label="From date"
                    name="date_from"
                    value={draft.date_from}
                    onChange={handleDateFromChange}
                    max={draft.date_to || maxDate}
                    icon={<FiCalendar className="w-4 h-4" />}
                    dropdownZIndex={1000000}
                  />
                  <CustomDatePicker
                    label="To date"
                    name="date_to"
                    value={draft.date_to}
                    onChange={handleDateToChange}
                    min={draft.date_from}
                    max={maxDate}
                    icon={<FiCalendar className="w-4 h-4" />}
                    dropdownZIndex={1000000}
                  />
                </div>
                {draft.date_from && draft.date_to && draft.date_from > draft.date_to && (
                  <p className="mt-2 text-xs text-red-600">Start date must be on or before end date.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/80 rounded-b-2xl">
              <Button type="button" className="flex-1 h-11" onClick={handleApply} disabled={isLoading}>
                Apply filters
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11"
                onClick={handleReset}
                disabled={isLoading}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export function PatientListActiveFilters({ appliedFilters, onClear, onClearAll }) {
  const chips = [];
  if (appliedFilters.state) chips.push({ key: 'state', label: `State: ${appliedFilters.state}` });
  if (appliedFilters.gender) chips.push({ key: 'gender', label: `Gender: ${appliedFilters.gender}` });
  if (appliedFilters.period) {
    chips.push({ key: 'period', label: PERIOD_LABELS[appliedFilters.period] || appliedFilters.period });
  }
  if (appliedFilters.date_from && appliedFilters.date_to) {
    chips.push({
      key: 'date_range',
      label: `Registered: ${formatChipDate(appliedFilters.date_from)} – ${formatChipDate(appliedFilters.date_to)}`,
      clearKeys: ['date_from', 'date_to'],
    });
  }
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active:</span>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => {
            if (c.clearKeys) {
              c.clearKeys.forEach((k) => onClear(k));
            } else {
              onClear(c.key);
            }
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-100 text-primary-800 text-xs font-medium hover:bg-primary-200 transition-colors"
        >
          {c.label}
          <FiX className="w-3 h-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-primary-600 hover:text-primary-800 underline"
      >
        Clear all
      </button>
    </div>
  );
}

export default PatientListFilters;
export { EMPTY_FILTERS as PATIENT_LIST_EMPTY_FILTERS };
