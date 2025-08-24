import { makeAuthenticatedRequest } from '../context/AuthContext';

// Determine the API URL based on environment
const getApiUrl = () => {
  // If we're in production (on Render), use relative URLs
  if (window.location.hostname.includes('onrender.com')) {
    // Use the same domain, just the /api path
    return window.location.origin + '/api';
  }
  
  // For local development
  return 'http://localhost:8000/api';
};

const API_BASE_URL = getApiUrl();

// Simple API helper for company operations with CSRF support
export const createCompany = async (companyData) => {
  console.log('🏢 Creating company with CSRF support:', companyData);
  console.log('📍 Using API URL:', API_BASE_URL);
  
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/companies/`, {
      method: 'POST',
      body: JSON.stringify(companyData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log('✅ Company created successfully:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Failed to create company:', error);
    throw error;
  }
};

export const updateCompany = async (companyId, companyData) => {
  console.log('🏢 Updating company with CSRF support:', companyId, companyData);
  console.log('📍 Using API URL:', API_BASE_URL);
  
  try {
    const response = await makeAuthenticatedRequest(`${API_BASE_URL}/companies/${companyId}/`, {
      method: 'PUT', 
      body: JSON.stringify(companyData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log('✅ Company updated successfully:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Failed to update company:', error);
    throw error;
  }
};
