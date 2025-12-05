import { memo } from 'react';
import { FiInbox, FiFileText, FiUsers, FiSearch } from 'react-icons/fi';
import Button from './Button';

/**
 * Reusable EmptyState component for displaying empty states
 */
const EmptyState = memo(({
  icon: Icon = FiInbox,
  title = 'No data found',
  message = 'There are no items to display.',
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 text-center max-w-md mb-4">{message}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;

