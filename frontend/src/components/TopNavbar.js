import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, makeAuthenticatedRequest } from '../context/AuthContext';
import { useLocationContext } from '../context/LocationContext';
import { API_BASE_URL } from '../config';

// Role Switcher Dropdown Component (keeping existing functionality)
const RoleSwitcherDropdown = ({ currentRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const { user, checkAuthStatus } = useAuth();
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const portalDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
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

  const handleToggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 0,
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
        await checkAuthStatus();
        console.log(`✓ Role switched to: ${newRole}`);
        window.location.reload();
      } else {
        console.error('✗ Role switch failed');
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
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, selectedCompany, companies, userSites, selectedSite, switchSite, hasPermission } = useAuth();
  const { selectedLocation, locations, selectLocation, fetchLocations, updateVersion } = useLocationContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [userPermissions, setUserPermissions] = useState({
    canAccessLocationPage: false,
    canChangeLocation: false,
    showLocationDropdown: false,
    role: 'viewer',
    assignedSiteCount: 0
  });
  const locationDropdownRef = useRef(null);
  
  // Fetch user permissions
  const fetchUserPermissions = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/user/permissions/`);
      if (response.ok) {
        const permissions = await response.json();
        setUserPermissions(permissions);
      }
    } catch (error) {
      console.error('Failed to fetch user permissions:', error);
    }
  };

  // Fetch locations and permissions when component mounts
  useEffect(() => {
    if (selectedCompany) {
      fetchLocations(selectedCompany.id);
    }
    if (user) {
      fetchUserPermissions();
    }
  }, [selectedCompany, user]);

  // Close location dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Navigation items based on your current modules
  const getNavigationItems = () => {
    const baseNavItems = [
      { path: '/onboard', label: 'Company Info', icon: 'fa-solid fa-building' },
      { path: '/rame', label: 'Frameworks', icon: 'fa-solid fa-clipboard-list' },
      { path: '/location', label: 'Locations', icon: 'fa-solid fa-map-marker-alt' },
      { path: '/list', label: 'Profiling', icon: 'fa-solid fa-list-check' },
      { path: '/meter', label: 'Meters', icon: 'fa-solid fa-tachometer-alt' },
      { path: '/data', label: 'Data Collection', icon: 'fa-solid fa-chart-line' },
      { path: '/team', label: 'Team', icon: 'fa-solid fa-users' },
      { path: '/dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-pie' }
    ];

    return baseNavItems;
  };

  const navItems = getNavigationItems();
  const isActive = (path) => location.pathname === path;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 shadow-2xl relative"
         style={{ zIndex: 1000 }}>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full -ml-36 -mb-36"></div>
      
      {/* Updated header with balanced padding and increased height */}
      <header className="relative z-20 px-6 md:px-8 lg:px-10 py-4 md:py-5">
        <nav className="flex items-center justify-between">
          {/* Logo - Slightly larger */}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <i className="fas fa-leaf text-purple-600 text-lg md:text-xl"></i>
            </div>
            <span className="text-white font-bold text-base md:text-lg xl:text-xl">ESG Portal</span>
          </button>

          {/* Desktop Navigation - Centered with more spacing */}
          <div className="hidden lg:flex flex-1 justify-center mx-4">
            <div className="flex items-center gap-1 xl:gap-2 bg-white/10 px-2 py-1.5 rounded-xl backdrop-blur-sm">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-1 xl:space-x-2 px-2 xl:px-3 py-1.5 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive(item.path) 
                      ? 'bg-white/20 text-white shadow-md' 
                      : 'text-gray-300 hover:text-white hover:bg-purple-600/20'
                  }`}
                >
                  <i className={`${item.icon} text-sm ${isActive(item.path) ? 'text-white' : ''}`}></i>
                  <span className="text-sm xl:text-base">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop User Menu - Original size with slight spacing increase */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-2 flex-shrink-0">
            {/* Location Selector */}
            {locations && locations.length > 0 && userPermissions.showLocationDropdown && (
              <div className="relative" ref={locationDropdownRef}>
                <button
                  key={`${selectedLocation?.id || 'no-location'}-${updateVersion}`}
                  onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                  className="flex items-center space-x-1 xl:space-x-2 text-xs bg-white/10 border border-white/20 rounded-md px-2 xl:px-3 py-1.5 text-white backdrop-blur-sm hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <i className="fas fa-map-marker-alt text-xs"></i>
                  <span className="max-w-[120px] xl:max-w-[150px] truncate">
                    {selectedLocation?.id === 'all' ? 'All' : (selectedLocation ? selectedLocation.name : 'Select Location')}
                  </span>
                  <i className={`fas fa-chevron-down text-xs transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`}></i>
                </button>
                
                {showLocationDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl overflow-hidden z-50">
                    <div className="py-2">
                      {/* All Locations Option */}
                      <button
                        key="all-locations"
                        onClick={async () => {
                          const allLocationsObj = {
                            id: 'all',
                            name: 'All Locations',
                            location: 'Combined View',
                            address: 'All sites aggregated',
                            is_active: true
                          };
                          await selectLocation(allLocationsObj);
                          setShowLocationDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-gray-100 ${
                          selectedLocation?.id === 'all' ? 'bg-purple-100 text-purple-700' : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                              <i className="fas fa-globe text-white text-sm"></i>
                            </div>
                            <div>
                              <div className="font-medium">All Locations</div>
                              <div className="text-xs text-gray-500">Combined view</div>
                            </div>
                          </div>
                          {selectedLocation?.id === 'all' && (
                            <i className="fas fa-check text-purple-600"></i>
                          )}
                        </div>
                      </button>

                      {/* Individual Locations */}
                      {locations.map(loc => (
                        <button
                          key={loc.id}
                          onClick={async () => {
                            await selectLocation(loc);
                            setShowLocationDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors ${
                            selectedLocation?.id === loc.id ? 'bg-purple-100 text-purple-700' : 'text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{loc.name}</div>
                              {loc.location && <div className="text-xs text-gray-500">{loc.location}</div>}
                            </div>
                            {selectedLocation?.id === loc.id && (
                              <i className="fas fa-check text-purple-600"></i>
                            )}
                          </div>
                        </button>
                      ))}
                      <div className="border-t mt-2 pt-2">
                        <button
                          onClick={() => {
                            navigate('/location');
                            setShowLocationDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-purple-600 hover:bg-purple-50 transition-colors"
                        >
                          <i className="fas fa-plus mr-2"></i>
                          Manage Locations
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Info - Original size */}
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-full ring-2 ring-purple-300 bg-purple-500 flex items-center justify-center">
                <span className="text-white text-xs xl:text-sm font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="hidden xl:flex flex-col max-w-[120px]">
                <span className="text-white text-xs font-medium truncate">
                  {user?.name || user?.username || 'User'}
                </span>
                {user?.role && (
                  <span className="text-xs text-purple-200 truncate">
                    {user.role.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>

            {/* Logout Button - Original size */}
            <button
              onClick={logout}
              className="p-1.5 xl:p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Logout"
            >
              <i className="fa-solid fa-sign-out-alt text-sm"></i>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden text-white p-2.5 rounded-lg hover:bg-white/10 transition-colors relative z-50"
            aria-label="Toggle mobile menu"
            type="button"
          >
            <i className={`fa-solid ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-purple-700/95 backdrop-blur-md border-t border-white/10 shadow-lg"
               style={{ zIndex: 9999 }}>
            <div className="px-6 py-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    closeMobileMenu();
                  }}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium w-full text-left transition-colors ${
                    isActive(item.path) 
                      ? 'bg-white/10 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-purple-600/20'
                  }`}
                >
                  <i className={`${item.icon} ${isActive(item.path) ? 'text-white' : ''}`}></i>
                  <span>{item.label}</span>
                </button>
              ))}
              
              {/* Mobile Location Selector */}
              {locations && locations.length > 0 && userPermissions.showLocationDropdown && (
                <div className="border-t border-white/10 pt-4 mt-4">
                  <label className="text-gray-300 text-sm mb-2 block">
                    <i className="fas fa-map-marker-alt mr-2"></i>
                    Location
                  </label>
                  <select
                    value={selectedLocation?.id || ''}
                    onChange={async (e) => {
                      const selectedValue = e.target.value;
                      
                      if (selectedValue === 'all') {
                        const allLocationsObj = {
                          id: 'all',
                          name: 'All Locations',
                          location: 'Combined View',
                          address: 'All sites aggregated',
                          is_active: true
                        };
                        await selectLocation(allLocationsObj);
                      } else if (selectedValue) {
                        const loc = locations.find(l => l.id === parseInt(selectedValue));
                        if (loc) {
                          await selectLocation(loc);
                        }
                      }
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white backdrop-blur-sm"
                  >
                    <option value="" className="text-gray-800">Select Location</option>
                    <option value="all" className="text-gray-800">All Locations</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id} className="text-gray-800">
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      navigate('/location');
                      closeMobileMenu();
                    }}
                    className="mt-2 w-full text-left px-3 py-2 text-purple-300 hover:text-white transition-colors text-sm"
                  >
                    <i className="fas fa-cog mr-2"></i>
                    Manage Locations
                  </button>
                </div>
              )}
              
              {/* Mobile User Section */}
              <div className="border-t border-white/10 pt-4 mt-4">
                <div className="flex items-center space-x-3 px-4 py-2">
                  <div className="w-9 h-9 rounded-full ring-2 ring-purple-300 bg-purple-500 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-medium">
                      {user?.name || user?.username || 'User'}
                    </span>
                    {user?.role && (
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColor(user.role)}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    closeMobileMenu();
                  }}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-red-500/10 transition-colors font-medium w-full"
                >
                  <i className="fa-solid fa-sign-out-alt"></i>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
  );
};

export default TopNavbar;
