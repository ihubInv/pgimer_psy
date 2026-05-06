import { FiClock } from 'react-icons/fi';

/**
 * Placeholder while the Child CAP detailed intake work-up is redesigned.
 * Replace usages with the restored form when CHILD_CAP_INTAKE_COMING_SOON is turned off in EditChildCapWorkup.jsx.
 */
export default function ChildCapIntakeComingSoon({ className = '' }) {
  return (
    <div
      className={`rounded-xl border border-dashed border-purple-300 bg-gradient-to-br from-purple-50/90 to-indigo-50/60 px-6 py-10 text-center ${className}`}
    >
      <FiClock className="mx-auto h-12 w-12 text-purple-400" aria-hidden />
      <h3 className="mt-4 text-lg font-semibold text-gray-900">Coming Soon</h3>
      <p className="mt-2 text-sm text-gray-600 max-w-lg mx-auto leading-relaxed">
        The Child &amp; Adolescent Psychiatry (CAP) detailed intake record is being updated. The full form will be
        available here in a future release.
      </p>
    </div>
  );
}
