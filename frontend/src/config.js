const getApiUrl = () => {
  // Production deployment
  if (window.location.hostname.includes('onrender.com')) {
    return window.location.origin;
  }
  
  // When served by Django backend (localhost:8000) - force HTTP
  if (window.location.port === '8000') {
    return 'http://localhost:8000';
  }
  
  // Development with React dev server (localhost:7701) - use proxy
  return '';
};

export const API_BASE_URL = getApiUrl();
export default API_BASE_URL;