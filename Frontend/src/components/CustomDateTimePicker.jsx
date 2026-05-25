import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiCalendar, FiClock, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const pad = (n) => String(n).padStart(2, '0');

const toValue = (d) =>
  d && !Number.isNaN(d.getTime())
    ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    : '';

const parseValue = (v) => {
  if (!v) return null;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDisplay = (d) =>
  d
    ? d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

/** Simple date + time picker. value/onChange: `YYYY-MM-DDTHH:mm` */
const CustomDateTimePicker = ({
  label,
  name,
  value,
  onChange,
  placeholder = 'Select date and time',
  required = false,
  icon: Icon = FiClock,
  error,
  className = '',
  disabled = false,
  min,
  max,
  dropdownZIndex = 1000000,
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseValue(value) || new Date());
  const [month, setMonth] = useState(() => {
    const d = parseValue(value) || new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 300 });

  const selected = parseValue(value);
  const h12 = draft.getHours() % 12 || 12;
  const pm = draft.getHours() >= 12;

  useEffect(() => {
    const d = parseValue(value);
    if (d) {
      setDraft(d);
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [value]);

  const emit = (d) => onChange?.({ target: { name, value: d ? toValue(d) : '' } });

  const update = (d) => {
    setDraft(d);
    emit(d);
  };

  const setTime = (h12v, min, isPm) => {
    let h = isPm ? (h12v === 12 ? 12 : h12v + 12) : h12v === 12 ? 0 : h12v;
    const next = new Date(draft);
    next.setHours(h, min, 0, 0);
    update(next);
  };

  const days = useMemo(() => {
    const start = new Date(month);
    start.setDate(1 - start.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { d, inMonth: d.getMonth() === month.getMonth() };
    });
  }, [month]);

  const dayDisabled = (d) => {
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (min && iso < min.slice(0, 10)) return true;
    if (max && iso > max.slice(0, 10)) return true;
    return false;
  };

  const placePanel = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const w = Math.min(300, window.innerWidth - 16);
    let left = Math.min(r.left, window.innerWidth - w - 8);
    let top = r.bottom + 6;
    if (top + 320 > window.innerHeight) top = Math.max(8, r.top - 320);
    setPos({ top, left, width: w });
  };

  useEffect(() => {
    if (!open) return;
    placePanel();
    const fn = () => placePanel();
    window.addEventListener('resize', fn);
    window.addEventListener('scroll', fn, true);
    return () => {
      window.removeEventListener('resize', fn);
      window.removeEventListener('scroll', fn, true);
    };
  }, [open]);

  useEffect(() => {
    const close = (e) => {
      if (wrapRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    if (open) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const selectDay = (cell) => {
    if (!cell.inMonth || dayDisabled(cell.d)) return;
    const next = new Date(draft);
    next.setFullYear(cell.d.getFullYear(), cell.d.getMonth(), cell.d.getDate());
    update(next);
  };

  const today = new Date();

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
          {Icon && <Icon className="w-4 h-4 text-primary-600 shrink-0" />}
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              placePanel();
              setOpen((o) => !o);
            }
          }}
          className={`w-full text-left pl-10 pr-10 py-2.5 rounded-lg border text-sm ${
            error
              ? 'border-red-400 bg-red-50'
              : open
                ? 'border-primary-500 ring-2 ring-primary-500/20 bg-white'
                : 'border-gray-300 bg-white hover:border-primary-400'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${!selected ? 'text-gray-400' : 'text-gray-900'}`}
        >
          {selected ? formatDisplay(selected) : placeholder}
        </button>
        {value && !disabled && (
          <button
            type="button"
            aria-label="Clear"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-600"
            onClick={() => {
              emit(null);
              setOpen(false);
            }}
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>

      {open &&
        !disabled &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: dropdownZIndex }}
            className="bg-white border border-gray-200 rounded-lg shadow-lg p-3"
          >
            {/* Month */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                className="p-1 rounded hover:bg-gray-100"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-gray-800">
                {MONTHS[month.getMonth()]} {month.getFullYear()}
              </span>
              <button
                type="button"
                className="p-1 rounded hover:bg-gray-100"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar */}
            <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-gray-500 mb-1">
              {DAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-3">
              {days.map((cell, i) => {
                const sel =
                  selected &&
                  cell.d.toDateString() === selected.toDateString();
                const off = !cell.inMonth || dayDisabled(cell.d);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={off}
                    onClick={() => selectDay(cell)}
                    className={`h-8 rounded text-xs font-medium ${
                      off
                        ? 'text-gray-300'
                        : sel
                          ? 'bg-primary-600 text-white'
                          : cell.inMonth && cell.d.toDateString() === today.toDateString()
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {cell.d.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Time — simple selects */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <FiClock className="w-4 h-4 text-gray-500 shrink-0" />
              <select
                className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
                value={h12}
                onChange={(e) => setTime(+e.target.value, draft.getMinutes(), pm)}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-gray-500">:</span>
              <select
                className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
                value={draft.getMinutes()}
                onChange={(e) => setTime(h12, +e.target.value, pm)}
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {pad(m)}
                  </option>
                ))}
              </select>
              <select
                className="w-16 border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
                value={pm ? 'PM' : 'AM'}
                onChange={(e) => setTime(h12, draft.getMinutes(), e.target.value === 'PM')}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>

            <div className="flex justify-between mt-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                className="text-xs text-gray-600 hover:text-primary-600"
                onClick={() => update(new Date())}
              >
                Now
              </button>
              <button
                type="button"
                className="text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 px-3 py-1 rounded"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default CustomDateTimePicker;
