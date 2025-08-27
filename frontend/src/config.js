const getApiUrl = () => {
  // Production deployment
  if (window.location.hostname.includes('onrender.com')) {
    return window.location.origin;
  }
  
  // ALWAYS force HTTP for localhost development - prevents HTTPS upgrade
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  
  // Fallback
  return window.location.origin;
};

export const API_BASE_URL = getApiUrl();
export default API_BASE_URL;