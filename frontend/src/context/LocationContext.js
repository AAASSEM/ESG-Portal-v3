// Complete LocationContext.js with proper loading state management

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState(null);
  const [updateVersion, setUpdateVersion] = useState(0);
  
  // Debug state changes
  useEffect(() => {
    console.log('🔄 LocationContext State Update:');
    console.log('   - selectedLocation:', selectedLocation);
    console.log('   - locations:', locations);
    console.log('   - loading:', loading);
    console.log('   - updateVersion:', updateVersion);
  }, [selectedLocation, locations, loading, updateVersion]);

  useEffect(() => {
    fetchActiveLocation();
  }, []);

  const fetchActiveLocation = async () => {
    try {
      console.log('🔍 Fetching active location from backend...');
      const response = await axios.get(`${API_BASE_URL}/api/sites/active/`, {
        withCredentials: true
      });
      
      console.log('📡 Backend response:', response.data);
      
      if (response.data && response.data.id) {
        // Handle "All Locations" special case
        if (response.data.id === 'all') {
          const allLocationsObj = {
            id: 'all',
            name: 'All Locations',
            location: 'Combined View',
            address: 'All sites aggregated',
            is_active: true
          };
          setSelectedLocation(allLocationsObj);
          console.log('🌍 Restored All Locations view from backend');
        } else {
          setSelectedLocation(response.data);
          console.log('📍 Restored location:', response.data.name);
        }
        setUpdateVersion(v => v + 1);
      } else {
        console.log('ℹ️ No active location set in backend');
      }
    } catch (err) {
      // 404 means no active location, which is okay
      if (err.response?.status === 404) {
        console.log('ℹ️ No active location (404)');
      } else {
        console.error('❌ Error fetching active location:', err);
      }
    } finally {
      // CRITICAL: Always set loading to false when done
      setLoading(false);
      console.log('✅ Location loading complete');
    }
  };

  const fetchLocations = useCallback(async (companyId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/sites/?company_id=${companyId}`, {
        withCredentials: true
      });
      
      const fetchedLocations = response.data.results || [];
      setLocations(fetchedLocations);
      
      // Check if selectedLocation is still valid
      if (selectedLocation && selectedLocation.id !== 'all' && 
          !fetchedLocations.find(loc => loc.id === selectedLocation.id)) {
        setSelectedLocation(null);
      }
      
      return fetchedLocations;
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Failed to load locations');
      return [];
    }
  }, [selectedLocation]);

  const selectLocation = useCallback(async (location) => {
    console.log(`🎯 LocationContext.selectLocation called with:`, location);
    console.log(`   Previous location:`, selectedLocation?.name, `(ID: ${selectedLocation?.id})`);
    console.log(`   New location:`, location?.name, `(ID: ${location?.id})`);
    
    // If it's already selected, don't make unnecessary API calls
    if (selectedLocation?.id === location?.id) {
      console.log('   Location already selected, skipping...');
      return true;
    }
    
    try {
      // Special handling for "All Locations" view
      if (location.id === 'all') {
        console.log('📡 Setting All Locations view via backend...');
        
        // Call backend to persist "All Locations" selection
        const response = await axios.post(`${API_BASE_URL}/api/sites/set_all_locations/`, {}, {
          withCredentials: true
        });
        
        console.log('✅ Backend updated for All Locations view');
        
        const newLocation = { ...location };
        setSelectedLocation(newLocation);
        setError(null);
        setUpdateVersion(v => v + 1);
        
        console.log('🌍 LocationContext state updated to: All Locations view');
        return true;
      }
      
      // Normal location selection
      const response = await axios.post(`${API_BASE_URL}/api/sites/${location.id}/set_active/`, {}, {
        withCredentials: true
      });
      
      console.log(`✅ Backend updated for location ${location.name}`);
      
      const newLocation = { ...location };
      setSelectedLocation(newLocation);
      setError(null);
      setUpdateVersion(v => v + 1);
      
      console.log(`📍 LocationContext state updated to:`, newLocation.name);
      
      // Update locations array
      setLocations(prevLocations => 
        prevLocations.map(loc => 
          loc.id === location.id ? { ...loc, is_active: true } : { ...loc, is_active: false }
        )
      );
      
      return true;
    } catch (err) {
      console.error('❌ Error setting active location:', err);
      setError('Failed to set active location');
      return false;
    }
  }, [selectedLocation]);

  // ... rest of the methods (addLocation, updateLocation, deleteLocation, clearSelection)

  // Memoize the context value
  const value = React.useMemo(() => ({
    selectedLocation,
    locations,
    loading, // CRITICAL: Export loading state
    error,
    selectLocation,
    fetchLocations,
    fetchActiveLocation,
    updateVersion
  }), [selectedLocation, locations, loading, error, selectLocation, fetchLocations, updateVersion]);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

// Export the hook
export const useLocationContext = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
};

export default LocationContext;