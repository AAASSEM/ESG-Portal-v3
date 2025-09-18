import { API_BASE_URL } from '../config';

/**
 * Frontend logging utility that sends logs to backend for production debugging
 */
export const logToBackend = async (level, message, data = {}) => {
  try {
    // Only send logs in production or when explicitly enabled
    const shouldLog = process.env.NODE_ENV === 'production' ||
                     localStorage.getItem('enableBackendLogging') === 'true';

    if (!shouldLog) {
      console.log(`[LOGGER] Would send to backend: [${level}] ${message}`, data);
      return;
    }

    await fetch(`${API_BASE_URL}/api/logs/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify({
        level,
        message,
        data,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 200) // Limit length
      })
    });
  } catch (error) {
    console.error('Failed to send log to backend:', error);
  }
};

/**
 * Get CSRF token from cookies
 */
const getCsrfToken = () => {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  return cookieValue || '';
};

/**
 * Framework-specific logging helpers
 */
export const frameworkLogger = {
  /**
   * Log framework wizard questions fetch
   */
  logWizardQuestionsFetch: async (companyId, questionCount, responseStatus) => {
    await logToBackend('info', 'Framework wizard questions fetched', {
      company_id: companyId,
      question_count: questionCount,
      response_status: responseStatus,
      endpoint: 'framework-elements/wizard_questions'
    });
  },

  /**
   * Log when no wizard questions are returned
   */
  logNoWizardQuestions: async (companyId) => {
    await logToBackend('warning', 'No wizard questions returned', {
      company_id: companyId,
      endpoint: 'framework-elements/wizard_questions'
    });
  },

  /**
   * Log company frameworks fetch
   */
  logCompanyFrameworksFetch: async (companyId, frameworkCount) => {
    await logToBackend('info', 'Company frameworks fetched', {
      company_id: companyId,
      framework_count: frameworkCount,
      endpoint: 'companies/frameworks'
    });
  },

  /**
   * Log voluntary frameworks fetch
   */
  logVoluntaryFrameworksFetch: async (frameworkCount) => {
    await logToBackend('info', 'Voluntary frameworks fetched', {
      framework_count: frameworkCount,
      endpoint: 'frameworks/voluntary'
    });
  },

  /**
   * Log framework element fetch with pagination details
   */
  logFrameworkElementsFetch: async (companyId, elementCount, isPaginated) => {
    await logToBackend('info', 'Framework elements fetched', {
      company_id: companyId,
      element_count: elementCount,
      is_paginated: isPaginated,
      endpoint: 'framework-elements'
    });
  },

  /**
   * Log framework assignment/removal
   */
  logFrameworkAssignment: async (companyId, frameworkId, action, success) => {
    const level = success ? 'info' : 'error';
    await logToBackend(level, `Framework ${action}`, {
      company_id: companyId,
      framework_id: frameworkId,
      action: action, // 'assigned' or 'removed'
      success: success
    });
  }
};

/**
 * Debug helper to enable backend logging in development
 */
export const enableBackendLogging = () => {
  localStorage.setItem('enableBackendLogging', 'true');
  console.log('Backend logging enabled for development');
};

export const disableBackendLogging = () => {
  localStorage.removeItem('enableBackendLogging');
  console.log('Backend logging disabled');
};