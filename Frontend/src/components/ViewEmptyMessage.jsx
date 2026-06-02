import { FiFileText } from 'react-icons/fi';

/**
 * Standard empty state for view-only patient record sections.
 */
export default function ViewEmptyMessage({ message, description, icon: Icon = FiFileText }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-10 text-center">
      <Icon className="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p className="text-base font-medium text-gray-600">{message}</p>
      {description ? (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      ) : null}
    </div>
  );
}
