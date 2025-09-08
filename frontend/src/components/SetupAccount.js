import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const SetupAccount = () => {
  const navigate = useNavigate();
  const { user, checkAuthStatus } = useAuth();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // Check if user is authenticated and needs password setup
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        // Try to refresh auth status first
        await checkAuthStatus();
      } else {
        setUserInfo(user);
        
        // If user doesn't need password setup, redirect to appropriate page
        if (!user.must_reset_password) {
          // Redirect based on role
          const roleRedirects = {
            'super_user': '/onboard',
            'admin': '/onboard',
            'site_manager': '/onboard',
            'viewer': '/onboard',
            'meter_manager': '/meter',
            'uploader': '/data'
          };
          const redirectPath = roleRedirects[user.role] || '/dashboard';
          navigate(redirectPath);
        }
      }
    };
    
    checkUserStatus();
  }, [user, navigate, checkAuthStatus]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Please fill in both password fields');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // Use a temporary current password for new users
      // The backend should handle this case for users who were just created
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          current_password: 'temporary_setup_password', // Special flag for account setup
          new_password: formData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Get user role from current context
        const currentUserRole = user?.role || userInfo?.role;
        
        // Don't refresh auth status - user is already authenticated
        // Just update the must_reset_password flag in context if needed
        console.log(`✅ Password setup completed for role: ${currentUserRole}`);
        
        // Redirect based on user role immediately
        const roleRedirects = {
          'super_user': '/onboard',
          'admin': '/onboard', 
          'site_manager': '/onboard',
          'viewer': '/onboard',
          'meter_manager': '/meter',
          'uploader': '/data'
        };
        
        const redirectPath = roleRedirects[currentUserRole] || '/dashboard';
        console.log(`🎯 Redirecting user with role ${currentUserRole} to: ${redirectPath}`);
        
        // Add a small delay to ensure password is saved before redirect
        setTimeout(() => {
          navigate(redirectPath);
        }, 100);
      } else {
        setError(data.error || 'Failed to set up password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Error setting up password:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading if user info is not yet available
  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Setting up your account...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <i className="fas fa-key text-purple-600 text-2xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome to ESG Portal!</h2>
          <p className="text-gray-600 mt-2">
            Hi <span className="font-medium text-purple-600">{userInfo.name}</span>, please create your password to complete account setup.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-100 border border-red-200 text-red-800 rounded-lg">
              <div className="flex items-center">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <i className="fas fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200"
                placeholder="Enter your new password"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters long</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <i className="fas fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200"
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50 transition duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Setting up password...
              </div>
            ) : (
              <>
                <i className="fas fa-check mr-2"></i>
                Complete Account Setup
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            <i className="fas fa-shield-alt mr-1"></i>
            Your account will be ready to use after setting up your password
          </p>
        </div>
      </div>
    </div>
  );
};

export default SetupAccount;