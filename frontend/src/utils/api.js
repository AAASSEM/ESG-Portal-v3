import { makeAuthenticatedRequest } from '../context/AuthContext';

// Simple API helper for company operations with CSRF support
export const createCompany = async (companyData) => {
  console.log('🏢 Creating company with CSRF support:', companyData);
  
  try {
    const response = await makeAuthenticatedRequest('http://localhost:8000/api/companies/', {
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
  
  try {
    const response = await makeAuthenticatedRequest(`http://localhost:8000/api/companies/${companyId}/`, {
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