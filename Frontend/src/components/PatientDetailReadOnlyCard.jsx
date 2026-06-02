import React, { createContext, useContext } from 'react';

export const ReadOnlyToneContext = createContext('neutral');

/** Wrap child/adult view-details content for calmer neutral field styling. */
export function ReadOnlyToneProvider({ tone = 'neutral', children }) {
  return (
    <ReadOnlyToneContext.Provider value={tone}>{children}</ReadOnlyToneContext.Provider>
  );
}

/**
 * Read-only field tile: light grey panel with optional left accent.
 * @param {'blue'|'neutral'} [accent='blue'] — neutral uses slate accent (cleaner for child view)
 */
export function PatientDetailField({ label, value, className = '', accent }) {
  const tone = useContext(ReadOnlyToneContext);
  const resolvedAccent = accent ?? (tone === 'neutral' ? 'neutral' : 'blue');
  const display =
    value !== undefined && value !== null && String(value).trim() !== ''
      ? String(value)
      : 'N/A';
  const accentBarClass = resolvedAccent === 'neutral' ? 'bg-slate-400' : 'bg-blue-600';
  return (
    <div
      className={`flex min-h-[72px] overflow-hidden rounded-lg border border-gray-200 bg-gray-50 ${className}`}
    >
      <div className={`w-1 flex-shrink-0 ${accentBarClass}`} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-gray-500">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-medium text-gray-900 sm:text-base">{display}</p>
      </div>
    </div>
  );
}

export function PatientDetailSectionTitle({ children, tone }) {
  const contextTone = useContext(ReadOnlyToneContext);
  const resolvedTone = tone ?? contextTone;
  const titleClass = resolvedTone === 'neutral' ? 'text-gray-900' : 'text-blue-700';
  return (
    <h3
      className={`border-b border-gray-200 pb-3 text-lg font-bold uppercase tracking-wide sm:text-xl ${titleClass}`}
    >
      {children}
    </h3>
  );
}

export function PatientDetailFieldGroup({ children, className = '' }) {
  return (
    <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${className}`}>{children}</div>
  );
}

export function PatientDetailCardShell({ children, className = '' }) {
  const shellClass = 'border-gray-200 bg-white shadow-sm';
  return (
    <div
      className={`relative mb-6 overflow-hidden rounded-xl border ${shellClass} ${className}`}
    >
      {children}
    </div>
  );
}
