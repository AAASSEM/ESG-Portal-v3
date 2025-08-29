const getApiUrl = () => {
  // Production/Deployed environments
  if (process.env.NODE_ENV === 'production' || 
      window.location.hostname.includes('.onrender.com') ||
      window.location.hostname.includes('.vercel.app') ||
      window.location.hostname.includes('.netlify.app') ||
      window.location.hostname.includes('.ngrok-free.app') ||
      window.location.hostname.includes('.ngrok.io') ||
      window.location.hostname.includes('.ngrok.app')) {
    return window.location.origin;
  }
  
  // Development: Dynamic port detection
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // If React is running on port 3000, assume Django is on 8000
    if (window.location.port === '3000') {
      const backendPort = process.env.REACT_APP_BACKEND_PORT || '8000';
      return `http://${window.location.hostname}:${backendPort}`;
    }
    // If React is running on port 3001, assume Django is on 8080
    if (window.location.port === '3001') {
      const backendPort = process.env.REACT_APP_BACKEND_PORT || '8080';
      return `http://${window.location.hostname}:${backendPort}`;
    }
    // If accessing Django directly (same port), use same origin
    return window.location.origin;
  }
  
  // Fallback: use same origin
  return window.location.origin;
};

export const API_BASE_URL = getApiUrl();
export default API_BASE_URL;