import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiShield, FiPhone, FiLock } from 'react-icons/fi';
import { 
  useCreateUserMutation, 
  useUpdateUserMutation,
  useEnable2FAForUserMutation,
  useDisable2FAForUserMutation,
  useGetUserByIdQuery
} from '../../features/users/usersApiSlice';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import Card from '../../components/Card';
import { IconInput } from '../../components/IconInput';
import Select from '../../components/Select';
import Button from '../../components/Button';
import { USER_ROLES, isAdmin } from '../../utils/constants';

const CreateUser = ({ editMode = false, existingUser = null, userId = null }) => {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [enable2FA, { isLoading: isEnabling2FA }] = useEnable2FAForUserMutation();
  const [disable2FA, { isLoading: isDisabling2FA }] = useDisable2FAForUserMutation();
  
  // Refetch user data when in edit mode to get updated 2FA status
  const { data: userData, refetch: refetchUser } = useGetUserByIdQuery(userId, {
    skip: !editMode || !userId,
  });
  
  // Use refetched user data if available, otherwise use existingUser prop
  const currentUserData = userData?.data?.user || existingUser;
  
  const isLoading = isCreating || isUpdating || isEnabling2FA || isDisabling2FA;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    role: '',
    // SECURITY FIX #2.11: Password fields removed - user will set password via secure setup link
  });

  const [errors, setErrors] = useState({});

  // Populate form when editing
  useEffect(() => {
    if (editMode && currentUserData) {
      setFormData({
        name: currentUserData.name || '',
        email: currentUserData.email || '',
        mobile: currentUserData.mobile || '',
        role: currentUserData.role || '',
        // SECURITY FIX #2.11: Password fields removed
      });
    }
  }, [editMode, currentUserData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      newErrors.mobile = 'Mobile number must be 10 digits and start with 6-9';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // SECURITY FIX #2.11: Password validation removed - user will set password via secure setup link
    // No password fields in create mode - user receives secure setup link via email

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      if (editMode) {
        // For edit mode, only send fields that can be updated (name, email, role, mobile)
        // Password is handled separately via reset-password endpoint
        await updateUser({ id: userId, ...formData }).unwrap();
        toast.success('User updated successfully!');
      } else {
        // SECURITY FIX #2.11: Create user without password - user will receive secure setup link
        await createUser(formData).unwrap();
        toast.success('User created successfully! Password setup link has been sent to the user\'s email.');
      }
      navigate('/users');
    } catch (err) {
      toast.error(err?.data?.message || (editMode ? 'Failed to update user' : 'Failed to create user'));
    }
  };

  const handleToggle2FA = async () => {
    if (!editMode || !userId || !isAdmin(currentUser?.role)) {
      return;
    }

    const isCurrentlyEnabled = currentUserData?.two_factor_enabled || false;

    try {
      if (isCurrentlyEnabled) {
        await disable2FA(userId).unwrap();
        toast.success('2FA disabled successfully for the user');
      } else {
        await enable2FA(userId).unwrap();
        toast.success('2FA enabled successfully for the user');
      }
      // Refetch user data to update the UI
      if (refetchUser) {
        await refetchUser();
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to toggle 2FA');
    }
  };

  const roleOptions = Object.entries(USER_ROLES).map(([key, value]) => ({
    value,
    label: value,
  }));

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8 z-10">
        <div className="w-full space-y-8">
          {/* Glassmorphism Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>
            <div className="relative backdrop-blur-xl bg-white/60 border border-white/80 rounded-3xl shadow-2xl p-6 lg:p-8">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1">
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                    {editMode ? 'Edit User' : 'Create New User'}
                  </h1>
                  <p className="text-gray-600 mt-2 text-sm lg:text-base">
                    {editMode ? 'Update user information and permissions' : 'Add a new system user with appropriate access rights'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Glassmorphism Form Card */}
          <form onSubmit={handleSubmit}>
            <div className="relative">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-3xl blur-2xl"></div>
              
              {/* Main Form Card */}
              <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
                <div className="space-y-6 lg:space-y-8 p-6 lg:p-8">
                  {/* Form Fields - Exactly 3 Rows, 2 Columns Each */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Row 1: Full Name | Email */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                      <div className="relative">
                        <IconInput
                          icon={<FiUser />}
                          label="Full Name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Enter full name"
                          error={errors.name}
                          required
                           className="h-14"
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                      <div className="relative">
                        <IconInput
                          icon={<FiMail />}
                          label="Email Address"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="user@pgimer.edu.in"
                          error={errors.email}
                          required
                           className="h-14"
                        />
                      </div>
                    </div>

                    {/* Row 2: Role | Mobile Number */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                      <div className="relative">
                        <Select
                          label="Role"
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          options={roleOptions}
                          error={errors.role}
                          required
                          className="h-14"
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl"></div>
                      <div className="relative">
                        <IconInput
                          icon={<FiPhone />}
                          label="Mobile Number"
                          type="number"
                          name="mobile"
                          value={formData.mobile}
                          onChange={handleChange}
                          placeholder="Enter mobile number"
                          error={errors.mobile}
                          required
                           className="h-14"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2FA Toggle Section - Only visible to Admin in Edit Mode */}
                  {editMode && isAdmin(currentUser?.role) && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                        <div className="relative backdrop-blur-sm bg-white/50 border border-gray-200/60 rounded-xl p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100/80 backdrop-blur-sm rounded-lg border border-blue-200/60">
                                <FiShield className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">Two-Factor Authentication (2FA)</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  Current status: <span className={`font-medium ${currentUserData?.two_factor_enabled ? 'text-green-600' : 'text-gray-500'}`}>
                                    {currentUserData?.two_factor_enabled ? 'Enabled' : 'Disabled'}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              onClick={handleToggle2FA}
                              loading={isEnabling2FA || isDisabling2FA}
                              variant={currentUserData?.two_factor_enabled ? "outline" : "primary"}
                              className={currentUserData?.two_factor_enabled 
                                ? "bg-white border-2 border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600 shadow-sm transition-all duration-200"
                                : "bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg"
                              }
                            >
                              <FiShield className="mr-2" />
                              {currentUserData?.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECURITY FIX #2.11: Password fields removed - user will receive secure setup link via email */}
                  {!editMode && (
                    <div className="relative mt-6">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl blur-sm"></div>
                      <div className="relative backdrop-blur-sm bg-blue-50/80 border border-blue-200/60 rounded-xl p-5 shadow-lg">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100/80 backdrop-blur-sm rounded-lg border border-blue-200/60">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-blue-800 font-semibold mb-1">Secure Password Setup</p>
                            <p className="text-sm text-blue-700">
                              The user will receive a secure password setup link via email. They must set their own password using this link, which expires in 24 hours. This ensures the admin never knows the user's password.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Edit Mode Note */}
                  {editMode && (
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl blur-sm"></div>
                      <div className="relative backdrop-blur-sm bg-blue-50/80 border border-blue-200/60 rounded-xl p-5 shadow-lg">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100/80 backdrop-blur-sm rounded-lg border border-blue-200/60">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-sm text-blue-800 flex-1">
                            <strong className="font-semibold">Note:</strong> To change the user's password, use the password reset feature from the user management page.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-4 pt-6 border-t border-white/40">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/users')}
                      className="backdrop-blur-sm bg-white/50 border-white/60 hover:bg-white/70 transition-all duration-300"
                    >
                      Cancel
                    </Button>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-indigo-500/30 rounded-lg blur-lg group-hover:blur-xl transition-all duration-300"></div>
                      <Button 
                        type="submit" 
                        loading={isLoading}
                        // className="relative backdrop-blur-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                    className="bg-gradient-to-r h-12 px-5 from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-200 whitespace-nowrap"
                      
                      >
                        {editMode ? 'Update User' : 'Create User'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateUser;

