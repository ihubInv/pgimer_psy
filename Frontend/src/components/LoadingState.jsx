import { memo } from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * Reusable LoadingState component
 */
const LoadingState = memo(({ 
  message = 'Loading...', 
  fullScreen = false,
  className = '' 
}) => {
  const containerClass = fullScreen 
    ? 'min-h-screen flex items-center justify-center' 
    : 'flex items-center justify-center py-12';

  return (
    <div className={`${containerClass} ${className}`}>
      <div className="text-center">
        <LoadingSpinner />
        {message && (
          <p className="mt-4 text-sm text-gray-600">{message}</p>
        )}
      </div>
    </div>
  );
});

LoadingState.displayName = 'LoadingState';

export default LoadingState;

