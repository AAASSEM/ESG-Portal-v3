import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const EmailVerification = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [verificationState, setVerificationState] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    if (!token) {
      setVerificationState('error');
      setMessage('Invalid verification link - no token provided.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        setVerificationState('success');
        setMessage(data.message);
        
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          navigate('/login?verified=true');
        }, 3000);
      } else {
        setVerificationState('error');
        setMessage(data.error || 'Email verification failed.');
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setVerificationState('error');
      setMessage('Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    // You could implement resend functionality here
    // For now, redirect to a resend page or show instructions
    setMessage('To resend verification email, please contact support or try signing up again.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4">
              {loading ? (
                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              ) : verificationState === 'success' ? (
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-check-circle text-green-600 text-2xl"></i>
                </div>
              ) : (
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-times-circle text-red-600 text-2xl"></i>
                </div>
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {loading ? 'Verifying Email...' : 
               verificationState === 'success' ? 'Email Verified!' : 
               'Verification Failed'}
            </h1>
            
            <p className={`text-sm ${
              verificationState === 'success' ? 'text-green-600' : 
              verificationState === 'error' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {loading ? 'Please wait while we verify your email address...' : message}
            </p>
          </div>

          <div className="space-y-4">
            {verificationState === 'success' && !loading && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <i className="fas fa-info-circle text-green-600 mr-2"></i>
                  <p className="text-sm text-green-800">
                    Redirecting to login page in 3 seconds...
                  </p>
                </div>
              </div>
            )}

            {verificationState === 'error' && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <i className="fas fa-exclamation-triangle text-red-600 mr-2"></i>
                  <p className="text-sm font-medium text-red-800">What to do next:</p>
                </div>
                <ul className="text-sm text-red-700 space-y-1 ml-6">
                  <li>• Check if the link has expired (valid for 24 hours)</li>
                  <li>• Make sure you clicked the correct link from your email</li>
                  <li>• Contact support if the problem persists</li>
                </ul>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Go to Login
              </button>
              
              {verificationState === 'error' && (
                <button
                  onClick={() => navigate('/signup')}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Sign Up Again
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-white text-sm">
          <p>© 2024 ESG Portal - Sustainable Business Management</p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;