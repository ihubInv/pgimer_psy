import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { 
  FiUser, FiLock, FiShield, FiCalendar, FiClock, 
  FiKey, FiCheckCircle, FiAlertCircle, FiEdit3, FiSave, FiX,
  FiEye, FiEyeOff
} from 'react-icons/fi';
import { selectCurrentUser } from '../features/auth/authSlice';
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useRequestPasswordChangeOTPMutation,
  useVerifyPasswordChangeOTPMutation,
  useChangePasswordMutation,
  useEnable2FAMutation,
  useDisable2FAMutation,
} from '../features/auth/authApiSlice';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { formatDate } from '../utils/formatters';
import { validatePassword, getPasswordRequirements } from '../utils/passwordValidation';
import { encryptPasswordForTransmission } from '../utils/passwordEncryption';

const Profile = () => {
  const user = useSelector(selectCurrentUser);
  const { data: profileData, isLoading } = useGetProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [requestPasswordChangeOTP, { isLoading: isRequestingOTP }] = useRequestPasswordChangeOTPMutation();
  const [verifyPasswordChangeOTP, { isLoading: isVerifyingOTP }] = useVerifyPasswordChangeOTPMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [enable2FA] = useEnable2FAMutation();
  const [disable2FA] = useDisable2FAMutation();

  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profileData?.data?.user) {
      setProfileForm({
        name: profileData.data.user.name || '',
        email: profileData.data.user.email || '',
      });
    }
  }, [profileData]);
  // Password change workflow state
  const [passwordChangeStep, setPasswordChangeStep] = useState(1); // 1: current password, 2: OTP, 3: new password
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [verificationToken, setVerificationToken] = useState(null);
  
  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // 2FA disable OTP modal state
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [disable2FAOTP, setDisable2FAOTP] = useState('');
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    
    // Validate password when newPassword changes
    if (name === 'newPassword') {
      const errors = validatePassword(value);
      setPasswordErrors(errors);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(profileForm).unwrap();
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update profile');
    }
  };

  // Step 1: Request OTP after verifying current password
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    
    if (!passwordForm.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    try {
      // SECURITY FIX #2.17: Encrypt password before transmission (mandatory)
      let currentPasswordEncryption;
      try {
        currentPasswordEncryption = await encryptPasswordForTransmission(passwordForm.currentPassword);
      } catch (encryptError) {
        console.error('[Security] Password encryption failed:', encryptError);
        toast.error('Security error: Unable to encrypt password. Please try again.');
        return;
      }
      
      await requestPasswordChangeOTP({
        currentPassword: currentPasswordEncryption.encrypted,
      }).unwrap();
      
      toast.success('OTP has been sent to your registered email address');
      setPasswordChangeStep(2); // Move to OTP verification step
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send OTP');
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!passwordForm.otp || passwordForm.otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      const result = await verifyPasswordChangeOTP({
        otp: passwordForm.otp.trim(),
      }).unwrap();
      
      setVerificationToken(result.data.verification_token);
      toast.success('OTP verified successfully! You can now set your new password');
      setPasswordChangeStep(3); // Move to new password step
    } catch (err) {
      toast.error(err?.data?.message || 'Invalid or expired OTP. Please try again.');
    }
  };

  // Step 3: Change password with verified token
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate password strength
    const errors = validatePassword(passwordForm.newPassword);
    if (errors.length > 0) {
      toast.error('Password does not meet requirements. Please check the requirements below.');
      setPasswordErrors(errors);
      return;
    }

    if (!verificationToken) {
      toast.error('Verification token missing. Please start the process again.');
      setPasswordChangeStep(1);
      return;
    }

    try {
      // SECURITY FIX #2.17: Encrypt password before transmission (mandatory)
      let newPasswordEncryption;
      try {
        newPasswordEncryption = await encryptPasswordForTransmission(passwordForm.newPassword);
      } catch (encryptError) {
        console.error('[Security] Password encryption failed:', encryptError);
        toast.error('Security error: Unable to encrypt password. Please try again.');
        return;
      }
      
      await changePassword({
        newPassword: newPasswordEncryption.encrypted,
        verification_token: verificationToken,
      }).unwrap();
      
      toast.success('Password changed successfully!');
      
      // Reset form and workflow
      setPasswordForm({
        currentPassword: '',
        otp: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors([]);
      setVerificationToken(null);
      setPasswordChangeStep(1);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to change password');
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (!passwordForm.currentPassword) {
      toast.error('Please enter your current password first');
      return;
    }

    try {
      // SECURITY FIX #2.17: Encrypt password before transmission (mandatory)
      let currentPasswordEncryption;
      try {
        currentPasswordEncryption = await encryptPasswordForTransmission(passwordForm.currentPassword);
      } catch (encryptError) {
        console.error('[Security] Password encryption failed:', encryptError);
        toast.error('Security error: Unable to encrypt password. Please try again.');
        return;
      }
      
      await requestPasswordChangeOTP({
        currentPassword: currentPasswordEncryption.encrypted,
      }).unwrap();
      
      setPasswordForm(prev => ({ ...prev, otp: '' }));
      toast.success('New OTP has been sent to your email');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to resend OTP');
    }
  };

  const handleEnable2FA = async () => {
    try {
      const result = await enable2FA().unwrap();
      // Show QR code or secret for user to scan
      toast.success('2FA enabled. Please scan the QR code in your authenticator app.');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to enable 2FA');
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable 2FA?')) {
      return;
    }
    
    try {
      // First request - backend will send OTP if none provided
      const result = await disable2FA({}).unwrap();
      
      // If OTP is required, show modal
      if (result.requires_otp || result.message?.includes('OTP has been sent')) {
        setShowDisable2FAModal(true);
        setDisable2FAOTP('');
        toast.info('OTP has been sent to your email. Please enter it to disable 2FA.');
      } else {
        // 2FA disabled successfully (shouldn't happen, but handle it)
        toast.success('2FA disabled successfully');
      }
    } catch (err) {
      // If error but OTP was sent, show modal
      if (err?.data?.message?.includes('OTP') || err?.data?.requires_otp) {
        setShowDisable2FAModal(true);
        setDisable2FAOTP('');
        toast.info('OTP has been sent to your email. Please enter it to disable 2FA.');
      } else {
        toast.error(err?.data?.message || 'Failed to disable 2FA');
      }
    }
  };
  
  const handleDisable2FAWithOTP = async () => {
    if (!disable2FAOTP || disable2FAOTP.trim().length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    
    setIsDisabling2FA(true);
    try {
      await disable2FA({ otp: disable2FAOTP.trim() }).unwrap();
      toast.success('2FA disabled successfully');
      setShowDisable2FAModal(false);
      setDisable2FAOTP('');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to disable 2FA. Please check your OTP and try again.');
    } finally {
      setIsDisabling2FA(false);
    }
  };
  
  const handleResendDisable2FAOTP = async () => {
    try {
      // Request new OTP
      await disable2FA({}).unwrap();
      setDisable2FAOTP('');
      toast.success('New OTP has been sent to your email');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to resend OTP');
    }
  };

  const profile = profileData?.data?.user || user;

  const tabs = [
    { id: 'profile', name: 'Profile', icon: FiUser },
    { id: 'security', name: 'Security', icon: FiLock },
    { id: '2fa', name: 'Two-Factor Auth', icon: FiShield },
  ];

  const getRoleBadgeColor = (role) => {
    const roleColors = {
      'Admin': 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200',
      'Faculty': 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200',
      'Resident': 'bg-gradient-to-r from-cyan-100 to-teal-100 text-cyan-800 border-cyan-200',
      'Psychiatric Welfare Officer': 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200',
    };
    return roleColors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <FiUser className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <p className="mt-6 text-gray-600 font-medium text-lg">Loading profile...</p>
          <p className="mt-2 text-gray-500 text-sm">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">

        {/* Enhanced Tabs */}
        <Card className="shadow-lg border border-gray-200/50 bg-white/90 backdrop-blur-sm overflow-hidden p-0">
          <div className="flex border-b border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 text-center font-semibold transition-all duration-200 relative ${
                  activeTab === tab.id
                    ? 'text-primary-600 bg-gradient-to-br from-primary-50 to-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-primary-600' : 'text-gray-500'}`} />
                  <span>{tab.name}</span>
                </div>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-primary-700"></div>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card className="shadow-lg border border-gray-200/50 bg-white/90 backdrop-blur-sm">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <FiUser className="w-5 h-5 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
              </div>
              <p className="text-gray-600 ml-12">View and update your personal information</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Account Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FiUser className="w-4 h-4 text-blue-600" />
                    </div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">User ID</label>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{profile.id}</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FiShield className="w-4 h-4 text-purple-600" />
                    </div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Role</label>
                  </div>
                  <Badge className={`${getRoleBadgeColor(profile.role)} font-semibold`}>
                    {profile.role}
                  </Badge>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-200/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <FiCalendar className="w-4 h-4 text-emerald-600" />
                    </div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Account Created</label>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(profile.created_at)}</p>
                </div>
                
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <FiClock className="w-4 h-4 text-amber-600" />
                    </div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Last Login</label>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {profile.last_login ? formatDate(profile.last_login) : <span className="text-gray-400 italic">Never</span>}
                  </p>
                </div>
              </div>

              {/* Update Information Section */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <FiEdit3 className="w-5 h-5 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Update Information</h3>
                </div>
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <Input
                      label="Full Name"
                      name="name"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                      className="bg-white"
                      required
                    />
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <Input
                      label="Email Address"
                      type="email"
                      name="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      className="bg-white"
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      loading={isUpdating}
                      className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg"
                    >
                      <FiSave className="mr-2" />
                      {isUpdating ? 'Updating...' : 'Update Profile'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </Card>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <Card className="shadow-lg border border-gray-200/50 bg-white/90 backdrop-blur-sm">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <FiLock className="w-5 h-5 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Change Password</h2>
              </div>
              <p className="text-gray-600 ml-12">Update your password to keep your account secure</p>
            </div>

            {/* Multi-step Password Change Workflow */}
            <div className="space-y-6">
              {/* Step Indicator */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center ${passwordChangeStep >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      passwordChangeStep >= 1 ? 'border-primary-600 bg-primary-50' : 'border-gray-300 bg-white'
                    }`}>
                      {passwordChangeStep > 1 ? <FiCheckCircle className="w-6 h-6" /> : <span>1</span>}
                    </div>
                    <span className="ml-2 text-sm font-medium">Current Password</span>
                  </div>
                  <div className={`w-12 h-0.5 ${passwordChangeStep >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center ${passwordChangeStep >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      passwordChangeStep >= 2 ? 'border-primary-600 bg-primary-50' : 'border-gray-300 bg-white'
                    }`}>
                      {passwordChangeStep > 2 ? <FiCheckCircle className="w-6 h-6" /> : <span>2</span>}
                    </div>
                    <span className="ml-2 text-sm font-medium">OTP Verification</span>
                  </div>
                  <div className={`w-12 h-0.5 ${passwordChangeStep >= 3 ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center ${passwordChangeStep >= 3 ? 'text-primary-600' : 'text-gray-400'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      passwordChangeStep >= 3 ? 'border-primary-600 bg-primary-50' : 'border-gray-300 bg-white'
                    }`}>
                      <span>3</span>
                    </div>
                    <span className="ml-2 text-sm font-medium">New Password</span>
                  </div>
                </div>
              </div>

              {/* Step 1: Current Password */}
              {passwordChangeStep === 1 && (
                <form onSubmit={handleRequestOTP} className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200/50">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none mt-0">
                      <FiKey className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                          type={showCurrentPassword ? "text" : "password"}
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                      required
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          {showCurrentPassword ? (
                            <FiEyeOff className="w-5 h-5" />
                          ) : (
                            <FiEye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        Enter your current password to receive an OTP via email
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      loading={isRequestingOTP}
                      className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg"
                      disabled={!passwordForm.currentPassword}
                    >
                      <FiLock className="mr-2" />
                      {isRequestingOTP ? 'Sending OTP...' : 'Request OTP'}
                    </Button>
                </div>
                </form>
              )}

              {/* Step 2: OTP Verification */}
              {passwordChangeStep === 2 && (
                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200/50">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>OTP Sent!</strong> Check your email ({profile?.email}) for the verification code.
                      </p>
                    </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enter OTP <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none mt-0">
                          <FiKey className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="otp"
                          value={passwordForm.otp}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setPasswordForm(prev => ({ ...prev, otp: value }));
                          }}
                          placeholder="000000"
                          maxLength={6}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-center text-2xl font-mono tracking-widest"
                          required
                          autoFocus
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        Enter the 6-digit code sent to your email
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between pt-4">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPasswordChangeStep(1);
                        setPasswordForm(prev => ({ ...prev, otp: '' }));
                      }}
                    >
                      <FiX className="mr-2" />
                      Back
                    </Button>
                    <div className="flex gap-3">
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={handleResendOTP}
                        disabled={isRequestingOTP}
                      >
                        Resend OTP
                      </Button>
                      <Button 
                        type="submit" 
                        loading={isVerifyingOTP}
                        className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg"
                        disabled={passwordForm.otp.length !== 6}
                      >
                        <FiLock className="mr-2" />
                        {isVerifyingOTP ? 'Verifying...' : 'Verify OTP'}
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* Step 3: New Password */}
              {passwordChangeStep === 3 && (
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200/50">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-green-800 flex items-center gap-2">
                        <FiCheckCircle className="w-4 h-4" />
                        <strong>OTP Verified!</strong> You can now set your new password.
                      </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                      <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none mt-0">
                      <FiKey className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                            type={showNewPassword ? "text" : "password"}
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password"
                            className={`w-full pl-10 pr-10 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white ${
                        passwordErrors.length > 0 && passwordForm.newPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      required
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                          >
                            {showNewPassword ? (
                              <FiEyeOff className="w-5 h-5" />
                            ) : (
                              <FiEye className="w-5 h-5" />
                            )}
                          </button>
                  </div>
                  {/* Password Requirements */}
                  {passwordForm.newPassword && (
                    <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <h5 className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</h5>
                      <ul className="text-xs space-y-1">
                        {getPasswordRequirements(passwordForm.newPassword).map((req, index) => (
                          <li key={index} className={`flex items-center ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
                            <span className="mr-2">{req.met ? '✓' : '○'}</span>
                            {req.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Show validation errors if any */}
                  {passwordErrors.length > 0 && passwordForm.newPassword && (
                    <div className="mt-2">
                      {passwordErrors.map((error, index) => (
                        <p key={index} className="text-xs text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="w-3 h-3" />
                          {error}
                  </p>
                      ))}
                    </div>
                  )}
                </div>

                      <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none mt-0">
                      <FiKey className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                            type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                      required
                    />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                          >
                            {showConfirmPassword ? (
                              <FiEyeOff className="w-5 h-5" />
                            ) : (
                              <FiEye className="w-5 h-5" />
                            )}
                          </button>
                  </div>
                  {passwordForm.newPassword && passwordForm.confirmPassword && 
                   passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <FiAlertCircle className="w-3 h-3" />
                      Passwords do not match
                    </p>
                  )}
                </div>
              </div>
                  </div>
                  <div className="flex justify-between pt-4">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPasswordChangeStep(2);
                        setPasswordForm(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
                      }}
                    >
                      <FiX className="mr-2" />
                      Back
                    </Button>
                <Button 
                  type="submit" 
                  loading={isChangingPassword}
                  className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg"
                  disabled={
                    (passwordForm.newPassword && passwordForm.confirmPassword && 
                     passwordForm.newPassword !== passwordForm.confirmPassword) ||
                    passwordErrors.length > 0 ||
                    !passwordForm.newPassword ||
                        !passwordForm.confirmPassword
                  }
                >
                  <FiLock className="mr-2" />
                  {isChangingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </form>
              )}
            </div>
          </Card>
        )}

        {/* 2FA Tab */}
        {activeTab === '2fa' && (
          <Card className="shadow-lg border border-gray-200/50 bg-white/90 backdrop-blur-sm">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <FiShield className="w-5 h-5 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h2>
              </div>
              <p className="text-gray-600 ml-12">
                Add an extra layer of security to your account with two-factor authentication
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200/50">
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Two-factor authentication adds an extra layer of security to your account.
                  When enabled, you'll need to enter a code from your authenticator app in addition to your password when logging in.
                </p>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${
                        profile.two_factor_enabled 
                          ? 'bg-gradient-to-br from-green-100 to-emerald-100' 
                          : 'bg-gradient-to-br from-gray-100 to-slate-100'
                      }`}>
                        {profile.two_factor_enabled ? (
                          <FiCheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <FiShield className="w-6 h-6 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">2FA Status</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Currently:</span>
                          <Badge 
                            className={profile.two_factor_enabled 
                              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200' 
                              : 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200'
                            }
                          >
                            {profile.two_factor_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {profile.two_factor_enabled ? (
                      <Button 
                        variant="outline"
                        onClick={handleDisable2FA}
                        className="bg-white border-2 border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600 shadow-sm transition-all duration-200"
                      >
                        <FiShield className="mr-2" />
                        Disable 2FA
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleEnable2FA}
                        className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg"
                      >
                        <FiShield className="mr-2" />
                        Enable 2FA
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {profile.two_factor_enabled && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200/50">
                  <div className="flex items-center gap-3">
                    <FiCheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">2FA is Active</p>
                      <p className="text-sm text-gray-600">
                        Your account is protected with two-factor authentication. You'll be prompted for a code from your authenticator app when logging in.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
      
      {/* 2FA Disable OTP Modal */}
      <Modal
        isOpen={showDisable2FAModal}
        onClose={() => {
          setShowDisable2FAModal(false);
          setDisable2FAOTP('');
        }}
        title="Disable Two-Factor Authentication"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>OTP Verification Required</strong>
            </p>
            <p className="text-sm text-blue-700 mt-2">
              An OTP has been sent to your email address. Please enter the 6-digit code to disable 2FA.
            </p>
          </div>
          
          <div>
            <Input
              label="Enter OTP"
              name="otp"
              type="text"
              value={disable2FAOTP}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setDisable2FAOTP(value);
              }}
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl font-mono tracking-widest"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDisable2FAModal(false);
                setDisable2FAOTP('');
              }}
              className="flex-1"
            >
              <FiX className="mr-2" />
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleResendDisable2FAOTP}
              className="flex-1"
            >
              Resend OTP
            </Button>
            <Button
              onClick={handleDisable2FAWithOTP}
              loading={isDisabling2FA}
              disabled={isDisabling2FA || disable2FAOTP.length !== 6}
              className="flex-1"
            >
              <FiShield className="mr-2" />
              Disable 2FA
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;

