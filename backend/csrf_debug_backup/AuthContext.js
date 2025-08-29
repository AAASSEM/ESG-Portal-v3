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
    const response = await fetch(`${API_BASE_URL}/api/auth/csrf/`, {
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
  // Force HTTP for localhost:8000 URLs to prevent HTTPS upgrade
  const finalUrl = url.includes('localhost:8000') ? url.replace('https://localhost:8000', 'http://localhost:8000') : url;
  
  console.log('🔄 Making request to:', finalUrl);
  
  // Try to get CSRF token, but don't fail if it's not available
  let csrfToken = null;
  try {
    csrfToken = await getCsrfToken();
    console.log('🔑 CSRF token:', csrfToken ? 'obtained' : 'not available');
  } catch (error) {
    console.log('⚠️ CSRF token fetch failed:', error.message);
  }
  
  const headers = {
    ...options.headers,
  };
  
  // Only set Content-Type if not sending FormData (browser handles FormData content-type automatically)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }
  
  try {
    const response = await fetch(finalUrl, {
      credentials: 'include',
      ...options,
      headers,
    });
    console.log('✅ Request completed:', finalUrl, 'Status:', response.status);
    return response;
  } catch (error) {
    console.error('❌ Request failed:', finalUrl, 'Error:', error.message);
    throw error;
  }
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
  const [userSites, setUserSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const navigate = useNavigate();

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/user/`, {
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
      const response = await fetch(`${API_BASE_URL}/api/companies/`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const companiesData = data.results || data;
        setCompanies(companiesData);
        console.log('🏢 User companies fetched:', companiesData);
        
        // Use user's assigned company (no selection needed)
        console.log('🔍 Available companies for user:', companiesData.map(c => ({id: c.id, name: c.name})));
        
        if (companiesData.length > 0) {
          setSelectedCompany(companiesData[0]);
          console.log('🏢 Using user assigned company:', companiesData[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const fetchUserSites = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/sites/`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const sitesData = await response.json();
        setUserSites(sitesData);
        console.log('🏢 User sites fetched:', sitesData);
        
        // Auto-select first site (no storage needed)
        if (sitesData.length > 0) {
          setSelectedSite(sitesData[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user sites:', error);
    }
  };

  // Role-based permission checking
  const hasPermission = (module, action = 'read') => {
    if (!user) return false;
    
    const rolePermissions = {
      'super_user': {
        all: true
      },
      'admin': {
        companyOnboarding: ['read', 'create', 'update'],
        frameworkSelection: ['read', 'create', 'update'],
        dataChecklist: ['read', 'create', 'update', 'assign'],
        meterManagement: ['read', 'create', 'update', 'delete'],
        dataCollection: ['read', 'create', 'update', 'approve'],
        dashboard: ['read'],
        reports: ['read', 'export'],
        userManagement: ['read', 'create', 'update', 'delete']
      },
      'site_manager': {
        companyOnboarding: ['read'],
        frameworkSelection: ['read'],
        dataChecklist: ['read', 'assign'],
        meterManagement: ['read', 'create', 'update', 'delete'],
        dataCollection: ['read', 'create', 'update', 'review'],
        dashboard: ['read'],
        reports: ['read', 'export'],
        userManagement: ['read', 'create', 'update', 'delete']
      },
      'uploader': {
        dataCollection: ['read', 'create', 'update'],
        dashboard: ['read'],
        reports: ['read']
      },
      'viewer': {
        companyOnboarding: ['read'],
        frameworkSelection: ['read'],
        dataChecklist: ['read'],
        meterManagement: ['read'],
        dataCollection: ['read'],
        dashboard: ['read'],
        reports: ['read', 'export']
      },
      'meter_manager': {
        meterManagement: ['read', 'create', 'update', 'delete'],
        dataCollection: ['read'],
        dashboard: ['read'],
        reports: ['read']
      }
    };

    const userPermissions = rolePermissions[user.role];
    if (!userPermissions) return false;
    
    if (userPermissions.all) return true;
    if (!userPermissions[module]) return false;
    
    return userPermissions[module].includes(action);
  };

  const login = async (email, password, companyCode = null) => {
    try {
      const requestBody = { email, password };
      if (companyCode) {
        requestBody.company_code = companyCode;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        console.log('✅ Login successful:', data.user);
        await fetchUserCompanies();
        await fetchUserSites();
        
        // Check if user must reset password
        if (data.requires_password_reset || data.user.must_reset_password) {
          // Navigate to password reset page
          navigate('/reset-password');
          return { success: true, requiresPasswordReset: true, message: data.message };
        } else {
          // Check if company onboarding is complete
          await checkOnboardingStatus();
          return { success: true };
        }
      } else {
        console.error('❌ Login failed:', data.error);
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const signup = async (username, email, companyName, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, companyName, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        // Set the company that was created during signup
        if (data.user.company) {
          setSelectedCompany(data.user.company);
          setCompanies([data.user.company]);
        }
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
      await fetch(`${API_BASE_URL}/api/auth/logout/`, {
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
      setUserSites([]);
      setSelectedSite(null);
      navigate('/login');
    }
  };

  const switchCompany = (company) => {
    setSelectedCompany(company);
    console.log('🏢 Switched to company:', company);
  };

  const switchSite = (site) => {
    setSelectedSite(site);
    console.log('🏢 Switched to site:', site);
  };

  const checkOnboardingStatus = async () => {
    try {
      if (!companies || companies.length === 0) {
        console.log('🔄 No companies found, redirecting to onboarding');
        navigate('/onboard');
        return;
      }

      const currentCompany = selectedCompany || companies[0];
      if (!currentCompany) {
        console.log('🔄 No company selected, redirecting to onboarding');
        navigate('/onboard');
        return;
      }

      // Check if company has completed basic setup
      console.log('🔍 Checking onboarding status for company:', currentCompany.name);
      
      // Check if frameworks are selected
      const frameworksResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/${currentCompany.id}/frameworks/`);
      let hasFrameworks = false;
      if (frameworksResponse.ok) {
        const frameworksData = await frameworksResponse.json();
        hasFrameworks = frameworksData.length > 0;
      }

      // Check if profiling is completed
      const answersResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/${currentCompany.id}/profile_answers/`);
      let hasProfileAnswers = false;
      if (answersResponse.ok) {
        const answersData = await answersResponse.json();
        hasProfileAnswers = answersData.length > 0;
      }

      // Check if checklist exists (generated after profiling)
      const checklistResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/checklist/?company_id=${currentCompany.id}`);
      let hasChecklist = false;
      if (checklistResponse.ok) {
        const checklistData = await checklistResponse.json();
        hasChecklist = checklistData.results && checklistData.results.length > 0;
      }

      console.log('📊 Onboarding status:', {
        company: currentCompany.name,
        hasFrameworks,
        hasProfileAnswers,
        hasChecklist
      });

      // Determine where to redirect based on completion status
      if (!hasFrameworks) {
        console.log('🔄 No frameworks selected, redirecting to onboarding');
        navigate('/onboard');
      } else if (!hasProfileAnswers) {
        console.log('🔄 Profiling not completed, redirecting to framework selection');
        navigate('/rame');
      } else if (!hasChecklist) {
        console.log('🔄 Checklist not generated, redirecting to profiling');
        navigate('/list');
      } else {
        console.log('✅ Onboarding complete, redirecting to dashboard');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      // Default to dashboard if there's an error
      navigate('/dashboard');
    }
  };

  const resetPassword = async (currentPassword, newPassword) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/auth/reset-password/`, {
        method: 'POST',
        body: JSON.stringify({ 
          current_password: currentPassword, 
          new_password: newPassword 
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Password reset successful');
        // Update user to clear must_reset_password flag
        if (user) {
          setUser({
            ...user,
            must_reset_password: false
          });
        }
        return { success: true, message: data.message };
      } else {
        console.error('❌ Password reset failed:', data.error);
        console.error('❌ Response status:', response.status);
        console.error('❌ Full response:', data);
        return { success: false, error: data.error || 'Password reset failed' };
      }
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const value = {
    user,
    loading,
    companies,
    selectedCompany,
    userSites,
    selectedSite,
    login,
    signup,
    logout,
    resetPassword,
    checkAuthStatus,
    switchCompany,
    switchSite,
    fetchUserCompanies,
    fetchUserSites,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};