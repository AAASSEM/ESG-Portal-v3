1. frontend/src/components/Dashboard.js
Add at the top after other imports:
javascriptimport { API_BASE_URL } from '../config';
Replace these lines:

Line 343-345 & 372-373: Replace 'http://localhost:8000' with API_BASE_URL

2. frontend/src/components/Meter.js
Add at the top after other imports:
javascriptimport { API_BASE_URL } from '../config';
Replace:

Line 53: http://localhost:8000/api/meters/?company_id=${companyId} → ${API_BASE_URL}/api/meters/?company_id=${companyId}
Line 101 & 103: http://localhost:8000/api/meters/${meterId}/ → ${API_BASE_URL}/api/meters/${meterId}/
Line 139: http://localhost:8000/api/meters/?company_id=${companyId} → ${API_BASE_URL}/api/meters/?company_id=${companyId}
Line 180: http://localhost:8000/api/meters/ → ${API_BASE_URL}/api/meters/
Line 424: http://localhost:8000/api/meters/?company_id=${companyId} → ${API_BASE_URL}/api/meters/?company_id=${companyId}

3. frontend/src/components/Data.js
Add at the top after other imports:
javascriptimport { API_BASE_URL } from '../config';
Replace:

Line 142: http://localhost:8000/api/data-collection/progress/?company_id=${companyId}&year=${year}&month=${month} → ${API_BASE_URL}/api/data-collection/progress/?company_id=${companyId}&year=${year}&month=${month}
Line 154: http://localhost:8000/api/data-collection/progress/?company_id=${companyId}&year=${year} → ${API_BASE_URL}/api/data-collection/progress/?company_id=${companyId}&year=${year}
Line 167-168: http://localhost:8000/api/data-collection/?company_id=${companyId}&year=${year}&month=${month} → ${API_BASE_URL}/api/data-collection/?company_id=${companyId}&year=${year}&month=${month}
Line 185: http://localhost:8000/api/checklist/?company_id=${companyId} → ${API_BASE_URL}/api/checklist/?company_id=${companyId}
Line 482: http://localhost:8000/api/data-collection/${submission.id}/ → ${API_BASE_URL}/api/data-collection/${submission.id}/
Line 526: http://localhost:8000/api/data-collection/${submission.id}/ → ${API_BASE_URL}/api/data-collection/${submission.id}/

4. frontend/src/components/List.js
Add at the top after other imports:
javascriptimport { API_BASE_URL } from '../config';
Replace:

Line 31: http://localhost:8000/api/profiling-questions/for_company/?company_id=${companyId} → ${API_BASE_URL}/api/profiling-questions/for_company/?company_id=${companyId}
Line 86: http://localhost:8000/api/companies/${companyId}/profile_answers/ → ${API_BASE_URL}/api/companies/${companyId}/profile_answers/
Line 119 & 122: http://localhost:8000/api/companies/${companyId}/save_profile_answer/ → ${API_BASE_URL}/api/companies/${companyId}/save_profile_answer/
Line 237: http://localhost:8000/api/checklist/generate/ → ${API_BASE_URL}/api/checklist/generate/
Line 269: http://localhost:8000/api/checklist/?company_id=${companyId} → ${API_BASE_URL}/api/checklist/?company_id=${companyId}
Line 321: http://localhost:8000/api/companies/${companyId}/progress/ → ${API_BASE_URL}/api/companies/${companyId}/progress/
Line 331: http://localhost:8000/api/data-collection/progress/?company_id=${companyId}&year=${currentYear} → ${API_BASE_URL}/api/data-collection/progress/?company_id=${companyId}&year=${currentYear}

5. frontend/src/components/Onboard.js
Add at the top after other imports:
javascriptimport { API_BASE_URL } from '../config';
Replace:

Line 40: http://localhost:8000/api/activities/ → ${API_BASE_URL}/api/activities/
Line 50: http://localhost:8000/api/companies/ → ${API_BASE_URL}/api/companies/
Line 361: http://localhost:8000/api/activities/ → ${API_BASE_URL}/api/activities/
Line 403: http://localhost:8000/api/companies/${companyId}/save_activities/ → ${API_BASE_URL}/api/companies/${companyId}/save_activities/
Line 441: http://localhost:8000/api/companies/ → ${API_BASE_URL}/api/companies/
Line 448: http://localhost:8000/api/companies/ → ${API_BASE_URL}/api/companies/
Line 465: http://localhost:8000/api/companies/${company.id}/ → ${API_BASE_URL}/api/companies/${company.id}/
Line 482: http://localhost:8000/api/companies/${companyId}/save_activities/ → ${API_BASE_URL}/api/companies/${companyId}/save_activities/
Line 505: http://localhost:8000/api/companies/${companyId}/frameworks/ → ${API_BASE_URL}/api/companies/${companyId}/frameworks/

6. frontend/src/components/Rame.js
Add at the top after other imports:
javascriptimport { API_BASE_URL } from '../config';
Replace:

Line 26: http://localhost:8000/api/frameworks/voluntary/ → ${API_BASE_URL}/api/frameworks/voluntary/

Don't forget to create the config.js file first!
Create frontend/src/config.js:
javascriptconst getApiUrl = () => {
  if (window.location.hostname.includes('onrender.com')) {
    return window.location.origin;
  }
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiUrl();
export default API_BASE_URL;