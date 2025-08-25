import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

// CSRF Token utility
const getCsrfToken = async () => {
  // First try to get from cookie
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
    
  if (cookieValue) {
    return cookieValue;
  }
  
  // If no cookie, fetch CSRF token from Django
  try {
    const response = await fetch('${API_BASE_URL}/api/auth/csrf/', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.csrfToken;
    }
    
    // Fallback: check cookie again after the request
    const newCookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
    return newCookieValue;
  } catch (error) {
    console.log('Could not fetch CSRF token:', error);
    return null;
  }
};

// Helper to make authenticated requests with CSRF token
const makeAuthenticatedRequest = async (url, options = {}) => {
  const csrfToken = await getCsrfToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }
  
  return fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });
};

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Export helper function for other components
export { makeAuthenticatedRequest };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const navigate = useNavigate();

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('${API_BASE_URL}/api/auth/user/', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        console.log('✅ User authenticated:', data.user);
        // Fetch user's companies after authentication confirmed
        await fetchUserCompanies();
      } else {
        console.log('❌ User not authenticated');
        setUser(null);
        setCompanies([]);
        setSelectedCompany(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCompanies = async () => {
    try {
      const response = await fetch('${API_BASE_URL}/api/companies/', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const companiesData = data.results || data;
        setCompanies(companiesData);
        console.log('🏢 User companies fetched:', companiesData);
        
        // Auto-select first company or restore from localStorage
        const savedCompanyId = localStorage.getItem('selectedCompanyId');
        console.log('🔍 Saved company ID from storage:', savedCompanyId);
        console.log('🔍 Available companies for user:', companiesData.map(c => ({id: c.id, name: c.name})));
        
        if (savedCompanyId) {
          const savedCompany = companiesData.find(c => c.id === parseInt(savedCompanyId));
          if (savedCompany) {
            setSelectedCompany(savedCompany);
            console.log('🏢 Restored company from storage:', savedCompany);
          } else {
            console.log('⚠️ Saved company not found in user companies, clearing localStorage');
            localStorage.removeItem('selectedCompanyId');
            if (companiesData.length > 0) {
              setSelectedCompany(companiesData[0]);
              console.log('🏢 Auto-selected first company:', companiesData[0]);
            }
          }
        } else if (companiesData.length > 0) {
          setSelectedCompany(companiesData[0]);
          console.log('🏢 Auto-selected first company:', companiesData[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await fetch('${API_BASE_URL}/api/auth/login/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        console.log('✅ Login successful:', data.user);
        await fetchUserCompanies();
        
        // Navigate based on whether user has companies
        if (companies.length > 0) {
          navigate('/dashboard');
        } else {
          navigate('/onboard'); // New user needs to create a company
        }
        
        return { success: true };
      } else {
        console.error('❌ Login failed:', data.error);
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const signup = async (username, email, password) => {
    try {
      const response = await fetch('${API_BASE_URL}/api/auth/signup/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        console.log('✅ Signup successful:', data.user);
        navigate('/onboard'); // Go to onboarding for new users
        return { success: true };
      } else {
        console.error('❌ Signup failed:', data.error);
        return { success: false, error: data.error || 'Signup failed' };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('${API_BASE_URL}/api/auth/logout/', {
        method: 'POST',
        credentials: 'include'
      });
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setCompanies([]);
      setSelectedCompany(null);
      localStorage.removeItem('selectedCompanyId');
      navigate('/login');
    }
  };

  const switchCompany = (company) => {
    setSelectedCompany(company);
    localStorage.setItem('selectedCompanyId', company.id);
    console.log('🏢 Switched to company:', company);
  };

  const value = {
    user,
    loading,
    companies,
    selectedCompany,
    login,
    signup,
    logout,
    checkAuthStatus,
    switchCompany,
    fetchUserCompanies
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};