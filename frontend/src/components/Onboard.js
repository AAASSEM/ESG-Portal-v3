import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Onboard = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: 'Emirates Hotels Group',
    emirate: 'Dubai',
    primarySector: 'Hospitality & Tourism',
    activities: ['Hotel Operations', 'Food & Beverage', 'Event Management'],
    customActivity: ''
  });

  const businessActivities = [
    { id: 'hotel', name: 'Hotel Operations', icon: 'fas fa-bed', color: 'blue' },
    { id: 'food', name: 'Food & Beverage', icon: 'fas fa-utensils', color: 'green' },
    { id: 'spa', name: 'Spa & Wellness', icon: 'fas fa-spa', color: 'orange' },
    { id: 'events', name: 'Event Management', icon: 'fas fa-calendar-alt', color: 'purple' },
    { id: 'retail', name: 'Retail Operations', icon: 'fas fa-shopping-bag', color: 'red' },
    { id: 'recreation', name: 'Recreation Facilities', icon: 'fas fa-swimmer', color: 'teal' }
  ];

  const handleActivityToggle = (activityName) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.includes(activityName)
        ? prev.activities.filter(a => a !== activityName)
        : [...prev.activities, activityName]
    }));
  };

  const handleAddCustomActivity = () => {
    if (formData.customActivity && !formData.activities.includes(formData.customActivity)) {
      setFormData(prev => ({
        ...prev,
        activities: [...prev.activities, prev.customActivity],
        customActivity: ''
      }));
    }
  };

  const handleContinue = () => {
    navigate('/rame');
  };

  return (
    <div className="max-w-6xl mx-auto">

      {/* Company Information Form */}
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-building text-blue-600"></i>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Company Information</h2>
            <p className="text-gray-600">Enter your basic company details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
            <div className="relative">
              <input 
                type="text" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Enter company name" 
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
              />
              <div className="absolute right-3 top-3 text-green-500">
                <i className="fas fa-check-circle"></i>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Emirate *</label>
            <select 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.emirate}
              onChange={(e) => setFormData(prev => ({ ...prev, emirate: e.target.value }))}
            >
              <option>Select Emirate</option>
              <option>Dubai</option>
              <option>Abu Dhabi</option>
              <option>Sharjah</option>
              <option>Ajman</option>
              <option>Umm Al Quwain</option>
              <option>Ras Al Khaimah</option>
              <option>Fujairah</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Sector *</label>
            <select 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.primarySector}
              onChange={(e) => setFormData(prev => ({ ...prev, primarySector: e.target.value }))}
            >
              <option>Select Primary Sector</option>
              <option>Hospitality & Tourism</option>
              <option>Real Estate</option>
              <option>Financial Services</option>
              <option>Manufacturing</option>
              <option>Technology</option>
              <option>Healthcare</option>
              <option>Education</option>
              <option>Retail</option>
            </select>
          </div>
        </div>
      </div>

      {/* Business Activities Selection */}
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-list-check text-purple-600"></i>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Business Activities</h2>
              <p className="text-gray-600">Select all activities your company engages in</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button 
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
              onClick={() => setFormData(prev => ({ ...prev, activities: businessActivities.map(a => a.name) }))}
            >
              <i className="fas fa-check-double mr-2"></i>Select All
            </button>
            <button 
              className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 text-sm font-medium"
              onClick={() => setFormData(prev => ({ ...prev, activities: [] }))}
            >
              <i className="fas fa-times mr-2"></i>Deselect All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {businessActivities.map((activity) => {
            const isSelected = formData.activities.includes(activity.name);
            return (
              <div 
                key={activity.id}
                className={`activity-card rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-2 border-blue-200 bg-blue-50' 
                    : 'border border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50'
                }`}
                onClick={() => handleActivityToggle(activity.name)}
              >
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={() => {}}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <div className={`w-8 h-8 bg-${activity.color}-100 rounded-lg flex items-center justify-center`}>
                    <i className={`${activity.icon} text-${activity.color}-600`}></i>
                  </div>
                  <span className="font-medium text-gray-900">{activity.name}</span>
                </div>
              </div>
            );
          })}
          
          {/* Custom Activities */}
          {formData.activities.filter(activity => !businessActivities.some(ba => ba.name === activity)).map((customActivity, index) => {
            return (
              <div 
                key={`custom-${index}`}
                className="activity-card rounded-lg p-4 cursor-pointer transition-all border-2 border-blue-200 bg-blue-50"
                onClick={() => handleActivityToggle(customActivity)}
              >
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={true} 
                    onChange={() => {}}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-plus text-purple-600"></i>
                  </div>
                  <span className="font-medium text-gray-900">{customActivity}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Activity Addition */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Custom Activity</h3>
          <div className="flex space-x-3">
            <input 
              type="text" 
              placeholder="Enter custom business activity" 
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.customActivity}
              onChange={(e) => setFormData(prev => ({ ...prev, customActivity: e.target.value }))}
            />
            <button 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              onClick={handleAddCustomActivity}
            >
              <i className="fas fa-plus mr-2"></i>Add Activity
            </button>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            <i className="fas fa-info-circle mr-2"></i>
            Progress will be automatically saved
          </div>
        </div>
        <div className="flex space-x-4">
          <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
            <i className="fas fa-save mr-2"></i>Save Draft
          </button>
          <button 
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg font-medium"
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

export default Onboard;