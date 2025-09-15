import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ConditionalWizard = ({ companyId, frameworkId, onComplete, onSkip }) => {
  const [wizardQuestions, setWizardQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    fetchWizardQuestions();
  }, [companyId, frameworkId]);

  const fetchWizardQuestions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/framework-elements/wizard_questions/?company_id=${companyId}${
          frameworkId ? `&framework_id=${frameworkId}` : ''
        }`
      );

      const questions = response.data.questions || [];
      setWizardQuestions(questions);

      if (questions.length === 0) {
        // No wizard questions, proceed directly to elements
        fetchApplicableElements({});
      }
    } catch (error) {
      console.error('Error fetching wizard questions:', error);
      // Fallback: proceed without wizard
      fetchApplicableElements({});
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicableElements = async (wizardAnswers = {}) => {
    try {
      const response = await axios.get(
        `/api/framework-elements/for_company/?company_id=${companyId}${
          frameworkId ? `&framework_id=${frameworkId}` : ''
        }`
      );

      const elements = response.data || [];
      setIsCompleted(true);

      if (onComplete) {
        onComplete(elements, wizardAnswers);
      }
    } catch (error) {
      console.error('Error fetching applicable elements:', error);
    }
  };

  const handleAnswer = async (questionId, answer) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    // Move to next question or complete wizard
    if (currentQuestion < wizardQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Wizard completed, fetch applicable elements
      await fetchApplicableElements(newAnswers);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      // Skip wizard and fetch all elements
      fetchApplicableElements({});
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading framework questions...</span>
      </div>
    );
  }

  if (isCompleted || wizardQuestions.length === 0) {
    return null;
  }

  const currentQ = wizardQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / wizardQuestions.length) * 100;

  return (
    <div className="conditional-wizard bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold text-gray-800">
            Framework Assessment
          </h3>
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip Assessment
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Answer these questions to get personalized ESG requirements for your organization.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {currentQuestion + 1} of {wizardQuestions.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Current Question */}
      <div className="mb-8">
        <div className="mb-4">
          <h4 className="text-lg font-medium text-gray-800 mb-2">
            {currentQ.question}
          </h4>
          {currentQ.element_id && (
            <div className="text-xs text-gray-500 mb-2">
              Related to: {currentQ.element_id}
            </div>
          )}
          {currentQ.framework_id && (
            <div className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded mb-4">
              {currentQ.framework_id}
            </div>
          )}
        </div>

        {/* Answer Options */}
        <div className="space-y-3">
          <button
            onClick={() => handleAnswer(currentQ.id, 'yes')}
            className="w-full p-4 text-left border border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-green-500 rounded-full mr-3 flex items-center justify-center">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <span className="font-medium text-green-700">Yes</span>
            </div>
          </button>

          <button
            onClick={() => handleAnswer(currentQ.id, 'no')}
            className="w-full p-4 text-left border border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-red-500 rounded-full mr-3 flex items-center justify-center">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              </div>
              <span className="font-medium text-red-700">No</span>
            </div>
          </button>

          <button
            onClick={() => handleAnswer(currentQ.id, 'not_sure')}
            className="w-full p-4 text-left border border-gray-300 rounded-lg hover:border-gray-500 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-gray-500 rounded-full mr-3 flex items-center justify-center">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              </div>
              <span className="font-medium text-gray-700">Not sure / Not applicable</span>
            </div>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleBack}
          disabled={currentQuestion === 0}
          className={`px-4 py-2 rounded-md ${
            currentQuestion === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } transition-colors duration-200`}
        >
          Previous
        </button>

        <div className="text-sm text-gray-500">
          {Object.keys(answers).length} of {wizardQuestions.length} answered
        </div>

        <button
          onClick={() => fetchApplicableElements(answers)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
        >
          {currentQuestion === wizardQuestions.length - 1 ? 'Complete' : 'Skip Remaining'}
        </button>
      </div>

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
          <div>Current answers: {JSON.stringify(answers, null, 2)}</div>
          <div>Condition logic: {currentQ.condition_logic}</div>
        </div>
      )}
    </div>
  );
};

export default ConditionalWizard;