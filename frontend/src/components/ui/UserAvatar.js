import React from 'react';

const UserAvatar = ({ fullName, email, size = 'md' }) => {
  // Get initials from full name or email
  const getInitials = () => {
    if (fullName) {
      return fullName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    } else if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Size classes
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  return (
    <div 
      className={`${sizeClasses[size]} bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center font-medium text-white`}
    >
      {getInitials()}
    </div>
  );
};

export default UserAvatar;