import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, makeAuthenticatedRequest } from '../context/AuthContext';
import { useLocationContext } from '../context/LocationContext';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import Layout from './Layout';
import { frameworkLogger } from '../utils/logger';

const List = () => {
  const navigate = useNavigate();
  const { user, selectedCompany, hasPermission } = useAuth();
  const { selectedLocation, loading: locationLoading } = useLocationContext();
  const [answers, setAnswers] = useState({});
  const [showChecklist, setShowChecklist] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [profilingQuestions, setProfilingQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });
  const [checklistExists, setChecklistExists] = useState(false);
  
  // Assignment states
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [assignments, setAssignments] = useState({ category_assignments: {}, element_assignments: {} });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [backendChecklist, setBackendChecklist] = useState([]);
  
  // Get company ID from auth context
  const companyId = selectedCompany?.id;
  
  // Debug logging
  console.log('List component - selectedCompany:', selectedCompany);
  console.log('List component - companyId:', companyId);
  console.log('List component - user:', user);

  // Modal helper function
  const showModal = (type, title, message) => {
    setModalState({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      type: 'info',
      title: '',
      message: ''
    });
  };

  // Fetch framework elements as questions based on onboarding profile and framework selection
  const fetchProfilingQuestions = async () => {
      if (!companyId) {
        console.log('No company selected, skipping framework questions fetch');
        return;
      }

      try {
        console.log('🔍 Fetching framework questions for company:', companyId);

        // Get framework elements that have wizard questions (for conditional logic)
        const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/framework-elements/wizard_questions/?company_id=${companyId}`);
        console.log('Framework wizard questions response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          const questions = data.questions || [];
          console.log('🎯 Fetched framework wizard questions:', questions);

          // Log to backend for production debugging
          await frameworkLogger.logWizardQuestionsFetch(
            companyId,
            questions.length,
            response.status
          );

          if (Array.isArray(questions) && questions.length > 0) {
            const transformedQuestions = questions.map(q => ({
              id: q.element_id || q.id,
              text: q.question,
              activatesElement: q.element_id,
              category: 'Framework Assessment',
              framework_id: q.framework_id,
              condition_logic: q.condition_logic
            }));
            console.log('🔄 Transformed framework questions:', transformedQuestions);
            setProfilingQuestions(transformedQuestions);
          } else {
            console.log('⚠️ No framework wizard questions found, using default approach');

            // Log warning to backend
            await frameworkLogger.logNoWizardQuestions(companyId);

            // Fallback: Get framework elements directly and create questions from conditional ones
            await fetchFrameworkElementsAsQuestions();
          }
        } else {
          console.error('Failed to fetch framework wizard questions. Status:', response.status);
          await fetchFrameworkElementsAsQuestions();
        }
      } catch (error) {
        console.error('Error fetching framework questions:', error);
        await fetchFrameworkElementsAsQuestions();
      }
  };

  // Fallback: Convert conditional framework elements to questions
  const fetchFrameworkElementsAsQuestions = async () => {
    try {
      console.log('🔄 Fetching framework elements for conversion to questions');
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/framework-elements/?type=conditional`);

      if (response.ok) {
        const elements = await response.json();
        console.log('📋 Fetched conditional elements:', elements);

        // Handle DRF paginated response format
        let elementsArray = [];
        if (Array.isArray(elements)) {
          elementsArray = elements;
        } else if (elements && Array.isArray(elements.results)) {
          // DRF paginated response
          elementsArray = elements.results;
          console.log('✅ Using paginated results:', elementsArray.length, 'elements');
        } else {
          console.warn('⚠️ Backend returned unexpected data format for framework elements:', typeof elements, elements);
        }

        const questions = elementsArray
          .filter(el => el.wizard_question || el.condition_logic)
          .map(el => ({
            id: el.element_id,
            text: el.wizard_question || `Do you need to report: ${el.name_plain}?`,
            activatesElement: el.element_id,
            category: 'Framework Assessment',
            framework_id: el.framework_id,
            condition_logic: el.condition_logic
          }));

        console.log('🔄 Generated questions from elements:', questions);
        setProfilingQuestions(questions);
      }
    } catch (error) {
      console.error('Error fetching framework elements as questions:', error);
      setProfilingQuestions([]);
    }
  };

  // Fetch available users for assignment
  const fetchAvailableUsers = async () => {
    if (!companyId) return;
    
    setLoadingUsers(true);
    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/element-assignments/available_users/?company_id=${companyId}`
      );
      if (response.ok) {
        const users = await response.json();
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setLoadingUsers(false);
  };

  // Fetch existing assignments
  const fetchAssignments = async () => {
    if (!companyId) return;
    
    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/element-assignments/get_assignments/?company_id=${companyId}`
      );
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  // Handle category assignment
  const handleCategoryAssignment = async (category, userId) => {
    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/element-assignments/assign_category/`,
        {
          method: 'POST',
          body: JSON.stringify({
            company_id: companyId,
            category: category,
            user_id: userId
          })
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        showModal('success', 'Success', result.message);
        fetchAssignments(); // Refresh assignments
        setShowUserModal(false);
        setSelectedCategory(null);
      } else {
        const error = await response.json();
        showModal('error', 'Error', error.error || 'Failed to assign category');
      }
    } catch (error) {
      console.error('Error assigning category:', error);
      showModal('error', 'Error', 'Failed to assign category');
    }
  };

  // Handle element assignment
  const handleElementAssignment = async (elementId, userId) => {
    try {
      console.log('Assigning element - elementId:', elementId, 'userId:', userId);
      console.log('Selected element object:', selectedElement);
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/element-assignments/assign_element/`,
        {
          method: 'POST',
          body: JSON.stringify({
            checklist_item_id: elementId,
            user_id: userId
          })
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        showModal('success', 'Success', result.message);
        fetchAssignments(); // Refresh assignments
        setShowUserModal(false);
        setSelectedElement(null);
      } else {
        const error = await response.json();
        showModal('error', 'Error', error.error || 'Failed to assign element');
      }
    } catch (error) {
      console.error('Error assigning element:', error);
      showModal('error', 'Error', 'Failed to assign element');
    }
  };

  // Get assigned user for an element (considering hierarchy)
  const getAssignedUser = (elementId, category) => {
    // Check element-level assignment first (overrides category)
    if (assignments.element_assignments && assignments.element_assignments[elementId]) {
      return assignments.element_assignments[elementId];
    }
    // Fall back to category-level assignment
    if (assignments.category_assignments && assignments.category_assignments[category]) {
      return assignments.category_assignments[category];
    }
    return null;
  };

  useEffect(() => {
    const fetchData = async () => {
      // Wait for LocationContext to finish loading
      if (locationLoading) {
        console.log('⏳ Waiting for LocationContext to load...');
        return;
      }
      
      console.log('🔄 Starting data fetch for location:', selectedLocation?.name, 'ID:', selectedLocation?.id);
      setLoading(true);
      
      // Reset ALL state to ensure clean load for each location
      setAnswers({});
      setShowChecklist(false);
      setProfilingQuestions([]);
      setChecklistExists(false);
      setBackendChecklist([]);
      setAssignments({ category_assignments: {}, element_assignments: {} });
      
      // Fetch data in sequence for the new location
      await fetchProfilingQuestions();
      await fetchFrameworkElements();
      await fetchExistingAnswers();
      const checklistLoaded = await checkChecklistExists();
      await checkWizardCompletion();
      
      console.log('✅ Data fetch complete for location:', selectedLocation?.name);
      console.log('   - Checklist exists:', checklistLoaded);
      console.log('   - Backend checklist items:', backendChecklist.length);
      
      setLoading(false);
    };
    
    // Include locationLoading in dependencies
    if (companyId && !locationLoading) {
      if (selectedLocation) {
        console.log(`📍 Location set: ${selectedLocation.name} (ID: ${selectedLocation.id})`);
        fetchData();
      } else {
        console.log('⚠️ No location selected after loading complete');
        setLoading(false);
        // Clear all data
        setAnswers({});
        setShowChecklist(false);
        setProfilingQuestions([]);
        setChecklistExists(false);
        setBackendChecklist([]);
        setAssignments({ category_assignments: {}, element_assignments: {} });
      }
    }
  }, [companyId, selectedLocation?.id, locationLoading]); // Add locationLoading to dependencies

  // Fetch assignments when checklist is shown
  useEffect(() => {
    if (showChecklist && companyId) {
      fetchAssignments();
    }
  }, [showChecklist, companyId]);

  // Fetch existing answers from database
  const fetchExistingAnswers = async () => {
    if (!companyId) return;
    
    try {
      console.log('Fetching existing profile answers for company:', companyId);
      let url = `${API_BASE_URL}/api/companies/${companyId}/profile_answers/`;
      if (selectedLocation?.id && selectedLocation.id !== 'all') {
        url += `?site_id=${selectedLocation.id}`;
        console.log(`📍 Fetching answers for location: ${selectedLocation.name}`);
      } else if (selectedLocation?.id === 'all') {
        console.log(`🌐 Fetching aggregated answers for all locations`);
        // For "All Locations", don't add site_id to get aggregated data
      }
      const response = await makeAuthenticatedRequest(url);
      
      if (response.ok) {
        const answersData = await response.json();
        console.log('Loaded profile answers from API:', answersData);
        
        // Convert API format to component format
        const answersMap = {};
        answersData.forEach(item => {
          answersMap[item.question] = item.answer;
        });
        
        console.log('Setting answers state to:', answersMap);
        setAnswers(answersMap);
        
        // If we have answers, we should show the checklist
        if (Object.keys(answersMap).length > 0) {
          console.log('Answers found, checking if should show checklist');
        }
      } else {
        console.log('No existing answers found or API error, status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching existing answers:', error);
    }
  };

  // Check if checklist exists and fetch it
// Replace the checkChecklistExists function around line 190 with this:

const checkChecklistExists = async () => {
  if (!companyId) return false;
  
  try {
    console.log('🔍 Checking if checklist exists for company:', companyId);
    const timestamp = new Date().getTime();
    let checklistUrl = `${API_BASE_URL}/api/checklist/?company_id=${companyId}&t=${timestamp}`;
    
    if (selectedLocation?.id && selectedLocation.id !== 'all') {
      checklistUrl += `&site_id=${selectedLocation.id}`;
      console.log(`🏢 Checking checklist for location: ${selectedLocation.name}`);
    } else if (selectedLocation?.id === 'all') {
      console.log(`🌍 Checking aggregated checklist for all locations`);
      // Don't add site_id for All Locations view
    }
    
    const response = await makeAuthenticatedRequest(checklistUrl);
    if (response.ok) {
      const checklistData = await response.json();
      console.log('📋 Raw checklist response:', checklistData);
      
      const exists = checklistData.results && checklistData.results.length > 0;
      console.log('✅ Checklist exists check result:', exists);
      setChecklistExists(exists);
      
      if (exists) {
        // Transform the checklist data properly
        const transformedChecklist = checklistData.results.map(item => ({
          id: item.id,
          name: item.element_name,
          description: item.element_description,
          unit: item.element_unit,
          cadence: item.cadence,
          frameworks: item.frameworks_list,
          category: item.category === 'E' ? 'Environmental' :
                   item.category === 'S' ? 'Social' :
                   item.category === 'G' ? 'Governance' :
                   (item.is_metered ? 'Environmental' : 'Social'),
          isMetered: item.is_metered,
          // IMPORTANT: Include location data from aggregation
          locations: item.locations || [],
          location_count: item.location_count || 0,
          location_type: item.location_type || 'unknown'
        }));
        
        setBackendChecklist(transformedChecklist);
        
        // Debug output for All Locations
        if (selectedLocation?.id === 'all') {
          console.log('🌍 All Locations Aggregation:', {
            totalElements: transformedChecklist.length,
            aggregationStats: checklistData.aggregation_stats,
            elements: transformedChecklist.map(item => ({
              name: item.name,
              type: item.location_type,
              count: item.location_count,
              sites: item.locations?.map(l => l.name).join(', ')
            }))
          });
        }
        
        console.log('✅ Loaded backend checklist with', transformedChecklist.length, 'items');
      }
      
      return exists;
    } else {
      console.log('❌ Failed to check checklist:', response.status);
      setChecklistExists(false);
    }
  } catch (error) {
    console.error('❌ Error checking checklist existence:', error);
    setChecklistExists(false);
  }
  return false;
};

  // Check if wizard has been completed
  const checkWizardCompletion = async () => {
    if (!companyId || !selectedLocation) return;
    
    try {
      console.log(`🔍 Checking wizard completion for location: ${selectedLocation.name}`);
      
      // Check if company has answered all questions (wizard completed)
      let answersUrl = `${API_BASE_URL}/api/companies/${companyId}/profile_answers/`;
      if (selectedLocation?.id && selectedLocation.id !== 'all') {
        answersUrl += `?site_id=${selectedLocation.id}`;
      } else if (selectedLocation?.id === 'all') {
        console.log(`🌐 Checking wizard completion for all locations`);
        // For "All Locations", don't add site_id to get aggregated data
      }
      const response = await makeAuthenticatedRequest(answersUrl);
      if (response.ok) {
        const answersData = await response.json();
        const questionsResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/profiling-questions/for_company/?company_id=${companyId}`);
        if (questionsResponse.ok) {
          const questionsData = await questionsResponse.json();
          
          // If all questions are answered, check if checklist exists
          if (answersData.length > 0 && answersData.length >= questionsData.length) {
            console.log(`✅ Profiling wizard completed for ${selectedLocation.name}`);
            // Don't re-check checklist exists here, we already did it in the main flow
            if (checklistExists) {
              console.log(`📋 Showing checklist view for ${selectedLocation.name}`);
              setShowChecklist(true);
            }
          } else {
            console.log(`⏳ Wizard not completed for ${selectedLocation.name}: ${answersData.length}/${questionsData.length} questions answered`);
            setShowChecklist(false);
          }
        }
      }
    } catch (error) {
      console.error('Error checking wizard completion:', error);
    }
  };

  // State for framework elements
  const [frameworkElements, setFrameworkElements] = useState([]);
  const [frameworkQuestionAnswers, setFrameworkQuestionAnswers] = useState({});

  // Fetch framework elements for checklist generation
  const fetchFrameworkElements = async () => {
    if (!companyId) return;

    try {
      console.log('🔍 Fetching framework elements for company:', companyId);
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/framework-elements/for_company/?company_id=${companyId}`);

      if (response.ok) {
        const elements = await response.json();
        console.log('📋 Fetched framework elements:', elements);
        setFrameworkElements(elements || []);
      } else {
        console.error('Failed to fetch framework elements:', response.status);
      }
    } catch (error) {
      console.error('Error fetching framework elements:', error);
    }
  };

  const handleAnswerChange = async (questionId, answer) => {
    // Check if user has edit permission
    if (!hasPermission('frameworkSelection', 'update')) {
      showModal('warning', 'Permission Denied', 'You do not have permission to edit profiling answers. This is view-only mode.');
      return;
    }

    // Check if "All Locations" is selected
    if (selectedLocation?.id === 'all') {
      showModal('warning', 'Location Required', 'Please select a specific location to edit profile answers. The "All Locations" view is for viewing aggregated data only.');
      return;
    }

    const newAnswers = {
      ...answers,
      [questionId]: answer
    };
    setAnswers(newAnswers);
    
    // Save to database
    try {
      console.log('Saving profiling answer to database:', questionId, answer);
      const requestBody = {
        question: questionId,
        answer: answer
      };
      if (selectedLocation?.id && selectedLocation.id !== 'all') {
        requestBody.site_id = selectedLocation.id;
      }
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/${companyId}/save_profile_answer/`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const savedAnswer = await response.json();
        console.log('Answer saved successfully:', savedAnswer);
      } else {
        console.error('Failed to save answer. Status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        // If it's a 403 error, show permission denied message
        if (response.status === 403) {
          showModal('error', 'Permission Denied', 'You can only view profiling answers.');
        }
      }
    } catch (error) {
      console.error('Error saving answer to database:', error);
    }
  };

  const handleAnswerAll = async (answer) => {
    // Check if user has edit permission
    if (!hasPermission('frameworkSelection', 'update')) {
      showModal('warning', 'Permission Denied', 'You do not have permission to edit profiling answers. This is view-only mode.');
      return;
    }

    // Check if "All Locations" is selected
    if (selectedLocation?.id === 'all') {
      showModal('warning', 'Location Required', 'Please select a specific location to edit profile answers. The "All Locations" view is for viewing aggregated data only.');
      return;
    }

    const allAnswers = {};
    profilingQuestions.forEach(question => {
      allAnswers[question.id] = answer;
    });
    setAnswers(allAnswers);

    // Use the bulk save endpoint that also generates checklist
    try {
      console.log('Saving all profiling answers using bulk endpoint:', answer);

      // Transform answers to backend format (same as saveAnswersAndGenerateChecklist)
      const backendAnswers = profilingQuestions.map(question => ({
        question_id: question.id,
        answer: answer === true
      }));

      const requestBody = {
        company_id: companyId,
        answers: backendAnswers
      };

      if (selectedLocation?.id && selectedLocation.id !== 'all') {
        requestBody.site_id = selectedLocation.id;
      }

      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/profiling-questions/save_answers/`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        console.log('All answers saved successfully via bulk endpoint');

        // Check if checklist was generated and update state
        const checklistExists = await checkChecklistExists();
        if (checklistExists) {
          setChecklistExists(true);
          setShowChecklist(true);
        }
      } else {
        console.error('Failed to save answers via bulk endpoint. Status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        if (response.status === 403) {
          showModal('error', 'Permission Denied', 'You can only view profiling answers.');
        } else {
          showModal('error', 'Save Failed', 'Failed to save answers. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error saving all answers via bulk endpoint:', error);
      showModal('error', 'Save Failed', 'Failed to save answers. Please try again.');
    }
  };

  const allQuestionsAnswered = profilingQuestions.length > 0 && profilingQuestions.every(question => 
    answers.hasOwnProperty(question.id)
  );
  
  // Debug logging
  console.log('🔍 Component render state:', {
    companyId,
    answersCount: Object.keys(answers).length,
    questionsCount: profilingQuestions.length,
    allQuestionsAnswered: allQuestionsAnswered,
    showChecklist: showChecklist,
    checklistExists: checklistExists,
    hasEditPermission: hasPermission('frameworkSelection', 'update'),
    userRole: user?.role,
    loading: loading
  });


  // API function to save answers and generate checklist
  const saveAnswersAndGenerateChecklist = async () => {
    if (!allQuestionsAnswered) return false;
    
    setIsGenerating(true);
    try {
      // Transform answers to backend format
      const backendAnswers = profilingQuestions.map(question => ({
        question_id: question.id,
        answer: answers[question.id] === true
      }));
      
      console.log('Sending answers to backend:', backendAnswers);

      // Save answers to backend
      const requestBody = {
        company_id: companyId,
        answers: backendAnswers
      };
      
      if (selectedLocation?.id && selectedLocation.id !== 'all') {
        requestBody.site_id = selectedLocation.id;
        console.log(`🏢 Saving profile answers for location: ${selectedLocation.name}`);
      } else if (selectedLocation?.id === 'all') {
        console.log(`🌐 Cannot save answers for All Locations view - please select a specific location`);
        showModal('warning', 'Location Required', 'Please select a specific location to save profile answers. The "All Locations" view is for viewing aggregated data only.');
        return false;
      }
      
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/profiling-questions/save_answers/`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        // Fetch the generated checklist
        let checklistUrl = `${API_BASE_URL}/api/checklist/?company_id=${companyId}`;
        if (selectedLocation?.id && selectedLocation.id !== 'all') {
          checklistUrl += `&site_id=${selectedLocation.id}`;
        }
        const checklistResponse = await makeAuthenticatedRequest(checklistUrl);
        if (checklistResponse.ok) {
          const checklistData = await checklistResponse.json();
          console.log('🔍 Raw checklist response for All Locations debug:', checklistData);
          console.log('🔍 Sample checklist item:', checklistData.results?.[0]);
          
          // Transform backend checklist to frontend format for display
          const transformedChecklist = checklistData.results.map(item => ({
            id: item.id,  // This is the actual database ID we need for assignments
            name: item.element_name,
            description: item.element_description,
            unit: item.element_unit,
            cadence: item.cadence,
            frameworks: item.frameworks_list,
            category: item.category === 'E' ? 'Environmental' :
                     item.category === 'S' ? 'Social' :
                     item.category === 'G' ? 'Governance' :
                     (item.is_metered ? 'Environmental' : 'Social'),
            isMetered: item.is_metered,
            // Add location data for All Locations view
            locations: item.locations || [],
            location_count: item.location_count || 0,
            location_type: item.location_type || 'unknown'
          }));
          
          console.log('🔍 Transformed checklist with location data:', transformedChecklist[0]);
          
          // Store in state for use in assignments
          setBackendChecklist(transformedChecklist);
          
          // Checklist is now stored in database, no need for localStorage
          return transformedChecklist;
        }
      }
      
      throw new Error('Failed to save answers or generate checklist');
    } catch (error) {
      console.error('Error saving answers and generating checklist:', error);
      showModal('error', 'Generation Failed', 'Failed to generate checklist. Please try again.');
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateChecklist = () => {
    if (!allQuestionsAnswered || frameworkElements.length === 0) return [];

    // Start with all framework elements
    const checklist = frameworkElements.map(element => ({
      id: element.element_id || element.id,
      name: element.name_plain || element.name,
      description: element.description,
      unit: element.unit,
      cadence: element.cadence,
      frameworks: [element.framework_id],
      category: element.category === 'E' ? 'Environmental' :
                element.category === 'S' ? 'Social' :
                element.category === 'G' ? 'Governance' : 'Environmental',
      isMetered: element.metered,
      meter_type: element.meter_type
    }));

    // Sort by category
    return checklist.sort((a, b) => a.category.localeCompare(b.category));
  };

  // IMPORTANT: Use backend checklist if available for proper IDs
  // Only use generateChecklist() for display when backend data isn't loaded yet
  // Exception: For "All Locations" view, always wait for backend data (no local fallback)
  const localChecklist = selectedLocation?.id === 'all' ? [] : (generateChecklist() || []);
  const finalChecklist = backendChecklist.length > 0 ? backendChecklist : localChecklist;
  const canAssign = backendChecklist.length > 0; // Only allow assignment when backend data is loaded
  
  // Debug logging
  console.log('📊 Checklist Status:', {
    backendChecklistCount: backendChecklist.length,
    localChecklistCount: localChecklist.length,
    finalChecklistCount: finalChecklist.length,
    usingBackend: backendChecklist.length > 0
  });
  
  const getCategoryStats = () => {
    if (!finalChecklist) return { environmental: 0, social: 0, governance: 0 };
    
    return finalChecklist.reduce((stats, item) => {
      const category = item.category.toLowerCase();
      stats[category] = (stats[category] || 0) + 1;
      return stats;
    }, { environmental: 0, social: 0, governance: 0 });
  };

  const categoryStats = getCategoryStats();

  const handleContinue = () => {
    // Wizard completion is now tracked by database (all questions answered)
    console.log('Profiling wizard completed, continuing to meters');
    navigate('/meter');
  };

  // Only show checklist if we have data and a selected location, OR if All Locations is selected
  if ((showChecklist && allQuestionsAnswered && selectedLocation) || (selectedLocation?.id === 'all')) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        {/* Checklist Header */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-check-circle text-green-600"></i>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Personalized Data Checklist
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                {selectedLocation?.id === 'all' ? (
                  <span>
                    View: <strong className="text-purple-600">All Locations Combined</strong> | 
                    Showing aggregated data from all sites
                  </span>
                ) : (
                  <span>
                    Location: <strong className="text-purple-600">{selectedLocation?.name}</strong> | 
                    Site ID: <strong>{selectedLocation?.id}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{finalChecklist.length}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Elements</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{categoryStats.environmental}</div>
              <div className="text-xs sm:text-sm text-gray-600">Environmental</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">{categoryStats.social}</div>
              <div className="text-xs sm:text-sm text-gray-600">Social</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">{categoryStats.governance}</div>
              <div className="text-xs sm:text-sm text-gray-600">Governance</div>
            </div>
          </div>
        </div>

        {/* Checklist Items Grouped by Category */}
        {['Environmental', 'Social', 'Governance'].map(category => {
          const categoryItems = finalChecklist.filter(item => item.category === category);
          const categoryAssignment = assignments.category_assignments?.[category];
          
          if (categoryItems.length === 0) return null;
          
          return (
            <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 sm:mb-8">
              <div className={`p-4 sm:p-6 border-b border-gray-200 ${
                category === 'Environmental' ? 'bg-green-50' :
                category === 'Social' ? 'bg-purple-50' :
                'bg-orange-50'
              }`}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">{category} Elements</h3>
                    <p className="text-sm sm:text-base text-gray-600">{categoryItems.length} elements in this category</p>
                    {categoryAssignment && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        <i className="fas fa-user mr-1"></i>
                        Default assignee: <span className="font-medium">{categoryAssignment.username}</span>
                      </p>
                    )}
                  </div>
                  {hasPermission('elementAssignment', 'create') && canAssign && selectedLocation?.id !== 'all' && (
                    <button
                      onClick={() => {
                        setSelectedCategory(category);
                        setSelectedElement(null);
                        fetchAvailableUsers();
                        setShowUserModal(true);
                      }}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-white font-medium text-xs sm:text-sm ${
                        category === 'Environmental' ? 'bg-green-600 hover:bg-green-700' :
                        category === 'Social' ? 'bg-purple-600 hover:bg-purple-700' :
                        'bg-orange-600 hover:bg-orange-700'
                      }`}
                    >
                      <i className="fas fa-users mr-1 sm:mr-2"></i>
                      Assign Category
                    </button>
                  )}
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {categoryItems.map((item, index) => {
                  const assignedUser = getAssignedUser(item.id, category);
                  
                  return (
                    <div key={item.id} className="p-4 sm:p-6 hover:bg-blue-50 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                            <span className="text-xs sm:text-sm font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              #{index + 1}
                            </span>
                            <h4 className="font-bold text-gray-900 text-base sm:text-lg">{item.name}</h4>
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${
                              item.category === 'Environmental' ? 'bg-green-200 text-green-900' :
                              item.category === 'Social' ? 'bg-purple-200 text-purple-900' :
                              'bg-orange-200 text-orange-900'
                            }`}>
                              {item.category}
                            </span>
                          </div>
                          
                          <p className="text-gray-700 text-sm sm:text-base mb-4 font-medium">{item.description}</p>
                          
                          {/* Make the info badges stack on mobile */}
                          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-gray-700">
                            <div className="flex items-center space-x-2 bg-gray-100 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
                              <i className="fas fa-ruler text-gray-600"></i>
                              <span>Unit: <span className="font-bold text-gray-900">{item.unit}</span></span>
                            </div>
                            <div className="flex items-center space-x-2 bg-gray-100 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
                              <i className="fas fa-clock text-gray-600"></i>
                              <span>Frequency: <span className="font-bold text-gray-900">{item.cadence}</span></span>
                            </div>
                            <div className="flex items-center space-x-2 bg-gray-100 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
                              <i className="fas fa-tags text-gray-600"></i>
                              <span>Frameworks:</span>
                              <div className="flex flex-wrap items-center gap-1">
                                {item.frameworks.map((framework, idx) => (
                                  <span key={idx} className={`px-1 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-bold ${
                                    framework === 'DST' ? 'bg-blue-200 text-blue-900' :
                                    framework === 'ESG' ? 'bg-green-200 text-green-900' :
                                    framework === 'Green Key' ? 'bg-teal-200 text-teal-900' :
                                    framework === 'TCFD' ? 'bg-orange-200 text-orange-900' :
                                    framework === 'SASB' ? 'bg-purple-200 text-purple-900' :
                                    'bg-gray-200 text-gray-900'
                                  }`}>
                                    {framework}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            {/* Location indicators for All Locations view */}
                            {selectedLocation?.id === 'all' && item.locations && (
                              <div className="flex items-center space-x-2 bg-gray-100 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
                                <i className="fas fa-map-marker-alt text-gray-600"></i>
                                <span>Locations:</span>
                                <div className="flex flex-wrap items-center gap-1">
                                  {item.location_type === 'shared' && (
                                    <>
                                      <span className="px-1 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-bold bg-blue-200 text-blue-900">
                                        <i className="fas fa-users mr-1"></i>
                                        Shared ({item.location_count} sites)
                                      </span>
                                      {/* Show site names */}
                                      {item.locations.map((location, idx) => (
                                        <span key={idx} className="px-1 sm:px-2 py-0.5 sm:py-1 rounded text-xs bg-gray-200 text-gray-700">
                                          {location.name}
                                        </span>
                                      ))}
                                    </>
                                  )}
                                  {item.location_type === 'unique' && item.locations[0] && (
                                    <span className="px-1 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-bold bg-amber-200 text-amber-900">
                                      <i className="fas fa-star mr-1"></i>
                                      Unique to {item.locations[0].name}
                                    </span>
                                  )}
                                  {item.location_type === 'none' && (
                                    <span className="px-1 sm:px-2 py-0.5 sm:py-1 rounded text-xs bg-gray-200 text-gray-500">
                                      No site assigned
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Assignment Section - moves below on mobile */}
                        <div className="mt-4 lg:mt-0 lg:ml-6 text-left lg:text-right">
                          {assignedUser ? (
                            <div className="mb-2">
                              <p className="text-xs sm:text-sm text-gray-500">Assigned to:</p>
                              <p className="font-medium text-sm sm:text-base text-gray-900">{assignedUser.username}</p>
                              <p className="text-xs text-gray-500">{assignedUser.email}</p>
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm text-gray-400 mb-2">Unassigned</p>
                          )}
                          
                          {hasPermission('elementAssignment', 'create') && canAssign && selectedLocation?.id !== 'all' && (
                            <button
                              onClick={() => {
                                console.log('Assigning item:', item);
                                setSelectedElement(item);
                                setSelectedCategory(null);
                                fetchAvailableUsers();
                                setShowUserModal(true);
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs sm:text-sm hover:bg-blue-700 whitespace-nowrap"
                            >
                              <i className="fas fa-user-edit mr-1"></i>
                              {assignedUser ? 'Reassign' : 'Assign'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Action Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 gap-3">
          {selectedLocation?.id !== 'all' ? (
            <button
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              onClick={async () => {
                setShowChecklist(false);
                await checkChecklistExists();
              }}
            >
              <i className="fas fa-arrow-left mr-2"></i>Back to Questions
            </button>
          ) : (
            <div></div>
          )}
          <button
            className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg font-medium"
            onClick={handleContinue}
          >
            Save & Continue
            <i className="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
        
        {/* User Selection Modal */}
        {showUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
                {selectedCategory ? `Assign ${selectedCategory} Category` : `Assign ${selectedElement?.name}`}
              </h3>
              
              {loadingUsers ? (
                <div className="text-center py-4">
                  <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                  <p className="text-sm sm:text-base text-gray-500 mt-2">Loading users...</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {availableUsers.length === 0 ? (
                    <p className="text-sm sm:text-base text-gray-500">No users available</p>
                  ) : (
                    availableUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => {
                          if (selectedCategory) {
                            handleCategoryAssignment(selectedCategory, user.id);
                          } else if (selectedElement) {
                            handleElementAssignment(selectedElement.id, user.id);
                          }
                        }}
                        className="w-full text-left p-2 sm:p-3 hover:bg-gray-50 rounded-lg mb-2 border border-gray-200"
                      >
                        <div className="font-medium text-sm sm:text-base text-gray-900">{user.full_name}</div>
                        <div className="text-xs sm:text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Role: {user.role} | Active assignments: {user.assignment_count}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedCategory(null);
                    setSelectedElement(null);
                  }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">No Company Selected</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Please select a company from the navigation bar to continue with profiling.
          </p>
        </div>
      </div>
    );
  }

  // Show loading while LocationContext is initializing
  if (locationLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-sm sm:text-base text-gray-600">Loading location data...</span>
        </div>
      </div>
    );
  }

  // Show loading while component is fetching data
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-sm sm:text-base text-gray-600">Loading profiling questions...</span>
        </div>
      </div>
    );
  }

  // Check if location is selected ONLY AFTER LocationContext has loaded
  if (!locationLoading && !selectedLocation) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <i className="fas fa-map-marker-alt text-4xl text-yellow-600 mb-4"></i>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Location Selected</h2>
          <p className="text-gray-600 mb-4">Please select a location to view profiling questions.</p>
          <button 
            onClick={() => navigate('/location')}
            className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Go to Location Selection
          </button>
        </div>
      </div>
    );
  }

  if (profilingQuestions.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">No Questions Available</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            No profiling questions found. Please contact support or check your backend configuration.
          </p>
          <div className="text-xs sm:text-sm text-gray-500">
            Debug info: Company ID: {companyId}, Questions loaded: {profilingQuestions.length}, Loading: {loading.toString()}
          </div>
          <div className="mt-4">
            <button 
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
              onClick={() => {
                setLoading(true);
                fetchProfilingQuestions();
              }}
            >
              Retry Loading Questions
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Profiling Wizard Header */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 mb-6 sm:mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-question-circle text-blue-600"></i>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Profiling Wizard</h2>
            <p className="text-sm sm:text-base text-gray-600">Answer these questions to personalize your data requirements</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs sm:text-sm text-gray-600">
            <span className="font-medium">{Object.keys(answers).length}</span> of <span className="font-medium">{profilingQuestions.length}</span> questions answered
            {!hasPermission('frameworkSelection', 'update') && (
              <span className="ml-2 sm:ml-4 px-2 sm:px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                <i className="fas fa-eye mr-1"></i>View Only
              </span>
            )}
          </div>
          {hasPermission('frameworkSelection', 'update') && selectedLocation?.id !== 'all' && (
            <div className="flex space-x-2 sm:space-x-3">
              <button 
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs sm:text-sm font-medium"
                onClick={() => handleAnswerAll(false)}
              >
                <i className="fas fa-times mr-1 sm:mr-2"></i>Answer All No
              </button>
              <button 
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-xs sm:text-sm font-medium"
                onClick={() => handleAnswerAll(true)}
              >
                <i className="fas fa-check mr-1 sm:mr-2"></i>Answer All Yes
              </button>
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(Object.keys(answers).length / profilingQuestions.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Questions by Category - Hide for All Locations */}
      {selectedLocation?.id !== 'all' && ['Framework Assessment'].map(category => (
        <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">{category}</h3>
          </div>
          
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {profilingQuestions.filter(q => q.category === category).map((question) => (
              <div key={question.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm sm:text-base text-gray-900 mb-2">{question.text}</p>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {question.framework_id && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                          {question.framework_id}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        Element ID: {question.activatesElement}
                      </span>
                    </div>
                    {question.condition_logic && (
                      <p className="text-xs text-gray-400 italic">
                        Logic: {question.condition_logic}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2 sm:space-x-3">
                    <button
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                        answers[question.id] === false
                          ? 'bg-red-100 text-red-700 border-2 border-red-300'
                          : (!hasPermission('frameworkSelection', 'update') || selectedLocation?.id === 'all')
                          ? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-red-50'
                      }`}
                      onClick={() => handleAnswerChange(question.id, false)}
                      disabled={!hasPermission('frameworkSelection', 'update') || selectedLocation?.id === 'all'}
                    >
                      No
                    </button>
                    <button
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                        answers[question.id] === true
                          ? 'bg-green-100 text-green-700 border-2 border-green-300'
                          : (!hasPermission('frameworkSelection', 'update') || selectedLocation?.id === 'all')
                          ? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-green-50'
                      }`}
                      onClick={() => handleAnswerChange(question.id, true)}
                      disabled={!hasPermission('frameworkSelection', 'update') || selectedLocation?.id === 'all'}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Generate/View Checklist Button */}
      {allQuestionsAnswered && hasPermission('frameworkSelection', 'update') && !checklistExists && selectedLocation?.id !== 'all' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-green-900">All Questions Answered!</h3>
              <p className="text-sm sm:text-base text-green-700">Click below to generate your personalized data checklist</p>
            </div>
            <button
              className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              onClick={async () => {
                const checklist = await saveAnswersAndGenerateChecklist();
                if (checklist) {
                  console.log('Profiling wizard completed, showing checklist');
                  setChecklistExists(true);
                  setShowChecklist(true);
                }
              }}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-list mr-2"></i>Generate Checklist
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* All Locations Notice */}
      {selectedLocation?.id === 'all' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-globe text-blue-600"></i>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-blue-900">All Locations View</h3>
              <p className="text-sm sm:text-base text-blue-700">
                You're viewing aggregated data from all locations. To edit profile answers or generate checklists, please select a specific location.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* View Only Message with Checklist Access for Read-Only Users */}
      {!hasPermission('frameworkSelection', 'update') && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-eye text-blue-600"></i>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-blue-900">Profiling (View Only)</h3>
                <p className="text-sm sm:text-base text-blue-700">
                  {checklistExists 
                    ? "You can view the generated checklist." 
                    : "Questions have been answered by an admin. Checklist will be available once generated."
                  }
                </p>
              </div>
            </div>
            {checklistExists && (
              <button
                className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base"
                onClick={() => setShowChecklist(true)}
              >
                <i className="fas fa-eye mr-2"></i>View Checklist
              </button>
            )}
          </div>
        </div>
      )}

      {/* Checklist Ready Button - Only show if user has update permissions (blue section handles read-only case) */}
      {allQuestionsAnswered && checklistExists && !showChecklist && hasPermission('frameworkSelection', 'update') && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-green-900">✅ Checklist Ready!</h3>
              <p className="text-sm sm:text-base text-green-700">
                {selectedLocation?.id === 'all' 
                  ? 'Viewing aggregated checklists from all locations.'
                  : 'Your personalized data checklist has been created and is ready to view.'
                }
              </p>
            </div>
            <button
              className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm sm:text-base"
              onClick={() => setShowChecklist(true)}
            >
              <i className="fas fa-eye mr-2"></i>View Checklist
            </button>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 gap-3">
        <button 
          className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm sm:text-base"
          onClick={() => navigate('/frame')}
        >
          <i className="fas fa-arrow-left mr-2"></i>Back
        </button>
        <div className="text-center">
          <p className="text-xs sm:text-sm text-gray-600">
            {!allQuestionsAnswered 
              ? `Answer ${profilingQuestions.length - Object.keys(answers).length} more questions to continue`
              : checklistExists 
                ? 'Your checklist is ready for review' 
                : hasPermission('frameworkSelection', 'update') 
                  ? 'Generate your checklist to continue' 
                  : 'Waiting for checklist generation'
            }
          </p>
        </div>
      </div>

      {/* Modal for messages */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
      />
    </div>
  );
};

export default List;