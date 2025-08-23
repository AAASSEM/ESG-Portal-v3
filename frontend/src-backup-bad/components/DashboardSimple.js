import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardSimple = () => {
  const navigate = useNavigate();
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 30 Days');

  // Mock data
  const kpiCards = [
    {
      title: 'Total Data Points',
      value: '9',
      unit: 'items',
      change: 0,
      trend: 'up',
      color: 'blue',
      icon: 'fas fa-database'
    },
    {
      title: 'Active Meters',
      value: '7',
      unit: 'units',
      change: 0,
      trend: 'up',
      color: 'green',
      icon: 'fas fa-gauge'
    },
    {
      title: 'Frameworks',
      value: '2',
      unit: 'active',
      change: 0,
      trend: 'up',
      color: 'purple',
      icon: 'fas fa-chart-line'
    },
    {
      title: 'Data Completeness',
      value: '45',
      unit: '%',
      change: 0,
      trend: 'up',
      color: 'orange',
      icon: 'fas fa-check-circle'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Main
          </button>
          <h1 className="text-2xl font-bold text-gray-900">ESG Dashboard (Simple)</h1>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex space-x-4">
          {['Last 7 Days', 'Last 30 Days', 'Last Quarter', 'Last Year'].map((range) => (
            <button
              key={range}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                selectedTimeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setSelectedTimeRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="ml-2 text-sm text-gray-500">{card.unit}</p>
                </div>
              </div>
              <div className={`w-12 h-12 bg-${card.color}-100 rounded-lg flex items-center justify-center`}>
                <i className={`${card.icon} text-${card.color}-600`}></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Test message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800">This is a simplified version of the dashboard. If you can see this, the routing and basic rendering work.</p>
      </div>
    </div>
  );
};

export default DashboardSimple;