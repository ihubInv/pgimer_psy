import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useGetUserByIdQuery
} from '../../features/users/usersApiSlice';
import CreateUser from './CreateUser';
import LoadingSpinner from '../../components/LoadingSpinner';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { FiArrowLeft, FiAlertCircle } from 'react-icons/fi';

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Parse and validate user ID from URL
  const userId = id ? parseInt(id, 10) : null;

  // Validate ID is a valid number
  if (!userId || isNaN(userId) || userId <= 0) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Invalid user ID in URL</p>
        <Button
          className="mt-4"
          onClick={() => navigate('/users')}
        >
          Back to Users
        </Button>
      </div>
    );
  }

  // Fetch user data
  const { 
    data: userData, 
    isLoading: isLoadingUser, 
    isError: isErrorUser,
    error: userError 
  } = useGetUserByIdQuery(userId);

  const user = userData?.data?.user;

  // Loading state
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (isErrorUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <div className="text-center py-12">
            <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading User</h2>
            <p className="text-gray-600 mb-6">
              {userError?.data?.message || 'Failed to load user data'}
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FiArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="primary"
              >
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Not found state
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <div className="text-center py-12">
            <FiAlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">User Not Found</h2>
            <p className="text-gray-600 mb-6">
              The user you're trying to edit doesn't exist or has been deleted.
            </p>
            <Button
              onClick={() => navigate('/users')}
              variant="primary"
              className="flex items-center gap-2 mx-auto"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to Users
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <CreateUser 
      editMode={true}
      existingUser={user}
      userId={userId}
    />
  );
};

export default EditUser;

