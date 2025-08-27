import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';

const ChangePassword = () => {
  const { user, resetPassword } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const showModal = (type, title, message) => {
    setModalState({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      type: 'info',
      title: '',
      message: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      setLoading(false);
      return;
    }

    try {
      const result = await resetPassword(formData.currentPassword, formData.newPassword);
      
      if (result.success) {
        // Clear form
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        showModal('success', 'Password Changed Successfully', 'Your password has been updated successfully.');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <i className="fas fa-key text-blue-600"></i>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
          <p className="text-gray-600">Update your account password</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Current Password
          </label>
          <div className="relative">
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your current password"
              value={formData.currentPassword}
              onChange={handleChange}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <i className="fas fa-lock text-gray-400"></i>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <div className="relative">
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your new password"
              value={formData.newPassword}
              onChange={handleChange}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <i className="fas fa-key text-gray-400"></i>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters long</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm your new password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <i className="fas fa-check text-gray-400"></i>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex">
              <i className="fas fa-exclamation-circle text-red-400 mr-2 mt-0.5"></i>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-600">
            <i className="fas fa-info-circle text-blue-500 mr-1"></i>
            Password will be changed immediately
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Updating...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                Change Password
              </>
            )}
          </button>
        </div>
      </form>

      {/* Success/Error Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
      />
    </div>
  );
};

export default ChangePassword;