import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const List = () => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({});
  const [showChecklist, setShowChecklist] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [profilingQuestions, setProfilingQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Get company ID (should come from auth context)
  const companyId = 1;

  // Fetch profiling questions from backend
  const fetchProfilingQuestions = async () => {
      try {
        console.log('Fetching profiling questions for company:', companyId);
        const response = await fetch(`http://localhost:8000/api/profiling-questions/for_company/?company_id=${companyId}`);
        console.log('Response status:', response.status, 'Response ok:', response.ok);
        
        if (response.ok) {
          const questions = await response.json();
          console.log('Fetched questions from backend:', questions);
          console.log('Questions type:', typeof questions, 'Length:', questions.length);
          
          if (Array.isArray(questions) && questions.length > 0) {
            const transformedQuestions = questions.map(q => ({
              id: q.question_id,
              text: q.text,
              activatesElement: q.activates_element,
              category: 'Basic Operations'
            }));
            console.log('Transformed questions:', transformedQuestions);
            setProfilingQuestions(transformedQuestions);
          } else {
            console.error('Questions array is empty or not an array:', questions);
          }
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch profiling questions. Status:', response.status, 'Error:', errorText);
        }
      } catch (error) {
        console.error('Error fetching profiling questions:', error);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    // Load saved answers from localStorage first
    const savedAnswers = localStorage.getItem(`profiling_answers_${companyId}`);
    if (savedAnswers) {
      console.log('Loading saved profiling answers:', savedAnswers);
      setAnswers(JSON.parse(savedAnswers));
    }
    
    // Check if wizard has been completed and checklist should be shown
    const wizardCompleted = localStorage.getItem(`profiling_wizard_completed_${companyId}`);
    if (wizardCompleted === 'true') {
      console.log('Profiling wizard was previously completed, showing checklist');
      setShowChecklist(true);
    }
    
    fetchProfilingQuestions();
  }, [companyId]);

  // Fallback hardcoded questions (will be replaced by API data)
  const fallbackQuestions = [
    {
      id: 'backup_generators',
      text: 'Do you have backup generators on-site?',
      activatesElement: 'generator_fuel',
      category: 'Basic Operations'
    },
    {
      id: 'company_vehicles',
      text: 'Do you own or operate company vehicles?',
      activatesElement: 'vehicle_fuel',
      category: 'Basic Operations'
    },
    {
      id: 'lpg_usage',
      text: 'Do you use LPG (liquid petroleum gas) in your operations?',
      activatesElement: 'lpg_consumption',
      category: 'Basic Operations'
    },
    {
      id: 'event_facilities',
      text: 'Do you have meeting rooms or event spaces available for hire?',
      activatesElement: 'green_events',
      category: 'Basic Operations'
    },
    {
      id: 'food_service',
      text: 'Do you have a restaurant, kitchen, or food service?',
      activatesElement: 'food_sourcing',
      category: 'Basic Operations'
    },
    {
      id: 'outdoor_spaces',
      text: 'Do you have outdoor spaces like gardens or lawns?',
      activatesElement: 'green_spaces',
      category: 'Basic Operations'
    },
    {
      id: 'renewable_energy',
      text: 'Do you use solar panels or other renewable energy sources?',
      activatesElement: 'renewable_energy_usage',
      category: 'Sustainability Practices'
    },
    {
      id: 'environmental_certification',
      text: 'Do you have ISO 14001 or similar environmental certification?',
      activatesElement: 'environmental_management_system',
      category: 'Sustainability Practices'
    },
    {
      id: 'listed_company',
      text: 'Is your company listed on any stock exchange?',
      activatesElement: 'board_composition',
      category: 'Sustainability Practices'
    }
  ];

  // Must-have data elements (always required)
  const mustHaveElements = [
    { id: 'electricity', name: 'Electricity Consumption', description: 'Total electricity from local providers', unit: 'kWh', cadence: 'Monthly', frameworks: ['DST', 'ESG', 'Green Key'], category: 'Environmental', is_metered: true, meter_type: 'Electricity' },
    { id: 'water', name: 'Water Consumption', description: 'Total water usage', unit: 'm³', cadence: 'Monthly', frameworks: ['DST', 'ESG', 'Green Key'], category: 'Environmental', is_metered: true, meter_type: 'Water' },
    { id: 'waste_landfill', name: 'Waste to Landfill', description: 'Non-recycled waste disposal', unit: 'kg', cadence: 'Monthly', frameworks: ['DST', 'ESG', 'Green Key'], category: 'Environmental', is_metered: true, meter_type: 'Waste' },
    { id: 'sustainability_policy', name: 'Sustainability Policy', description: 'Written sustainability policy', unit: 'Document', cadence: 'Annually', frameworks: ['DST', 'Green Key', 'ESG'], category: 'Social', is_metered: false },
    { id: 'sustainability_personnel', name: 'Sustainability Personnel', description: 'Certified sustainability staff', unit: 'Count', cadence: 'Annually', frameworks: ['DST', 'Green Key'], category: 'Social', is_metered: false },
    { id: 'employee_training', name: 'Employee Training Hours', description: 'Sustainability training per employee', unit: 'Hours', cadence: 'Annually', frameworks: ['DST', 'Green Key', 'ESG'], category: 'Social', is_metered: false },
    { id: 'guest_education', name: 'Guest Education', description: 'Guest sustainability initiatives', unit: 'Count', cadence: 'Quarterly', frameworks: ['DST', 'Green Key'], category: 'Social', is_metered: false },
    { id: 'community_initiatives', name: 'Community Initiatives', description: 'Local community programs', unit: 'Count, AED', cadence: 'Annually', frameworks: ['DST', 'Green Key', 'ESG'], category: 'Social', is_metered: false },
    { id: 'government_compliance', name: 'Government Compliance', description: 'Energy regulation compliance', unit: 'Status', cadence: 'Annually', frameworks: ['DST', 'ESG'], category: 'Governance', is_metered: false },
    { id: 'action_plan', name: 'Action Plan', description: 'Annual sustainability objectives', unit: 'Document', cadence: 'Annually', frameworks: ['DST', 'Green Key', 'ESG'], category: 'Governance', is_metered: false },
    { id: 'carbon_footprint', name: 'Carbon Footprint', description: 'Total GHG emissions', unit: 'tonnes CO2e', cadence: 'Annually', frameworks: ['ESG', 'DST'], category: 'Environmental', is_metered: false },
    { id: 'health_safety', name: 'Health & Safety Incidents', description: 'Workplace incidents', unit: 'Count', cadence: 'Monthly', frameworks: ['ESG'], category: 'Social', is_metered: false },
    { id: 'anti_corruption', name: 'Anti-corruption Policies', description: 'Anti-corruption measures', unit: 'Status', cadence: 'Annually', frameworks: ['ESG'], category: 'Governance', is_metered: false },
    { id: 'risk_management', name: 'Risk Management', description: 'ESG risk framework', unit: 'Status', cadence: 'Annually', frameworks: ['ESG'], category: 'Governance', is_metered: false }
  ];

  // Conditional data elements (activated by "Yes" answers)
  const conditionalElements = {
    'generator_fuel': { id: 'generator_fuel', name: 'Generator Fuel', description: 'Fuel for backup generators', unit: 'liters', cadence: 'Monthly', frameworks: ['DST', 'ESG'], category: 'Environmental', is_metered: true, meter_type: 'Generator' },
    'vehicle_fuel': { id: 'vehicle_fuel', name: 'Vehicle Fuel', description: 'Company vehicle fuel', unit: 'liters', cadence: 'Monthly', frameworks: ['DST', 'ESG'], category: 'Environmental', is_metered: true, meter_type: 'Vehicle' },
    'lpg_consumption': { id: 'lpg_consumption', name: 'LPG Usage', description: 'Liquid petroleum gas consumption', unit: 'kg', cadence: 'Monthly', frameworks: ['DST', 'ESG'], category: 'Environmental', is_metered: true, meter_type: 'LPG' },
    'green_events': { id: 'green_events', name: 'Green Events', description: 'Sustainable event services', unit: 'Count', cadence: 'Quarterly', frameworks: ['DST', 'Green Key'], category: 'Social', is_metered: false },
    'food_sourcing': { id: 'food_sourcing', name: 'Food Sourcing', description: 'Local/organic food purchases', unit: '%', cadence: 'Quarterly', frameworks: ['Green Key', 'ESG'], category: 'Environmental', is_metered: false },
    'green_spaces': { id: 'green_spaces', name: 'Green Spaces', description: 'Sustainable landscaping', unit: 'm²', cadence: 'Annually', frameworks: ['Green Key'], category: 'Environmental', is_metered: false },
    'renewable_energy_usage': { id: 'renewable_energy_usage', name: 'Renewable Energy', description: 'Energy from renewable sources', unit: '%', cadence: 'Quarterly', frameworks: ['Green Key', 'ESG'], category: 'Environmental', is_metered: true, meter_type: 'Renewable Energy' },
    'environmental_management_system': { id: 'environmental_management_system', name: 'Environmental Management System', description: 'EMS certification', unit: 'Status', cadence: 'Annually', frameworks: ['Green Key', 'ESG'], category: 'Governance', is_metered: false },
    'board_composition': { id: 'board_composition', name: 'Board Composition', description: 'Board diversity metrics', unit: '%', cadence: 'Annually', frameworks: ['ESG'], category: 'Governance', is_metered: false }
  };

  const handleAnswerChange = (questionId, answer) => {
    const newAnswers = {
      ...answers,
      [questionId]: answer
    };
    setAnswers(newAnswers);
    
    // Save to localStorage
    localStorage.setItem(`profiling_answers_${companyId}`, JSON.stringify(newAnswers));
    console.log('Saved profiling answer to localStorage:', questionId, answer);
  };

  const handleAnswerAll = (answer) => {
    const allAnswers = {};
    profilingQuestions.forEach(question => {
      allAnswers[question.id] = answer;
    });
    setAnswers(allAnswers);
    
    // Save to localStorage
    localStorage.setItem(`profiling_answers_${companyId}`, JSON.stringify(allAnswers));
    console.log('Saved all profiling answers to localStorage:', answer);
  };

  const allQuestionsAnswered = profilingQuestions.every(question => 
    answers.hasOwnProperty(question.id)
  );


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
      const response = await fetch('http://localhost:8000/api/profiling-questions/save_answers/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          answers: backendAnswers
        }),
      });

      if (response.ok) {
        // Fetch the generated checklist
        const checklistResponse = await fetch(`http://localhost:8000/api/checklist/?company_id=${companyId}`);
        if (checklistResponse.ok) {
          const checklistData = await checklistResponse.json();
          
          // Transform backend checklist to frontend format for display
          const transformedChecklist = checklistData.results.map(item => ({
            id: item.id,
            name: item.element_name,
            description: item.element_description,
            unit: item.element_unit,
            frequency: item.cadence,
            frameworks: item.frameworks_list,
            category: item.is_metered ? 'Environmental' : 'Social',
            isMetered: item.is_metered
          }));
          
          localStorage.setItem('finalizedChecklist', JSON.stringify(transformedChecklist));
          return transformedChecklist;
        }
      }
      
      throw new Error('Failed to save answers or generate checklist');
    } catch (error) {
      console.error('Error saving answers and generating checklist:', error);
      alert('Failed to generate checklist. Please try again.');
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateChecklist = () => {
    if (!allQuestionsAnswered) return;
    
    // Start with must-have elements
    const checklist = [...mustHaveElements];
    
    // Add conditional elements based on "Yes" answers
    profilingQuestions.forEach(question => {
      if (answers[question.id] === true && conditionalElements[question.activatesElement]) {
        checklist.push(conditionalElements[question.activatesElement]);
      }
    });
    
    // Sort by category
    return checklist.sort((a, b) => a.category.localeCompare(b.category));
  };

  const finalChecklist = generateChecklist();
  
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
    // Mark wizard as completed when continuing from checklist
    localStorage.setItem(`profiling_wizard_completed_${companyId}`, 'true');
    console.log('Profiling wizard marked as completed');
    navigate('/meter');
  };

  if (showChecklist && allQuestionsAnswered) {
    return (
      <div className="max-w-6xl mx-auto">
        {/* Checklist Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-check-circle text-green-600"></i>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Personalized Data Checklist</h2>
              <p className="text-gray-600">Your customized data requirements based on your responses</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{finalChecklist.length}</div>
              <div className="text-sm text-gray-600">Total Elements</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{categoryStats.environmental}</div>
              <div className="text-sm text-gray-600">Environmental</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{categoryStats.social}</div>
              <div className="text-sm text-gray-600">Social</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{categoryStats.governance}</div>
              <div className="text-sm text-gray-600">Governance</div>
            </div>
          </div>
        </div>

        {/* Checklist Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Data Collection Requirements</h3>
            <p className="text-gray-600">Complete list of data elements you need to track</p>
          </div>
          
          <div className="divide-y divide-gray-100">
            {finalChecklist.map((item, index) => (
              <div key={item.id} className="p-6 hover:bg-blue-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-sm font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">#{index + 1}</span>
                      <h4 className="font-bold text-gray-900 text-lg">{item.name}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.category === 'Environmental' ? 'bg-green-200 text-green-900' :
                        item.category === 'Social' ? 'bg-purple-200 text-purple-900' :
                        'bg-orange-200 text-orange-900'
                      }`}>
                        {item.category}
                      </span>
                    </div>
                    <p className="text-gray-700 text-base mb-4 font-medium">{item.description}</p>
                    <div className="flex items-center space-x-8 text-sm font-medium text-gray-700">
                      <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                        <i className="fas fa-ruler text-gray-600"></i>
                        <span>Unit: <span className="font-bold text-gray-900">{item.unit}</span></span>
                      </div>
                      <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                        <i className="fas fa-clock text-gray-600"></i>
                        <span>Frequency: <span className="font-bold text-gray-900">{item.cadence}</span></span>
                      </div>
                      <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                        <i className="fas fa-tags text-gray-600"></i>
                        <span>Frameworks:</span>
                        <div className="flex items-center space-x-2">
                          {item.frameworks.map((framework, idx) => (
                            <span key={idx} className={`px-2 py-1 rounded text-xs font-bold ${
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
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-4">
            <button 
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              onClick={() => setShowChecklist(false)}
            >
              <i className="fas fa-arrow-left mr-2"></i>Back to Questions
            </button>
          </div>
          <div className="flex space-x-4">
            <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
              <i className="fas fa-download mr-2"></i>Export Checklist
            </button>
            <button 
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:shadow-lg font-medium"
              onClick={handleContinue}
            >
              Save & Continue
              <i className="fas fa-arrow-right ml-2"></i>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading profiling questions...</span>
        </div>
      </div>
    );
  }

  if (profilingQuestions.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">No Questions Available</h3>
          <p className="text-gray-600 mb-4">
            No profiling questions found. Please contact support or check your backend configuration.
          </p>
          <div className="text-sm text-gray-500">
            Debug info: Company ID: {companyId}, Questions loaded: {profilingQuestions.length}, Loading: {loading.toString()}
          </div>
          <div className="mt-4">
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
    <div className="max-w-6xl mx-auto">
      {/* Profiling Wizard Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-question-circle text-blue-600"></i>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Profiling Wizard</h2>
            <p className="text-gray-600">Answer these questions to personalize your data requirements</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{Object.keys(answers).length}</span> of <span className="font-medium">{profilingQuestions.length}</span> questions answered
          </div>
          <div className="flex space-x-3">
            <button 
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
              onClick={() => handleAnswerAll(false)}
            >
              <i className="fas fa-times mr-2"></i>Answer All No
            </button>
            <button 
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
              onClick={() => handleAnswerAll(true)}
            >
              <i className="fas fa-check mr-2"></i>Answer All Yes
            </button>
          </div>
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

      {/* Questions by Category */}
      {['Basic Operations'].map(category => (
        <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
          </div>
          
          <div className="p-6 space-y-6">
            {profilingQuestions.filter(q => q.category === category).map((question) => (
              <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-gray-900 mb-2">{question.text}</p>
                    <p className="text-sm text-gray-500">
                      This will activate: <span className="font-medium">{conditionalElements[question.activatesElement]?.name || question.activatesElement}</span>
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        answers[question.id] === false
                          ? 'bg-red-100 text-red-700 border-2 border-red-300'
                          : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-red-50'
                      }`}
                      onClick={() => handleAnswerChange(question.id, false)}
                    >
                      No
                    </button>
                    <button
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        answers[question.id] === true
                          ? 'bg-green-100 text-green-700 border-2 border-green-300'
                          : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-green-50'
                      }`}
                      onClick={() => handleAnswerChange(question.id, true)}
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

      {/* Generate Checklist Button */}
      {allQuestionsAnswered && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-900">All Questions Answered!</h3>
              <p className="text-green-700">Click below to generate your personalized data checklist</p>
            </div>
            <button
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={async () => {
                const checklist = await saveAnswersAndGenerateChecklist();
                if (checklist) {
                  // Mark wizard as completed and show checklist
                  localStorage.setItem(`profiling_wizard_completed_${companyId}`, 'true');
                  console.log('Profiling wizard marked as completed');
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

      {/* Action Footer */}
      <div className="flex items-center justify-between bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <button 
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            onClick={() => navigate('/rame')}
          >
            <i className="fas fa-arrow-left mr-2"></i>Back
          </button>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {allQuestionsAnswered 
              ? 'Generate your checklist to continue' 
              : `Answer ${profilingQuestions.length - Object.keys(answers).length} more questions to continue`
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default List;