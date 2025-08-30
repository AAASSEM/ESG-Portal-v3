import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DashboardHome = () => {
  const navigate = useNavigate();
  const { user, selectedCompany } = useAuth();

  const quickActions = [
    {
      title: 'Analytics Dashboard',
      description: 'View your ESG metrics and analytics',
      icon: 'fas fa-chart-bar',
      color: 'blue',
      path: '/dashboard',
      highlight: true
    },
    {
      title: 'Data Collection',
      description: 'Submit meter readings and ESG data',
      icon: 'fas fa-upload',
      color: 'green',
      path: '/data'
    },
    {
      title: 'Company Profile',
      description: 'Update business information and activities',
      icon: 'fas fa-building',
      color: 'purple',
      path: '/onboard'
    },
    {
      title: 'Framework Setup',
      description: 'Configure ESG frameworks and compliance',
      icon: 'fas fa-list-check',
      color: 'orange',
      path: '/rame'
    },
    {
      title: 'Meter Management',
      description: 'Configure and manage smart meters',
      icon: 'fas fa-gauge',
      color: 'teal',
      path: '/meter'
    },
    {
      title: 'Checklist',
      description: 'Complete profiling and setup tasks',
      icon: 'fas fa-tasks',
      color: 'indigo',
      path: '/list'
    }
  ];

  const features = [
    {
      icon: 'fas fa-leaf',
      title: 'Sustainability Tracking',
      description: 'Monitor your environmental impact with real-time data collection and automated reporting.'
    },
    {
      icon: 'fas fa-chart-line',
      title: 'Analytics & Insights',
      description: 'Get actionable insights from your ESG data with advanced analytics and visualization tools.'
    },
    {
      icon: 'fas fa-shield-check',
      title: 'Compliance Management',
      description: 'Stay compliant with various ESG frameworks including DST, Green Key, and industry standards.'
    },
    {
      icon: 'fas fa-users',
      title: 'Team Collaboration',
      description: 'Collaborate with your team members and assign tasks for efficient data collection.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 mb-8 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <i className="fas fa-leaf text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome Back
                </h1>
                <p className="text-gray-600">
                  Your comprehensive sustainability management platform
                </p>
              </div>
            </div>
            
            {selectedCompany && (
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center bg-white px-4 py-2 rounded-lg border border-blue-200">
                  <i className="fas fa-building text-blue-600 mr-2"></i>
                  <span className="font-medium text-gray-900">{selectedCompany.name}</span>
                </div>
                {user && (
                  <div className="flex items-center bg-white px-4 py-2 rounded-lg border border-purple-200">
                    <i className="fas fa-user text-purple-600 mr-2"></i>
                    <span className="text-gray-700">{user.name || user.email}</span>
                    <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      {user.role?.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <p className="text-gray-700 text-lg leading-relaxed max-w-2xl">
              Track your environmental, social, and governance performance with our integrated platform. 
              Collect data, generate insights, and ensure compliance with global ESG standards.
            </p>
          </div>
          
          <div className="hidden lg:block">
            <div className="w-64 h-48 bg-gradient-to-br from-green-100 to-blue-100 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-chart-pie text-5xl text-green-600 mb-4"></i>
                <p className="text-sm font-medium text-gray-700">Real-time ESG Metrics</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
            <p className="text-gray-600">Get started with common tasks</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => navigate(action.path)}
              className={`p-6 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 text-left group ${
                action.highlight ? 'ring-2 ring-blue-500 ring-opacity-20' : ''
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 bg-${action.color}-100 rounded-lg flex items-center justify-center group-hover:bg-${action.color}-200 transition-colors`}>
                  <i className={`${action.icon} text-${action.color}-600 text-lg`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {action.title}
                    {action.highlight && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        Recommended
                      </span>
                    )}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                    {action.description}
                  </p>
                </div>
                <i className="fas fa-arrow-right text-gray-400 group-hover:text-blue-500 transition-colors"></i>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Platform Features</h2>
          <p className="text-gray-600 mt-2">Everything you need for comprehensive ESG management</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="text-center p-6 bg-white rounded-xl border border-gray-200">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className={`${feature.icon} text-2xl text-blue-600`}></i>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Getting Started Section */}
      <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Getting Started</h2>
            <p className="text-gray-600 mb-6">
              New to the platform? Follow these steps to set up your ESG tracking system.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Complete Profile</h4>
                  <p className="text-sm text-gray-600">Set up your company information</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Configure Frameworks</h4>
                  <p className="text-sm text-gray-600">Select relevant ESG standards</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Start Collecting Data</h4>
                  <p className="text-sm text-gray-600">Begin tracking your metrics</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block ml-8">
            <button
              onClick={() => navigate('/onboard')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg font-medium transition-all duration-200"
            >
              <i className="fas fa-rocket mr-2"></i>
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;