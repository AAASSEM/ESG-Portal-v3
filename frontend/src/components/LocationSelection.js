import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, makeAuthenticatedRequest } from '../context/AuthContext';
import { useLocationContext } from '../context/LocationContext';
import { API_BASE_URL } from '../config';

function LocationSelection() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSite, setNewSite] = useState({
    name: '',
    location: '',
    address: ''
  });
  const [error, setError] = useState('');
  const [companyId, setCompanyId] = useState(null);
  const [userPermissions, setUserPermissions] = useState({
    canAccessLocationPage: false,
    canChangeLocation: false,
    showLocationDropdown: false,
    role: 'viewer',
    assignedSiteCount: 0
  });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedLocation, selectLocation, fetchLocations } = useLocationContext();

  useEffect(() => {
    fetchCompanyAndSites();
    fetchUserPermissions();
  }, []);

  // Fetch user permissions
  const fetchUserPermissions = async () => {
    if (!user) return;
    
    console.log('🔐 LocationSelection: Fetching user permissions');
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/user/permissions/`);
      if (response.ok) {
        const permissions = await response.json();
        console.log('🔐 LocationSelection: Received permissions:', permissions);
        setUserPermissions(permissions);
      }
    } catch (error) {
      console.error('🔐 LocationSelection: Failed to fetch permissions:', error);
    }
  };
  
  // Sync with LocationContext
  useEffect(() => {
    if (selectedLocation) {
      // console.log(`🔄 LocationSelection: Syncing with LocationContext - ${selectedLocation.name}`);
    }
  }, [selectedLocation]);

  const fetchCompanyAndSites = async () => {
    try {
      // First get the company ID
      const companyResponse = await axios.get(`${API_BASE_URL}/api/companies/`, {
        withCredentials: true
      });
      
      if (companyResponse.data.results && companyResponse.data.results.length > 0) {
        const company = companyResponse.data.results[0];
        setCompanyId(company.id);
        
        // Fetch sites using LocationContext to ensure sync
        const locations = await fetchLocations(company.id);
        setSites(locations);
        
        // selectedLocation from context will already have the active site
        if (selectedLocation) {
          console.log(`📍 LocationSelection: Active location from context: ${selectedLocation.name}`);
        } else {
          console.log('📍 LocationSelection: No active location in context');
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching sites:', err);
      setError('Failed to load locations');
      setLoading(false);
    }
  };

  const handleSiteSelect = async (site) => {
    // Check if user has permission to change locations
    if (!userPermissions.canChangeLocation) {
      console.log('🚫 LocationSelection: User cannot change locations - read only mode');
      setError('You can only view your assigned location. Contact an administrator to change site assignments.');
      return;
    }
    
    try {
      // console.log(`🎯 LocationSelection: Selecting site`, site);
      // console.log(`   Full site object:`, JSON.stringify(site, null, 2));
      
      // Use LocationContext's selectLocation to ensure sync
      const success = await selectLocation(site);
      
      if (success) {
        // console.log(`✅ LocationSelection: Site selected successfully`);
        // console.log(`   Context now has:`, selectedLocation);
        
        // Don't auto-navigate - let user choose when to continue
        // User can use "Continue to Profile Questions" button when ready
      } else {
        setError('Failed to set active location');
      }
    } catch (err) {
      console.error('Error setting active site:', err);
      setError('Failed to set active location');
    }
  };

  const handleAllLocationsSelect = async () => {
    // Check if user has permission to change locations
    if (!userPermissions.canChangeLocation) {
      console.log('🚫 LocationSelection: User cannot change to all locations - read only mode');
      setError('You can only view your assigned location. Contact an administrator to change site assignments.');
      return;
    }
    
    try {
      // Create a special "All Locations" object
      const allLocationsObj = {
        id: 'all',
        name: 'All Locations',
        location: 'Combined View',
        address: 'All sites aggregated',
        is_active: true
      };
      
      // Use LocationContext's selectLocation to ensure sync
      const success = await selectLocation(allLocationsObj);
      
      if (success) {
        console.log('✅ All Locations view selected');
      } else {
        setError('Failed to set All Locations view');
      }
    } catch (err) {
      console.error('Error setting All Locations view:', err);
      setError('Failed to set All Locations view');
    }
  };

  const handleAddSite = async () => {
    if (!newSite.name.trim()) {
      setError('Location name is required');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/sites/`, {
        ...newSite,
        company_id: companyId,
        is_active: true
      }, {
        withCredentials: true
      });

      setSites([...sites, response.data]);
      setShowAddModal(false);
      setNewSite({ name: '', location: '', address: '' });
      setError('');
      
      // Auto-select the new site if it's the first one
      if (sites.length === 0) {
        handleSiteSelect(response.data);
      }
    } catch (err) {
      console.error('Error adding site:', err);
      setError('Failed to add location');
    }
  };

  const handleSkip = () => {
    // If no sites exist, user must create at least one
    if (sites.length === 0) {
      setError('Please add at least one location to continue');
      return;
    }
    
    // If sites exist but none selected, select the first one
    if (!selectedLocation && sites.length > 0) {
      handleSiteSelect(sites[0]);
    } else {
      navigate('/list');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Loading locations...</p>
        </div>
      </div>
    );
  }

  // Check if user has permission to access the location page
  if (!userPermissions.canAccessLocationPage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-lock text-red-600 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">
              You don't have permission to access company onboarding.
            </p>
            <p className="text-sm text-gray-500">
              Contact your administrator if you need access to this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-map-marker-alt text-blue-600"></i>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Location Management
                {!userPermissions.canChangeLocation && (
                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    <i className="fas fa-lock mr-1"></i>
                    View Only
                  </span>
                )}
              </h2>
              <p className="text-gray-600">
                {userPermissions.canChangeLocation 
                  ? 'Select or add locations for your ESG data management'
                  : 'View your assigned location information'
                }
              </p>
            </div>
          </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Sites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* All Locations Option - Only show if user can change locations AND sites exist */}
          {userPermissions.canChangeLocation && sites.length > 0 && (
            <div
              onClick={() => handleAllLocationsSelect()}
              className={`relative bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all hover:from-purple-100 hover:to-blue-100 ${
                selectedLocation?.id === 'all' ? 'border-purple-500 bg-purple-100' : 'border-purple-300'
              }`}
            >
            {selectedLocation?.id === 'all' && (
              <i className="fas fa-check-circle absolute top-3 right-3 text-purple-500"></i>
            )}
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className="fas fa-globe text-white"></i>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">All Locations</h3>
                <p className="text-sm text-gray-600 mt-1">View aggregated data from all your locations</p>
                <div className="mt-3 flex items-center text-xs text-purple-600">
                  <i className="fas fa-chart-bar mr-1"></i>
                  Combined analytics & reports
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Empty State Message - Show when no sites exist */}
          {sites.length === 0 && userPermissions.canChangeLocation && (
            <div className="col-span-full bg-blue-50 border-2 border-blue-200 border-dashed rounded-lg p-8 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-map-marker-alt text-blue-500 text-2xl"></i>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">No Locations Yet</h3>
                  <p className="text-gray-600 max-w-md">
                    Create your first location to start tracking ESG data and managing your sustainability metrics.
                  </p>
                </div>
                <button
                  onClick={() => {
                    console.log('Add location clicked!');
                    setShowAddModal(true);
                    console.log('showAddModal should be true now');
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <i className="fas fa-plus"></i>
                  <span>Add Your First Location</span>
                </button>
              </div>
            </div>
          )}

          {/* Empty State for Read-Only Users */}
          {sites.length === 0 && !userPermissions.canChangeLocation && (
            <div className="col-span-full bg-gray-50 border-2 border-gray-200 border-dashed rounded-lg p-8 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-building text-gray-400 text-2xl"></i>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">No Locations Available</h3>
                  <p className="text-gray-600 max-w-md">
                    No locations have been set up for your account yet. Contact an administrator to add locations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Existing Sites */}
          {sites.map((site) => (
            <div
              key={site.id}
              onClick={userPermissions.canChangeLocation ? () => handleSiteSelect(site) : undefined}
              className={`relative bg-gray-50 rounded-lg p-6 transition-all border-2 ${
                selectedLocation?.id === site.id ? 'border-blue-500 bg-blue-50' : 'border-transparent'
              } ${
                userPermissions.canChangeLocation 
                  ? 'cursor-pointer hover:bg-gray-100' 
                  : 'cursor-default opacity-75'
              }`}
            >
              {selectedLocation?.id === site.id && (
                <i className="fas fa-check-circle absolute top-3 right-3 text-blue-500"></i>
              )}
              {!userPermissions.canChangeLocation && (
                <div className="absolute top-3 right-3">
                  <i className="fas fa-eye text-gray-400" title="View Only"></i>
                </div>
              )}
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-building text-gray-600"></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{site.name}</h3>
                  {site.location && (
                    <p className="text-sm text-gray-600 mt-1">{site.location}</p>
                  )}
                  {site.address && (
                    <p className="text-xs text-gray-500 mt-2">{site.address}</p>
                  )}
                  {site.meter_count > 0 && (
                    <div className="mt-3 flex items-center text-xs text-gray-500">
                      <i className="fas fa-tachometer-alt mr-1"></i>
                      {site.meter_count} meter{site.meter_count !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add New Site Card - Only show if user can change locations */}
          {userPermissions.canChangeLocation && (
            <div
              onClick={() => {
                console.log('Add location clicked!');
                setShowAddModal(true);
                console.log('showAddModal should be true now');
              }}
              className="bg-gray-50 rounded-lg p-6 cursor-pointer transition-all hover:bg-gray-100 border-2 border-dashed border-gray-300 hover:border-blue-500 flex items-center justify-center min-h-[120px]"
            >
              <div className="text-center">
                <i className="fas fa-plus-circle text-3xl text-gray-400 mb-2"></i>
                <p className="text-gray-600 font-medium">Add New Location</p>
              </div>
            </div>
          )}
        </div>

        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 gap-3 mt-8">
          <button
            onClick={() => navigate('/rame')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back
          </button>
          
          <button
            onClick={handleSkip}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
          >
            {selectedLocation ? 'Save & Continue' : (sites.length > 0 ? 'Save & Continue' : 'Select a Location')}
            <i className="fas fa-arrow-right ml-2"></i>
          </button>
        </div>

      {/* Add Location Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100000] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              setError('');
              setNewSite({ name: '', location: '', address: '' });
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-200 max-w-lg w-full mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <i className="fas fa-map-marker-alt text-white"></i>
                  </div>
                  <h2 className="text-xl font-semibold text-white">Add New Location</h2>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                    setNewSite({ name: '', location: '', address: '' });
                  }}
                  className="text-white hover:text-gray-200 transition-colors p-1"
                >
                  <i className="fas fa-times text-lg"></i>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <i className="fas fa-building text-blue-600 mr-2"></i>
                    Location Name *
                  </label>
                  <input
                    type="text"
                    value={newSite.name}
                    onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="e.g., Main Office, Factory 1, Dubai Branch"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <i className="fas fa-city text-blue-600 mr-2"></i>
                    City/Region
                  </label>
                  <input
                    type="text"
                    value={newSite.location}
                    onChange={(e) => setNewSite({ ...newSite, location: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="e.g., Dubai, Abu Dhabi, Sharjah"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <i className="fas fa-map text-blue-600 mr-2"></i>
                    Full Address
                  </label>
                  <textarea
                    value={newSite.address}
                    onChange={(e) => setNewSite({ ...newSite, address: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                    rows="3"
                    placeholder="Street address, building number, floor, etc."
                  />
                </div>
              </div>

              {error && (
                <div className="mt-5 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                  <div className="flex items-center">
                    <i className="fas fa-exclamation-circle text-red-500 mr-2"></i>
                    <span className="text-red-700 text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                    setNewSite({ name: '', location: '', address: '' });
                  }}
                  className="px-5 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSite}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Add Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationSelection;