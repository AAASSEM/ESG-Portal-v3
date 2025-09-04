import React from 'react';
import Header from './Header';

const Layout = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-[#0D1117] via-[#131A2C] to-[#1B2332] ${className}`}>
      <Header />
      <main className="px-6 lg:px-20">
        {children}
      </main>
    </div>
  );
};

export default Layout;