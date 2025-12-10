import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, RefreshCw } from 'lucide-react';
import PGI_Logo from '../assets/PGI_Logo.png';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [isResending, setIsResending] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setOtp(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // SECURITY FIX: Token is stored in HttpOnly cookie by backend
      // Backend will read from cookie, but we can send token as fallback if cookie fails
      // Check if we have a token stored (from before the security fix)
      const storedToken = localStorage.getItem('resetToken');
      
      const response = await fetch('/api/users/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: Include cookies in request
        body: JSON.stringify({ 
          otp,
          ...(storedToken && { token: storedToken }) // Fallback: send token if available
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Token remains in HttpOnly cookie, no need to store client-side
        navigate('/reset-password');
      } else {
        setError(data.message || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    setError('');

    try {
      // Get email from localStorage or prompt user
      const email = localStorage.getItem('resetEmail') || prompt('Please enter your email address:');
      if (!email) {
        setIsResending(false);
        return;
      }

      localStorage.setItem('resetEmail', email);

      const response = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setError('');
        setTimeLeft(900); // Reset timer
        setOtp('');
        // SECURITY FIX: Token is stored in HttpOnly cookie by backend, not in localStorage
      } else {
        setError(data.message || 'Failed to resend OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
              <img src={PGI_Logo} alt="PGIMER Logo" className="h-8 w-8 object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">PGIMER Chandigarh</h2>
            <p className="text-sm text-gray-600">Electronic Medical Record System</p>
          </div>

          {/* OTP Verification Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify OTP</h2>
              <p className="text-gray-600">Enter the 6-digit code sent to your email address</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  OTP Code
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  value={otp}
                  onChange={handleOtpChange}
                  className="block w-full text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors py-4"
                  placeholder="000000"
                  maxLength={6}
                  autoComplete="off"
                />
              </div>

              {/* Timer */}
              <div className="text-center">
                {timeLeft > 0 ? (
                  <p className="text-sm text-gray-500">
                    Code expires in <span className="font-mono text-blue-600">{formatTime(timeLeft)}</span>
                  </p>
                ) : (
                  <p className="text-sm text-red-500">OTP has expired</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6 || timeLeft <= 0}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  'Verify OTP'
                )}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <button
                onClick={handleResendOTP}
                disabled={isResending || timeLeft > 0}
                className="w-full flex justify-center items-center py-2 px-4 text-sm font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
                {isResending ? 'Resending...' : timeLeft > 0 ? 'Resend in ' + formatTime(timeLeft) : 'Resend OTP'}
              </button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center text-gray-600 hover:text-gray-500 font-medium"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Post Graduate Institute of Medical Education & Research, Chandigarh
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
