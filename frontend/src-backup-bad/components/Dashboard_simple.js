import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const companyId = 1;

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/dashboard/?company_id=${companyId}`);
        if (response.ok) {
          const data = await response.json();
          setDashboardData(data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyId]);

  // Quick action handlers
  const handleQuickAction = (action) => {
    switch (action) {
      case 'upload-data':
        navigate('/data');
        break;
      case 'generate-report':
        // Export functionality
        const csvData = [
          ['Metric', 'Value'],
          ['Total Frameworks', dashboardData?.total_frameworks || '2'],
          ['Active Meters', dashboardData?.active_meters || '7'],
          ['Data Elements', dashboardData?.total_data_elements || '9'],
          ['Completion Rate', `${Math.round(dashboardData?.data_completeness_percentage || 45)}%`]
        ];
        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `esg-dashboard-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        break;
      case 'configure-meters':
        navigate('/meter');
        break;
      case 'profiling':
        navigate('/rame');
        break;
      case 'checklist':
        navigate('/list');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Main
            </button>
            <nav className="text-sm text-gray-500">
              <span>Dashboard</span> <span className="mx-2">/</span> 
              <span className="text-gray-900 font-medium">ESG Performance Overview</span>
            </nav>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-sm">
              <span className="text-gray-500">Company:</span>
              <span className="font-medium text-gray-900 ml-1">Emirates Hotels Group</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Module Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">ESG Performance Dashboard</h1>
                <p className="text-purple-100 text-lg">Monitor your sustainability performance and compliance status</p>
                <div className="flex items-center space-x-4 mt-4">
                  <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">Module 6 of 6</span>
                  <span className="text-sm">Reporting Period: January 2024</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={() => handleQuickAction('generate-report')}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  <i className="fas fa-download mr-2"></i>Export Report
                </button>
                <button className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg text-sm font-medium transition-all">
                  <i className="fas fa-share mr-2"></i>Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-list-check text-blue-600 text-xl"></i>
              </div>
              <span className="text-sm text-gray-500">Active</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {dashboardData?.total_frameworks || '2'}
            </h3>
            <p className="text-gray-600 text-sm">ESG Frameworks</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-database text-green-600 text-xl"></i>
              </div>
              <span className="text-sm text-gray-500">Tracked</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {dashboardData?.total_data_elements || '9'}
            </h3>
            <p className="text-gray-600 text-sm">Data Elements</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-gauge text-purple-600 text-xl"></i>
              </div>
              <span className="text-sm text-gray-500">Active</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {dashboardData?.active_meters || '7'}
            </h3>
            <p className="text-gray-600 text-sm">Smart Meters</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-chart-line text-orange-600 text-xl"></i>
              </div>
              <span className="text-sm text-green-600 font-medium">+5.2%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {Math.round(dashboardData?.data_completeness_percentage || 45)}%
            </h3>
            <p className="text-gray-600 text-sm">Completion Rate</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Meter Data Analytics</h3>
              <select className="text-sm border border-gray-300 rounded-lg px-3 py-1">
                <option>Last 12 Months</option>
                <option>Last 6 Months</option>
                <option>Last 3 Months</option>
              </select>
            </div>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Chart visualization will appear here</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">GHG Emissions Breakdown</h3>
              <div className="flex space-x-2">
                <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Scope 1</button>
                <button className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded">Scope 2</button>
                <button className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded">Scope 3</button>
              </div>
            </div>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Emissions chart will appear here</p>
            </div>
          </div>
        </div>

        {/* Framework Compliance & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Framework Compliance Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-leaf text-green-600"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">GRI Standards</h4>
                    <p className="text-sm text-gray-500">Global Reporting Initiative</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">95%</div>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '95%'}}></div>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/rame')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-globe text-blue-600"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">UAE ESG Guidelines</h4>
                    <p className="text-sm text-gray-500">UAE Requirements</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">88%</div>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width: '88%'}}></div>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/rame')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => handleQuickAction('upload-data')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:shadow-lg transition-all"
              >
                <i className="fas fa-upload mr-2"></i>Upload Data
              </button>
              <button 
                onClick={() => handleQuickAction('configure-meters')}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-all"
              >
                <i className="fas fa-cog mr-2"></i>Configure Meters
              </button>
              <button 
                onClick={() => handleQuickAction('profiling')}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-all"
              >
                <i className="fas fa-user-check mr-2"></i>Company Profiling
              </button>
              <button 
                onClick={() => handleQuickAction('checklist')}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-all"
              >
                <i className="fas fa-list mr-2"></i>ESG Checklist
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;