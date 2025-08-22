import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Onboard = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    emirate: '',
    primarySector: '',
    activities: [],
    customActivity: ''
  });
  const [loading, setLoading] = useState(true);
  const companyId = 1; // Should come from context or authentication

  // Fetch existing company data on component mount
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        console.log('Fetching company data for ID:', companyId);
        
        // Try to get data from localStorage first
        const savedData = localStorage.getItem(`company_${companyId}`);
        if (savedData) {
          console.log('Found data in localStorage:', savedData);
          const data = JSON.parse(savedData);
          setFormData({
            companyName: data.companyName || '',
            emirate: data.emirate || '',
            primarySector: data.primarySector || '',
            activities: data.activities || [],
            customActivity: ''
          });
          setLoading(false);
          return;
        }

        // Try the API call
        const response = await fetch(`http://localhost:8000/api/companies/${companyId}/`);
        console.log('API Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Loaded company data from API:', data);
          setFormData({
            companyName: data.name || '',
            emirate: data.emirate || '',
            primarySector: data.primary_sector || '',
            activities: data.activities || [],
            customActivity: ''
          });
        } else {
          console.log('Company not found or API error, using defaults');
          // If company doesn't exist, use default values
          setFormData({
            companyName: 'Emirates Hotels Group',
            emirate: 'Dubai',
            primarySector: 'Hospitality & Tourism',
            activities: ['Hotel Operations', 'Food & Beverage', 'Event Management'],
            customActivity: ''
          });
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
        // Use default values on error
        setFormData({
          companyName: 'Emirates Hotels Group',
          emirate: 'Dubai',
          primarySector: 'Hospitality & Tourism',
          activities: ['Hotel Operations', 'Food & Beverage', 'Event Management'],
          customActivity: ''
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [companyId]);

  // Comprehensive hospitality activity icon mapping
  const getActivityIcon = (activityName) => {
    const activity = activityName.toLowerCase();
    
    // Accommodation & Lodging
    if (activity.includes('hotel') || activity.includes('accommodation') || activity.includes('lodging') || activity.includes('room')) {
      return { icon: 'fas fa-bed', color: 'blue' };
    }
    if (activity.includes('resort') || activity.includes('villa') || activity.includes('suite')) {
      return { icon: 'fas fa-hotel', color: 'indigo' };
    }
    if (activity.includes('hostel') || activity.includes('budget') || activity.includes('backpack')) {
      return { icon: 'fas fa-building', color: 'gray' };
    }
    
    // Food & Beverage
    if (activity.includes('restaurant') || activity.includes('dining') || activity.includes('food') || activity.includes('kitchen')) {
      return { icon: 'fas fa-utensils', color: 'green' };
    }
    if (activity.includes('bar') || activity.includes('lounge') || activity.includes('pub') || activity.includes('beverage')) {
      return { icon: 'fas fa-cocktail', color: 'amber' };
    }
    if (activity.includes('coffee') || activity.includes('cafe') || activity.includes('espresso')) {
      return { icon: 'fas fa-coffee', color: 'yellow' };
    }
    if (activity.includes('bakery') || activity.includes('pastry') || activity.includes('dessert')) {
      return { icon: 'fas fa-birthday-cake', color: 'pink' };
    }
    if (activity.includes('catering') || activity.includes('banquet') || activity.includes('buffet')) {
      return { icon: 'fas fa-concierge-bell', color: 'emerald' };
    }
    
    // Wellness & Recreation
    if (activity.includes('spa') || activity.includes('massage') || activity.includes('wellness') || activity.includes('beauty')) {
      return { icon: 'fas fa-spa', color: 'orange' };
    }
    if (activity.includes('gym') || activity.includes('fitness') || activity.includes('workout')) {
      return { icon: 'fas fa-dumbbell', color: 'red' };
    }
    if (activity.includes('pool') || activity.includes('swimming') || activity.includes('aquatic')) {
      return { icon: 'fas fa-swimmer', color: 'cyan' };
    }
    if (activity.includes('sauna') || activity.includes('steam') || activity.includes('jacuzzi')) {
      return { icon: 'fas fa-hot-tub', color: 'orange' };
    }
    
    // Entertainment & Events
    if (activity.includes('event') || activity.includes('conference') || activity.includes('meeting')) {
      return { icon: 'fas fa-calendar-alt', color: 'purple' };
    }
    if (activity.includes('wedding') || activity.includes('celebration') || activity.includes('ceremony')) {
      return { icon: 'fas fa-heart', color: 'rose' };
    }
    if (activity.includes('show') || activity.includes('entertainment') || activity.includes('performance')) {
      return { icon: 'fas fa-theater-masks', color: 'violet' };
    }
    if (activity.includes('casino') || activity.includes('gaming') || activity.includes('slot')) {
      return { icon: 'fas fa-dice', color: 'red' };
    }
    if (activity.includes('nightclub') || activity.includes('disco') || activity.includes('dance')) {
      return { icon: 'fas fa-music', color: 'purple' };
    }
    
    // Retail & Shopping
    if (activity.includes('retail') || activity.includes('shop') || activity.includes('store') || activity.includes('boutique')) {
      return { icon: 'fas fa-shopping-bag', color: 'red' };
    }
    if (activity.includes('gift') || activity.includes('souvenir') || activity.includes('merchandise')) {
      return { icon: 'fas fa-gift', color: 'green' };
    }
    if (activity.includes('market') || activity.includes('bazaar') || activity.includes('vendor')) {
      return { icon: 'fas fa-store', color: 'orange' };
    }
    
    // Sports & Activities
    if (activity.includes('golf') || activity.includes('course')) {
      return { icon: 'fas fa-golf-ball', color: 'green' };
    }
    if (activity.includes('tennis') || activity.includes('court')) {
      return { icon: 'fas fa-table-tennis', color: 'blue' };
    }
    if (activity.includes('ski') || activity.includes('snow') || activity.includes('winter')) {
      return { icon: 'fas fa-skiing', color: 'cyan' };
    }
    if (activity.includes('beach') || activity.includes('seaside') || activity.includes('coastal')) {
      return { icon: 'fas fa-umbrella-beach', color: 'yellow' };
    }
    if (activity.includes('water sports') || activity.includes('diving') || activity.includes('sailing')) {
      return { icon: 'fas fa-anchor', color: 'blue' };
    }
    
    // Business & Services
    if (activity.includes('business') || activity.includes('corporate') || activity.includes('office')) {
      return { icon: 'fas fa-briefcase', color: 'slate' };
    }
    if (activity.includes('concierge') || activity.includes('reception') || activity.includes('guest services')) {
      return { icon: 'fas fa-user-tie', color: 'blue' };
    }
    if (activity.includes('valet') || activity.includes('parking') || activity.includes('transport')) {
      return { icon: 'fas fa-car', color: 'gray' };
    }
    if (activity.includes('laundry') || activity.includes('cleaning') || activity.includes('housekeeping')) {
      return { icon: 'fas fa-tshirt', color: 'blue' };
    }
    
    // Tourism & Travel
    if (activity.includes('tour') || activity.includes('excursion') || activity.includes('sightseeing')) {
      return { icon: 'fas fa-map-marked-alt', color: 'green' };
    }
    if (activity.includes('travel') || activity.includes('booking') || activity.includes('reservation')) {
      return { icon: 'fas fa-plane', color: 'blue' };
    }
    if (activity.includes('cruise') || activity.includes('yacht') || activity.includes('boat')) {
      return { icon: 'fas fa-ship', color: 'blue' };
    }
    
    // Specialized Services
    if (activity.includes('medical') || activity.includes('clinic') || activity.includes('health')) {
      return { icon: 'fas fa-medkit', color: 'red' };
    }
    if (activity.includes('pet') || activity.includes('animal') || activity.includes('dog')) {
      return { icon: 'fas fa-paw', color: 'brown' };
    }
    if (activity.includes('child') || activity.includes('kids') || activity.includes('family')) {
      return { icon: 'fas fa-child', color: 'yellow' };
    }
    
    // Default for unmatched activities
    return { icon: 'fas fa-building-user', color: 'purple' };
  };

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

  const handleContinue = async () => {
    console.log('Saving company data:', formData);
    
    // Always save to localStorage first for immediate persistence
    localStorage.setItem(`company_${companyId}`, JSON.stringify(formData));
    console.log('Saved to localStorage');
    
    // Try to also save to API
    try {
      // Try to create or update the company data
      let response = await fetch(`http://localhost:8000/api/companies/${companyId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.companyName,
          emirate: formData.emirate,
          primary_sector: formData.primarySector,
          activities: formData.activities
        })
      });

      // If PUT fails, try POST to create a new company
      if (!response.ok && response.status === 404) {
        console.log('Company not found, creating new company...');
        response = await fetch(`http://localhost:8000/api/companies/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: companyId,
            name: formData.companyName,
            emirate: formData.emirate,
            primary_sector: formData.primarySector,
            activities: formData.activities
          })
        });
      }

      if (response.ok) {
        const savedData = await response.json();
        console.log('Company data saved to API successfully:', savedData);
      } else {
        console.error('Failed to save company data to API. Status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error saving company data to API:', error);
      console.log('Data still saved locally');
    }
    
    navigate('/rame');
  };

  // Show loading state while fetching data
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Loading company information...</p>
        </div>
      </div>
    );
  }

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
              className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm font-medium"
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
                    ? 'border-2 border-green-200 bg-green-50' 
                    : 'border border-gray-200 bg-white hover:border-green-200 hover:bg-green-50'
                }`}
                onClick={() => handleActivityToggle(activity.name)}
              >
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={() => {}}
                    className="w-5 h-5 text-green-600 rounded"
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
            const activityIcon = getActivityIcon(customActivity);
            return (
              <div 
                key={`custom-${index}`}
                className="activity-card rounded-lg p-4 cursor-pointer transition-all border-2 border-green-200 bg-green-50"
                onClick={() => handleActivityToggle(customActivity)}
              >
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={true} 
                    onChange={() => {}}
                    className="w-5 h-5 text-green-600 rounded"
                  />
                  <div className={`w-8 h-8 bg-${activityIcon.color}-100 rounded-lg flex items-center justify-center`}>
                    <i className={`${activityIcon.icon} text-${activityIcon.color}-600`}></i>
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