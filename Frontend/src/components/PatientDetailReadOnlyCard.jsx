import React from 'react';

/**
 * Read-only field tile: light grey panel with blue left accent (Out-Patient card style).
 */
export function PatientDetailField({ label, value, className = '' }) {
  const display =
    value !== undefined && value !== null && String(value).trim() !== ''
      ? String(value)
      : 'N/A';
  return (
    <div
      className={`flex min-h-[72px] overflow-hidden rounded-lg border border-gray-200 bg-gray-100/90 ${className}`}
    >
      <div className="w-1 flex-shrink-0 bg-blue-600" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-gray-500">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-medium text-gray-900 sm:text-base">{display}</p>
      </div>
    </div>
  );
}

export function PatientDetailSectionTitle({ children }) {
  return (
    <h3 className="border-b border-gray-200 pb-3 text-lg font-bold uppercase tracking-wide text-blue-700 sm:text-xl">
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
  return (
    <div
      className={`relative mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
