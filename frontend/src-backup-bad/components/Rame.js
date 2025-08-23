import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Rame = () => {
  const navigate = useNavigate();
  const [selectedVoluntaryFrameworks, setSelectedVoluntaryFrameworks] = useState([]);

  const mandatoryFrameworks = [
    {
      id: 'gri',
      name: 'GRI Standards',
      description: 'Global Reporting Initiative - The world\'s most widely used sustainability reporting standards',
      icon: 'fas fa-leaf',
      color: 'green',
      coverage: 'Environmental, Social, Governance',
      reason: 'UAE regulatory requirement for hospitality sector'
    },
    {
      id: 'uae',
      name: 'UAE ESG Guidelines',
      description: 'National ESG reporting framework aligned with UAE Vision 2071 sustainability goals',
      icon: 'fas fa-flag',
      color: 'blue',
      coverage: 'Local compliance, Carbon neutrality',
      reason: 'UAE business registration requirement'
    }
  ];

  const voluntaryFrameworks = [
    {
      id: 'sasb',
      name: 'SASB Standards',
      description: 'Sustainability Accounting Standards Board - Industry-specific sustainability metrics',
      icon: 'fas fa-chart-bar',
      color: 'purple',
      features: ['Industry-specific metrics', 'Investor-focused reporting', 'Materiality assessment'],
      bestFor: 'Public companies, Investor relations'
    },
    {
      id: 'tcfd',
      name: 'TCFD',
      description: 'Task Force on Climate-related Financial Disclosures - Climate risk reporting',
      icon: 'fas fa-thermometer-half',
      color: 'orange',
      features: ['Climate risk assessment', 'Scenario planning', 'Financial impact disclosure'],
      bestFor: 'Climate-focused reporting'
    },
    {
      id: 'cdp',
      name: 'CDP',
      description: 'Carbon Disclosure Project - Environmental disclosure system for companies',
      icon: 'fas fa-cloud',
      color: 'teal',
      features: ['Environmental disclosure', 'Climate scoring', 'Water & forest reporting'],
      bestFor: 'Environmental transparency'
    }
  ];

  const toggleVoluntaryFramework = (frameworkId) => {
    setSelectedVoluntaryFrameworks(prev => 
      prev.includes(frameworkId)
        ? prev.filter(id => id !== frameworkId)
        : [...prev, frameworkId]
    );
  };

  const handleContinue = () => {
    navigate('/list');
  };

  return (
    <div className="max-w-6xl mx-auto">

      {/* Mandatory Frameworks Section */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-lock text-red-600"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Mandatory Frameworks</h2>
          <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">Required</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mandatoryFrameworks.map((framework) => (
            <div key={framework.id} className="bg-white rounded-xl p-6 shadow-sm border-2 border-red-200">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-16 h-16 bg-${framework.color}-100 rounded-xl flex items-center justify-center`}>
                  <i className={`${framework.icon} text-${framework.color}-600 text-2xl`}></i>
                </div>
                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">Mandatory</div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{framework.name}</h3>
              <p className="text-gray-600 mb-4">{framework.description}</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-info-circle text-yellow-600 text-sm"></i>
                  <span className="text-yellow-800 text-sm font-medium">Auto-assigned: {framework.reason}</span>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-medium">Coverage:</span> {framework.coverage}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voluntary Frameworks Section */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-hand-pointer text-blue-600"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Voluntary Frameworks</h2>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Optional</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {voluntaryFrameworks.map((framework) => {
            const isSelected = selectedVoluntaryFrameworks.includes(framework.id);
            return (
              <div 
                key={framework.id} 
                className={`bg-white rounded-xl p-6 shadow-sm border transition-all cursor-pointer ${
                  isSelected ? 'border-blue-300 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
                onClick={() => toggleVoluntaryFramework(framework.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-16 h-16 bg-${framework.color}-100 rounded-xl flex items-center justify-center`}>
                    <i className={`${framework.icon} text-${framework.color}-600 text-2xl`}></i>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={isSelected}
                      onChange={() => {}}
                    />
                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${isSelected ? 'peer-checked:bg-blue-600' : ''}`}></div>
                  </label>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{framework.name}</h3>
                <p className="text-gray-600 mb-4">{framework.description}</p>
                <div className="space-y-2 mb-4">
                  {framework.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <i className="fas fa-check text-green-500 text-sm"></i>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-500">
                  <span className="font-medium">Best for:</span> {framework.bestFor}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Framework Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Frameworks Summary</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
            <span className="font-medium text-gray-900">Mandatory Frameworks</span>
            <span className="text-sm text-red-600 font-medium">{mandatoryFrameworks.length} Required</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="font-medium text-gray-900">Voluntary Frameworks</span>
            <span className="text-sm text-blue-600 font-medium">{selectedVoluntaryFrameworks.length} Selected</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <span className="font-medium text-gray-900">Total Frameworks</span>
            <span className="text-sm text-green-600 font-medium">{mandatoryFrameworks.length + selectedVoluntaryFrameworks.length} Active</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <button 
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            onClick={() => navigate('/onboard')}
          >
            <i className="fas fa-arrow-left mr-2"></i>Back
          </button>
        </div>
        <div className="flex space-x-4">
          <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
            <i className="fas fa-save mr-2"></i>Save Draft
          </button>
          <button 
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg font-medium"
            onClick={handleContinue}
          >
            Save & Continue
            <i className="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Rame;