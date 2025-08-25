const getApiUrl = () => {
  if (window.location.hostname.includes('onrender.com')) {
    return window.location.origin;
  }
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiUrl();
export default API_BASE_URL;