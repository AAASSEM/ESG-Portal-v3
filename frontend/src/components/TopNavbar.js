import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, makeAuthenticatedRequest } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

// Role Switcher Dropdown Component for Testing
const RoleSwitcherDropdown = ({ currentRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const { user, checkAuthStatus } = useAuth();
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const portalDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside both the main dropdown container AND the portal-rendered dropdown
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);
      const isOutsidePortal = portalDropdownRef.current && !portalDropdownRef.current.contains(event.target);
      
      if (isOutsideDropdown && isOutsidePortal) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Calculate dropdown position when opening
  const handleToggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
    setIsOpen(!isOpen);
  };

  const availableRoles = [
    { value: 'super_user', label: 'Super User', color: 'bg-red-100 text-red-700' },
    { value: 'admin', label: 'Admin', color: 'bg-blue-100 text-blue-700' },
    { value: 'site_manager', label: 'Site Manager', color: 'bg-green-100 text-green-700' },
    { value: 'uploader', label: 'Uploader', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'viewer', label: 'Viewer', color: 'bg-purple-100 text-purple-700' },
    { value: 'meter_manager', label: 'Meter Manager', color: 'bg-orange-100 text-orange-700' }
  ];

  const currentRoleInfo = availableRoles.find(role => role.value === currentRole);

  const handleRoleSwitch = async (newRole) => {
    if (newRole === currentRole) {
      setIsOpen(false);
      return;
    }

    setIsChanging(true);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/auth/switch-role/`, {
        method: 'POST',
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        // Refresh user data to get new role
        await checkAuthStatus();
        console.log(`✅ Role switched to: ${newRole}`);
        // Reload the page to refresh all role-based content
        window.location.reload();
      } else {
        console.error('❌ Role switch failed');
        alert('Failed to switch role. This is a test feature.');
      }
    } catch (error) {
      console.error('Role switch error:', error);
      alert('This is a test feature - role switching would need backend implementation');
    } finally {
      setIsChanging(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={handleToggleDropdown}
        disabled={isChanging}
        className={`text-xs px-2 py-0.5 rounded-full capitalize transition-all duration-200 flex items-center space-x-1 ${
          isChanging 
            ? 'bg-gray-100 text-gray-500 cursor-wait'
            : currentRoleInfo?.color || 'bg-purple-100 text-purple-700'
        } hover:shadow-sm`}
      >
        <span className="text-xs">{isChanging ? 'Switching...' : (currentRoleInfo?.label || currentRole?.replace('_', ' '))}</span>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-xs`}></i>
      </button>

      {isOpen && createPortal(
        <div 
          ref={portalDropdownRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[999999] min-w-[160px]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
        >
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
              Test Role Switch
            </div>
            {availableRoles.map((role) => (
              <button
                key={role.value}
                onClick={() => handleRoleSwitch(role.value)}
                disabled={isChanging}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center space-x-2 ${
                  role.value === currentRole ? 'bg-blue-50' : ''
                }`}
              >
                <span className={`px-2 py-0.5 rounded-full ${role.color}`}>
                  {role.label}
                </span>
                {role.value === currentRole && (
                  <i className="fas fa-check text-blue-600 text-xs"></i>
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const TopNavbar = () => {
  console.log('TopNavbar rendering');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, selectedCompany, companies, userSites, selectedSite, switchSite, hasPermission } = useAuth();
  console.log('Current location:', location.pathname);

  // Function to get role colors
  const getRoleColor = (role) => {
    const roleColors = {
      'super_user': 'bg-red-100 text-red-700',
      'admin': 'bg-blue-100 text-blue-700',
      'site_manager': 'bg-green-100 text-green-700',
      'uploader': 'bg-yellow-100 text-yellow-700',
      'viewer': 'bg-purple-100 text-purple-700',
      'meter_manager': 'bg-orange-100 text-orange-700'
    };
    return roleColors[role] || 'bg-gray-100 text-gray-700';
  };

  const getRoleBasedModules = () => {
    const baseModules = [
      { id: 1, name: 'Company Onboarding', path: '/onboard', description: 'Set up your company profile and business activities', progress: 14, permission: 'companyOnboarding' },
      { id: 2, name: 'Framework Selection', path: '/rame', description: 'Choose ESG frameworks that align with your reporting requirements', progress: 28, permission: 'frameworkSelection' },
      { id: 3, name: 'Data Checklist', path: '/list', description: 'Review personalized data requirements based on your frameworks', progress: 42, permission: 'dataChecklist' },
      { id: 4, name: 'Meter Management', path: '/meter', description: 'Configure and monitor your data collection points', progress: 56, permission: 'meterManagement' },
      { id: 5, name: 'Data Collection', path: '/data', description: 'Track, input, and validate your ESG performance data', progress: 70, permission: 'dataCollection' },
      { id: 6, name: 'Team Management', path: '/team', description: 'Manage users and their access to your organization', progress: 84, permission: 'userManagement' },
      { id: 7, name: 'Dashboard', path: '/dashboard', description: 'Comprehensive view of your sustainability performance', progress: 100, permission: 'dashboard' }
    ];

    const adminModules = [
      { id: 7, name: 'Team Management', path: '/team', description: 'Manage users and their access to the platform', progress: 100, permission: 'userManagement' },
      { id: 8, name: 'Site Management', path: '/sites', description: 'Manage company locations and sites', progress: 100, permission: 'siteManagement' },
      { id: 9, name: 'Task Assignment', path: '/tasks', description: 'Assign data collection tasks to team members', progress: 100, permission: 'taskAssignment' }
    ];

    // If user is not loaded yet, return basic modules to prevent errors
    if (!user) {
      return baseModules;
    }

    let modules = baseModules.filter(module => hasPermission(module.permission, 'read'));
    
    if (user?.role === 'admin' || user?.role === 'super_user') {
      modules = [...modules, ...adminModules.filter(module => hasPermission(module.permission, 'read'))];
    } else if (user?.role === 'site_manager') {
      modules = [...modules, ...adminModules.filter(module => ['userManagement', 'taskAssignment'].includes(module.permission) && hasPermission(module.permission, 'read'))];
    }

    return modules.length > 0 ? modules : baseModules; // Fallback to baseModules if filtering results in empty array
  };

  const modules = getRoleBasedModules();

  const getCurrentModule = () => {
    return modules.find(module => location.pathname === module.path) || modules[0] || { 
      id: 1, 
      name: 'Dashboard', 
      path: '/dashboard', 
      description: 'Main dashboard', 
      progress: 100 
    };
  };

  const currentModule = getCurrentModule();
  const progress = currentModule?.progress || 0;
  
  // Update modules with completion status based on progress
  const modulesWithCompletion = modules.map(module => ({
    ...module,
    completed: progress >= module.progress
  }));

  const getBreadcrumb = () => {
    return [
      { name: 'ESG Portal', path: '/', isActive: false },
      { name: currentModule.name, path: currentModule.path, isActive: true }
    ];
  };

  const isModuleUnlocked = (index) => index === 0 || modulesWithCompletion[index - 1].completed;

  const breadcrumb = getBreadcrumb();

  return (
    <div className="bg-white shadow-2xl">
      {/* Top Bar - 48px height */}
      <div className="h-12 px-8 bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 backdrop-blur-lg border-b border-purple-100">
        <div className="flex items-center justify-between h-full">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm">
            {breadcrumb.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <button
                  onClick={() => !item.isActive && navigate(item.path)}
                  className={`${
                    item.isActive 
                      ? 'text-purple-700 font-semibold' 
                      : 'text-gray-600 hover:text-purple-600 transition-colors'
                  }`}
                >
                  {item.name}
                </button>
                {index < breadcrumb.length - 1 && (
                  <i className="fas fa-chevron-right text-gray-400 text-xs"></i>
                )}
              </div>
            ))}
          </nav>

          {/* Center Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <i className="fas fa-leaf text-white"></i>
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-700 to-blue-600 bg-clip-text text-transparent">
              ESG Portal
            </h1>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Site Selector */}
            {userSites && userSites.length > 1 && (
              <div className="relative">
                <select
                  value={selectedSite?.id || ''}
                  onChange={(e) => {
                    const site = userSites.find(s => s.id === parseInt(e.target.value));
                    if (site) switchSite(site);
                  }}
                  className="text-sm bg-white border border-purple-200 rounded-md px-3 py-1 text-gray-700 hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Sites</option>
                  {userSites.map(site => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Company Selector */}
            {/* Company name display only - no switching needed */}
            {selectedCompany && (
              <div className="text-sm text-gray-700 bg-purple-50 px-3 py-1 rounded-md border border-purple-200">
                <i className="fas fa-building mr-2 text-purple-600"></i>
                {selectedCompany.name}
              </div>
            )}
            
            
            
            {/* User Profile with Logout Button */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full ring-2 ring-purple-200 bg-purple-500 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {user?.name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.name || user?.username || 'User'}
                  </span>
                  {user?.role && (
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleColor(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                      <RoleSwitcherDropdown currentRole={user.role} />
                    </div>
                  )}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="px-2 py-1.5 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-300 hover:border-red-300 rounded-md transition-all duration-200 flex items-center"
                title="Sign Out"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Module Status Bar - 120px height */}
      <div className="h-30 px-8 py-6 bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 text-white relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full -ml-36 -mb-36"></div>
        
        <div className="relative z-10 flex items-center justify-between h-full">
          {/* Left Section - 60% */}
          <div className="flex-1 pr-8">
            <div className="flex items-center space-x-6">
              {/* Module Number Circle - 48px */}
              <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border border-white/30 shadow-xl">
                <span className="text-xl font-bold text-white">{currentModule.id}</span>
              </div>
              
              {/* Module Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {currentModule.name}
                </h2>
                <p className="text-purple-100 text-sm leading-relaxed mb-3">
                  {currentModule.description}
                </p>
              </div>
            </div>
          </div>

          {/* Right Section - 40% */}
          <div className="flex items-center space-x-8">
            {/* Module Progress Bar */}
            <div className="w-80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-purple-200 font-medium">Module Progress</span>
                <span className="text-xs text-white font-semibold">{progress}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className="h-full bg-gradient-to-r from-white to-purple-200 rounded-full transition-all duration-700 ease-out shadow-sm"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

          </div>
        </div>

        {/* Interactive Navigation Dots */}
        <div className="absolute bottom-0 left-0 right-0 px-8 pb-4">
          <div className="flex items-center justify-center space-x-3">
            {[
              { id: 1, name: 'Company Info', path: '/' },
              { id: 2, name: 'Frameworks', path: '/rame' },
              { id: 3, name: 'Profiling', path: '/list' },
              { id: 4, name: 'Meters', path: '/meter' },
              { id: 5, name: 'Data Collection', path: '/data' },
              { id: 6, name: 'Team Management', path: '/team' },
              { id: 7, name: 'Dashboard', path: '/dashboard' }
            ].map((step, index) => {
              const isActive = location.pathname === step.path;
              
              return (
                <button
                  key={step.id}
                  onClick={() => navigate(step.path)}
                  className="relative group cursor-pointer transition-all duration-300 hover:scale-150"
                >
                  {/* Navigation Dot */}
                  <div className={`
                    w-2 h-2 rounded-full transition-all duration-300
                    ${isActive ? 'bg-white' : 'bg-white opacity-50'}
                  `} />
                  
                  {/* Hover Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 z-50">
                    <div className="px-3 py-2 bg-gray-900/90 text-white text-xs rounded-lg whitespace-nowrap shadow-lg backdrop-blur-sm">
                      {step.name}
                      
                      {/* Tooltip Arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900/90"></div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNavbar;