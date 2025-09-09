import React, { useState, useEffect } from 'react';

const Notification = ({ message, type = 'info', code = null, link = null, duration = 10000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'code':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'link':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'fas fa-check-circle text-green-600';
      case 'error':
        return 'fas fa-exclamation-circle text-red-600';
      case 'warning':
        return 'fas fa-exclamation-triangle text-yellow-600';
      case 'code':
        return 'fas fa-code text-purple-600';
      case 'link':
        return 'fas fa-link text-green-600';
      default:
        return 'fas fa-info-circle text-blue-600';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className={`border rounded-lg p-4 shadow-lg ${getTypeStyles()} animate-slide-in-right`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <i className={`${getIcon()} mt-1 mr-3`}></i>
            <div className="flex-1">
              <p className="text-sm font-medium">{message}</p>
              {code && (
                <div className="mt-2">
                  <p className="text-xs opacity-75 mb-1">Verification Code:</p>
                  <p className="font-bold text-lg font-mono bg-white bg-opacity-50 px-2 py-1 rounded inline-block">
                    {code}
                  </p>
                </div>
              )}
              {link && (
                <div className="mt-2">
                  <p className="text-xs opacity-75 mb-1">Magic Link:</p>
                  <a 
                    href={link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-green-700 hover:text-green-900 underline break-all bg-white bg-opacity-50 px-2 py-1 rounded block"
                  >
                    Click to verify →
                  </a>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="ml-3 text-gray-400 hover:text-gray-600"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notification;