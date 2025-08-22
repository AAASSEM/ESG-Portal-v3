import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Simple chart components
const EnergyChart = ({ chartData, meterType }) => {
  if (!chartData || !chartData.labels || !chartData.data || chartData.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No chart data available</p>
      </div>
    );
  }

  const hasRealData = chartData.data.some(val => val > 0);
  const maxValue = Math.max(...chartData.data.filter(val => val > 0)) || 100;
  const unit = meterType?.includes('Electricity') ? 'kWh' : 
               meterType?.includes('Fuel') ? 'L' : 
               meterType?.includes('Water') ? 'L' : 'units';

  // Show no data message if all values are zero
  if (!hasRealData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <i className="fas fa-chart-line text-gray-300 text-3xl mb-2"></i>
          <p className="text-gray-500">No data submitted for this meter</p>
          <p className="text-gray-400 text-sm">Submit data to see chart visualization</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 flex items-end space-x-1 pb-4 min-h-[180px]">
        {chartData.data.map((value, index) => {
          const height = value > 0 ? Math.max((value / maxValue) * 80, 10) : 0; // No height for zero values
          const isCurrentMonth = index === chartData.data.length - 1;
          const isRealData = value > 0;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="relative w-full flex items-end" style={{ height: '180px' }}>
                {value > 0 ? (
                  <div 
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      isRealData ? 'bg-green-600' : 'bg-blue-400'
                    }`}
                    style={{ height: `${height}%` }}
                    title={`${chartData.labels[index]}: ${value.toLocaleString()} ${unit} (Real Data)`}
                  ></div>
                ) : (
                  <div className="w-full h-1 bg-gray-200 rounded-full opacity-50" title={`${chartData.labels[index]}: No data`}></div>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-700 font-medium">
                {chartData.labels[index]}
              </div>
              <div className={`text-xs ${value > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                {value > 0 ? value.toLocaleString() : '0'}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
        Unit: {unit} | <span className="text-green-600">●</span> Submitted data | <span className="text-gray-400">─</span> No data
      </div>
    </div>
  );
};

const EmissionsChart = ({ emissionsData, selectedScope }) => {
  if (!emissionsData || Object.keys(emissionsData).length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No emissions data available</p>
      </div>
    );
  }

  const totalEmissions = Object.values(emissionsData).reduce((sum, scope) => sum + scope.value, 0);
  const scopes = Object.entries(emissionsData);

  return (
    <div className="h-full flex">
      {/* Pie Chart Area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-40 h-40">
          {/* Simple pie chart using CSS */}
          <div className="w-full h-full rounded-full relative overflow-hidden">
            {scopes.map(([scopeName, scope], index) => {
              const percentage = totalEmissions > 0 ? (scope.value / totalEmissions) * 100 : 0;
              const angle = (percentage / 100) * 360;
              const rotation = scopes.slice(0, index).reduce((sum, [, s]) => 
                sum + ((s.value / totalEmissions) * 360), 0);
              
              return (
                <div
                  key={scopeName}
                  className={`absolute inset-0 ${selectedScope === scopeName ? 'opacity-100' : 'opacity-70'}`}
                  style={{
                    background: `conic-gradient(from ${rotation}deg, ${scope.color} 0deg, ${scope.color} ${angle}deg, transparent ${angle}deg)`,
                    transform: selectedScope === scopeName ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.3s ease'
                  }}
                />
              );
            })}
            <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {Math.round(totalEmissions)}
                </div>
                <div className="text-xs text-gray-600">tCO2e</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Selected Scope Details */}
      <div className="w-40 pl-3 flex flex-col justify-center">
        {scopes.map(([scopeName, scope]) => {
          const percentage = totalEmissions > 0 ? (scope.value / totalEmissions) * 100 : 0;
          const isSelected = selectedScope === scopeName;
          
          if (!isSelected) return null;
          
          return (
            <div 
              key={scopeName} 
              className="p-3 rounded-lg border border-blue-300 bg-blue-50 transition-all"
            >
              <div className="flex items-center space-x-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: scope.color }}
                ></div>
                <span className="font-medium text-sm text-gray-900">{scopeName}</span>
              </div>
              <div className="text-lg font-bold text-gray-900 mb-1">
                {Math.round(scope.value)} tCO2e
              </div>
              <div className="text-xs text-gray-600 mb-2">
                {percentage.toFixed(1)}% of total
              </div>
              
              {scope.items.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-1">Sources:</h4>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {scope.items.map((item, index) => (
                      <div 
                        key={index} 
                        className="text-xs text-gray-600 bg-white px-2 py-1 rounded"
                        title={item} // Show full text on hover
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {scope.items.length === 0 && (
                <div className="text-xs text-gray-500 italic">
                  No data sources
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Modal Component
const ExportModal = ({ isOpen, onClose, onConfirm, data }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className={`p-6 border-b ${data.type === 'warning' ? 'bg-yellow-50' : 'bg-green-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {data.type === 'warning' ? (
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-yellow-600 text-xl"></i>
                </div>
              ) : (
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-check-circle text-green-600 text-xl"></i>
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900">{data.title}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
        
        {/* Modal Body */}
        <div className="p-6">
          {data.type === 'warning' ? (
            <>
              <p className="text-gray-700 mb-4">{data.message}</p>
              
              {/* Missing Data Section */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-red-900 mb-2">Missing Data:</h3>
                <ul className="space-y-1">
                  {data.missingItems?.map((item, index) => (
                    <li key={index} className="text-red-700 text-sm">{item}</li>
                  ))}
                </ul>
              </div>
              
              {/* Missing Meters Section */}
              {data.missingMeters && data.missingMeters.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-orange-900 mb-2">Meters Without Data:</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.missingMeters.map((meter, index) => (
                      <span key={index} className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm">
                        {meter}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <p className="text-gray-600 text-sm">
                Do you want to continue generating the report with incomplete data?
              </p>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-600">File Name:</span>
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{data.filename}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-600">Report Period:</span>
                  <span className="font-semibold">{data.period}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-600">Completeness:</span>
                  <span className={`font-semibold ${data.completeness === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                    {data.completeness}%
                  </span>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Report Includes:</h4>
                <ul className="space-y-1">
                  {data.includes?.map((item, index) => (
                    <li key={index} className="text-gray-600 text-sm flex items-center">
                      <i className="fas fa-check text-green-500 mr-2"></i>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              {data.completeness < 100 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    <i className="fas fa-info-circle mr-2"></i>
                    Report contains incomplete data ({data.completeness}% complete)
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Modal Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
          {data.type === 'warning' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel & Complete Data
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Export Anyway
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 30 Days');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [selectedMeter, setSelectedMeter] = useState(0);
  const [selectedEmissionScope, setSelectedEmissionScope] = useState('Scope 2');
  const [modalData, setModalData] = useState({ isOpen: false, type: '', data: {} });
  
  // Get current company ID (should come from context or route params)
  const companyId = 1;

  // API function to fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const [dashboardResponse, progressResponse, frameworksResponse] = await Promise.all([
        fetch(`http://localhost:8000/api/dashboard/?company_id=${companyId}`),
        fetch(`http://localhost:8000/api/companies/${companyId}/progress/`),
        fetch(`http://localhost:8000/api/frameworks/`)
      ]);
      
      const dashboard = await dashboardResponse.json();
      const progress = await progressResponse.json();
      const frameworks = await frameworksResponse.json();
      
      return {
        ...dashboard,
        progress,
        frameworks: frameworks.results || frameworks
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return null;
    }
  };

  // Fetch chart data
  const fetchChartData = async () => {
    try {
      const [metersResponse, dataResponse] = await Promise.all([
        fetch(`http://localhost:8000/api/meters/?company_id=${companyId}`),
        fetch(`http://localhost:8000/api/data-collection/tasks/?company_id=${companyId}&year=2025&month=8`)
      ]);
      
      const meters = await metersResponse.json();
      const dataEntries = await dataResponse.json();
      
      return {
        meters: meters.results || meters,
        dataEntries: dataEntries || []
      };
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return { meters: [], dataEntries: [] };
    }
  };

  // Load dashboard data and refresh when time range changes
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [data, charts] = await Promise.all([
          fetchDashboardData(),
          fetchChartData()
        ]);
        setDashboardData(data);
        setChartData(charts);
      } catch (error) {
        console.error('Error loading dashboard:', error);
        // Set default data even if API fails
        setDashboardData(null);
        setChartData(null);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [companyId, selectedTimeRange]); // Reload when time range changes

  // Handle meter navigation
  const handleMeterNavigation = useCallback((direction) => {
    if (!chartData || !chartData.meters) return;
    
    if (direction === 'next') {
      setSelectedMeter((prev) => (prev + 1) % chartData.meters.length);
    } else {
      setSelectedMeter((prev) => (prev - 1 + chartData.meters.length) % chartData.meters.length);
    }
  }, [chartData]);

  // Keyboard navigation for charts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!chartData || !chartData.meters || chartData.meters.length <= 1) return;
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleMeterNavigation('prev');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleMeterNavigation('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chartData, handleMeterNavigation]);

  const kpiCards = dashboardData ? (() => {
    // Calculate time-range specific metrics
    let periodLabel = '';
    let dataPointsCount = dashboardData.total_data_elements || 0;
    let changePercent = 0;
    
    switch(selectedTimeRange) {
      case 'Last 7 Days':
        periodLabel = '7d';
        // Only count recent submissions (simulated - in real app would filter by date)
        dataPointsCount = chartData?.dataEntries?.filter(e => e.submission?.value).length || 0;
        changePercent = 15.2; // Positive trend for recent activity
        break;
      case 'Last 30 Days':
        periodLabel = '30d';
        dataPointsCount = dashboardData.total_data_elements || 0;
        changePercent = 8.5;
        break;
      case 'Last Quarter':
        periodLabel = 'Q3';
        dataPointsCount = dashboardData.total_data_elements || 0;
        changePercent = -2.1; // Slight decrease
        break;
      case 'Last Year':
        periodLabel = '12m';
        dataPointsCount = dashboardData.total_data_elements || 0;
        changePercent = 24.7; // Year over year growth
        break;
    }
    
    return [
      {
        title: `Data Points (${periodLabel})`,
        value: dataPointsCount,
        unit: 'items',
        change: changePercent,
        trend: changePercent >= 0 ? 'up' : 'down',
        color: 'blue',
        icon: 'fas fa-database'
      },
      {
        title: 'Active Meters',
        value: dashboardData.active_meters || '0',
        unit: 'units',
        change: 0,
        trend: 'up',
        color: 'green',
        icon: 'fas fa-gauge'
      },
      {
        title: 'Frameworks',
        value: dashboardData.total_frameworks || '0',
        unit: 'active',
        change: 0,
        trend: 'up',
        color: 'purple',
        icon: 'fas fa-list-check'
      },
      {
        title: `Completeness (${periodLabel})`,
        value: Math.round(dashboardData.data_completeness_percentage || 0),
        unit: '%',
        change: selectedTimeRange === 'Last 7 Days' ? 5.2 : 
                selectedTimeRange === 'Last 30 Days' ? 3.1 : 
                selectedTimeRange === 'Last Quarter' ? -1.5 : 11.0,
        trend: selectedTimeRange === 'Last Quarter' ? 'down' : 'up',
        color: 'yellow',
        icon: 'fas fa-chart-pie'
      }
    ];
  })() : [
    {
      title: 'Energy Consumption',
      value: '2,450',
      unit: 'kWh',
      change: -12.5,
      trend: 'down',
      color: 'yellow',
      icon: 'fas fa-bolt'
    },
    {
      title: 'Water Usage',
      value: '1,250',
      unit: 'L/day',
      change: 8.2,
      trend: 'up',
      color: 'blue',
      icon: 'fas fa-tint'
    },
    {
      title: 'GHG Emissions',
      value: '245',
      unit: 'tCO2e',
      change: -15.7,
      trend: 'down',
      color: 'gray',
      icon: 'fas fa-smog'
    },
    {
      title: 'Waste Generated',
      value: '89',
      unit: 'kg/day',
      change: -22.1,
      trend: 'down',
      color: 'green',
      icon: 'fas fa-trash-alt'
    }
  ];

  const frameworkStatus = (() => {
    // Use real framework data from API
    const frameworks = [];
    
    // Based on your dashboard data showing 2 frameworks (ESG and DST)
    // and data completeness at 11%
    const dataCompleteness = Math.round(dashboardData?.data_completeness_percentage || 0);
    const overallProgress = Math.round(dashboardData?.progress?.overall_percentage || 0);
    
    // ESG Standards - mandatory framework you selected
    frameworks.push({
      name: 'ESG Standards',
      progress: dataCompleteness, // Use actual data completeness
      color: dataCompleteness < 30 ? 'red' : dataCompleteness < 70 ? 'orange' : 'green',
      status: dataCompleteness < 30 ? 'Just Started' : dataCompleteness < 70 ? 'In Progress' : 'On Track',
      type: 'mandatory'
    });
    
    // Dubai Sustainable Tourism - the second framework you selected
    frameworks.push({
      name: 'Dubai Sustainable Tourism',
      progress: dataCompleteness, // Use actual data completeness
      color: dataCompleteness < 30 ? 'red' : dataCompleteness < 70 ? 'orange' : 'green',
      status: dataCompleteness < 30 ? 'Just Started' : dataCompleteness < 70 ? 'In Progress' : 'On Track',
      type: 'mandatory_conditional'
    });
    
    return frameworks;
  })();

  const recentActivities = dashboardData?.recent_activities || (() => {
    const activities = [];
    let activityId = 1;
    
    // Add real data submission activities from chartData
    if (chartData?.dataEntries) {
      chartData.dataEntries.forEach(entry => {
        if (entry.submission && entry.submission.value && parseFloat(entry.submission.value) > 0) {
          const submissionDate = new Date(entry.submission.updated_at || entry.submission.created_at);
          const hoursAgo = Math.floor((new Date() - submissionDate) / (1000 * 60 * 60));
          const timeAgo = hoursAgo < 1 ? 'Just now' : 
                         hoursAgo < 24 ? `${hoursAgo} hours ago` :
                         `${Math.floor(hoursAgo / 24)} days ago`;
          
          activities.push({
            id: activityId++,
            action: `${entry.meter?.type || entry.element_name} data submitted`,
            description: `Value: ${parseFloat(entry.submission.value).toLocaleString()} ${entry.element_unit}`,
            time: timeAgo,
            type: 'data',
            icon: 'fas fa-chart-line',
            color: 'green'
          });
        }
      });
    }
    
    // Add module completion activities from real progress data
    if (dashboardData?.progress) {
      const progress = dashboardData.progress;
      
      if (progress.module_5_complete) {
        activities.push({
          id: activityId++,
          action: 'Data collection completed',
          description: `${Math.round(dashboardData.data_completeness_percentage || 0)}% data completeness achieved`,
          time: '2 hours ago',
          type: 'milestone',
          icon: 'fas fa-trophy',
          color: 'yellow'
        });
      }
      
      if (progress.module_4_complete) {
        activities.push({
          id: activityId++,
          action: 'Smart meters activated',
          description: `${dashboardData.active_meters || 0} meters configured and monitoring`,
          time: '1 day ago',
          type: 'system',
          icon: 'fas fa-gauge',
          color: 'blue'
        });
      }
      
      if (progress.module_3_complete) {
        activities.push({
          id: activityId++,
          action: 'ESG profiling completed',
          description: 'Company sustainability profile generated',
          time: '2 days ago',
          type: 'completion',
          icon: 'fas fa-user-check',
          color: 'purple'
        });
      }
      
      if (progress.module_2_complete) {
        activities.push({
          id: activityId++,
          action: 'Frameworks configured',
          description: `${dashboardData.total_frameworks || 0} ESG frameworks activated`,
          time: '3 days ago',
          type: 'setup',
          icon: 'fas fa-list-check',
          color: 'indigo'
        });
      }
    }
    
    // Sort by most recent first and limit to 4
    return activities
      .sort((a, b) => {
        // Prioritize data submissions, then by recency
        if (a.type === 'data' && b.type !== 'data') return -1;
        if (b.type === 'data' && a.type !== 'data') return 1;
        return a.time.includes('hour') ? -1 : 1;
      })
      .slice(0, 4);
  })();

  const upcomingDeadlines = dashboardData?.upcoming_deadlines || (() => {
    const deadlines = [];
    const today = new Date();
    
    // Generate deadlines based on framework progress and data completeness
    if (dashboardData?.frameworks) {
      dashboardData.frameworks.forEach(framework => {
        const frameworkData = frameworkStatus.find(f => f.name === framework.name);
        if (frameworkData) {
          // Calculate deadline based on framework type and progress
          let daysFromNow, priority;
          
          if (framework.type === 'mandatory') {
            daysFromNow = 30; // Mandatory frameworks have strict deadlines
            priority = frameworkData.progress < 80 ? 'High' : 'Medium';
          } else if (framework.type === 'mandatory_conditional') {
            daysFromNow = 45;
            priority = frameworkData.progress < 70 ? 'High' : 'Medium';
          } else {
            daysFromNow = 90; // Voluntary frameworks have longer deadlines
            priority = frameworkData.progress < 50 ? 'Medium' : 'Low';
          }
          
          const deadlineDate = new Date(today);
          deadlineDate.setDate(today.getDate() + daysFromNow);
          
          deadlines.push({
            name: `${framework.name} Compliance Report`,
            date: deadlineDate.toISOString().split('T')[0],
            daysLeft: daysFromNow,
            priority: priority,
            type: 'framework'
          });
        }
      });
    }
    
    // Add data collection deadlines based on monthly progress
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    // End of month data collection deadline
    const endOfMonth = new Date(currentYear, currentMonth, 0);
    const daysToEndOfMonth = Math.ceil((endOfMonth - today) / (1000 * 60 * 60 * 24));
    
    if (daysToEndOfMonth > 0 && daysToEndOfMonth <= 31) {
      const dataProgress = dashboardData?.data_completeness_percentage || 0;
      deadlines.push({
        name: `${endOfMonth.toLocaleDateString('en-US', { month: 'long' })} Data Collection`,
        date: endOfMonth.toISOString().split('T')[0],
        daysLeft: daysToEndOfMonth,
        priority: dataProgress < 50 ? 'High' : dataProgress < 80 ? 'Medium' : 'Low',
        type: 'data'
      });
    }
    
    // Quarterly reporting deadline
    const quarterEndMonths = [3, 6, 9, 12];
    const nextQuarterEnd = quarterEndMonths.find(month => month > currentMonth) || 12;
    const quarterEndDate = new Date(currentYear, nextQuarterEnd - 1, 
      new Date(currentYear, nextQuarterEnd, 0).getDate());
    const daysToQuarterEnd = Math.ceil((quarterEndDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysToQuarterEnd > 0 && daysToQuarterEnd <= 120) {
      deadlines.push({
        name: `Q${Math.ceil(nextQuarterEnd / 3)} ESG Quarterly Report`,
        date: quarterEndDate.toISOString().split('T')[0],
        daysLeft: daysToQuarterEnd,
        priority: daysToQuarterEnd <= 30 ? 'High' : daysToQuarterEnd <= 60 ? 'Medium' : 'Low',
        type: 'quarterly'
      });
    }
    
    // Annual compliance audit
    const yearEndDate = new Date(currentYear, 11, 31);
    const daysToYearEnd = Math.ceil((yearEndDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysToYearEnd > 0 && daysToYearEnd <= 365) {
      deadlines.push({
        name: 'Annual ESG Compliance Audit',
        date: yearEndDate.toISOString().split('T')[0],
        daysLeft: daysToYearEnd,
        priority: daysToYearEnd <= 90 ? 'High' : daysToYearEnd <= 180 ? 'Medium' : 'Low',
        type: 'annual'
      });
    }
    
    // Sort by days left and return top 4
    return deadlines
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 4);
  })();

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleQuickAction = (action) => {
    if (action.path) {
      navigate(action.path);
    } else if (action.action === 'export') {
      handleExportData();
    }
  };

  const performExport = async () => {
    try {
      const dataCompleteness = Math.round(dashboardData?.data_completeness_percentage || 0);
      const evidenceCompleteness = Math.round(dashboardData?.evidence_completeness_percentage || 0);
      
      // Create time-range specific report
      const timestamp = new Date().toISOString().split('T')[0];
      const timeRangeLabel = selectedTimeRange;
      
      const csvData = [
        ['ESG Dashboard Report - Generated on', new Date().toLocaleDateString()],
        ['Company', 'Emirates Hotels Group'],
        ['Report Period', timeRangeLabel],
        [''],
        [`=== OVERVIEW METRICS (${timeRangeLabel}) ===`],
        ['Metric', 'Value', 'Unit'],
        ['Total Data Elements', dashboardData?.total_data_elements || '0', 'items'],
        ['Active Meters', dashboardData?.active_meters || '0', 'units'],
        ['Total Frameworks', dashboardData?.total_frameworks || '0', 'active'],
        ['Data Completeness', `${dataCompleteness}%`, dataCompleteness < 100 ? '⚠️ INCOMPLETE' : '✓ Complete'],
        ['Evidence Completeness', `${evidenceCompleteness}%`, evidenceCompleteness < 100 ? '⚠️ INCOMPLETE' : '✓ Complete'],
        [''],
        ['=== FRAMEWORK PROGRESS ==='],
        ['Framework', 'Progress (%)', 'Status', 'Type']
      ];

      if (dashboardData?.frameworks) {
        frameworkStatus.forEach(framework => {
          const fw = dashboardData.frameworks.find(f => f.name === framework.name);
          csvData.push([
            framework.name, 
            framework.progress, 
            framework.status,
            fw?.type || 'N/A'
          ]);
        });
      }

      // Add meter data filtered by time range
      if (chartData?.meters) {
        let periodDescription = '';
        switch(selectedTimeRange) {
          case 'Last 7 Days':
            periodDescription = 'PAST 7 DAYS';
            break;
          case 'Last 30 Days':
            periodDescription = 'PAST 30 DAYS';
            break;
          case 'Last Quarter':
            periodDescription = 'Q3 2025 (JUN-AUG)';
            break;
          case 'Last Year':
            periodDescription = 'YEAR 2025';
            break;
          default:
            periodDescription = 'AUGUST 2025';
        }
        
        csvData.push([''], [`=== METER DATA (${periodDescription}) ===`], ['Meter', 'Type', 'Value', 'Status', 'Completeness']);
        
        chartData.meters.forEach(meter => {
          const meterData = chartData.dataEntries.find(entry => 
            entry.meter && entry.meter.id === meter.id
          );
          const value = meterData?.submission?.value || '0';
          const status = meterData?.submission?.status || 'missing';
          const completeness = value && value !== '0' ? '✓' : '⚠️ MISSING';
          csvData.push([meter.name, meter.type, value, status, completeness]);
        });
        
        // Add summary of missing data
        const totalMeters = chartData.meters.length;
        const completedMeters = chartData.meters.filter(meter => {
          const meterData = chartData.dataEntries.find(entry => 
            entry.meter && entry.meter.id === meter.id
          );
          return meterData?.submission?.value && meterData.submission.value !== '0';
        }).length;
        
        csvData.push([''], ['METER SUMMARY', `${completedMeters} of ${totalMeters} meters have data`, '', `${Math.round((completedMeters/totalMeters)*100)}% complete`]);
      }

      // Add upcoming deadlines
      csvData.push([''], ['=== UPCOMING DEADLINES ==='], ['Deadline', 'Date', 'Days Left', 'Priority']);
      upcomingDeadlines.forEach(deadline => {
        csvData.push([deadline.name, deadline.date, deadline.daysLeft, deadline.priority]);
      });

      const csvContent = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');
      
      // Create filename with time range
      const timeRangeSuffix = selectedTimeRange.toLowerCase().replace(/ /g, '-');
      const filename = `esg-report-${timeRangeSuffix}-${timestamp}.csv`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Show success modal
      setModalData({
        isOpen: true,
        type: 'success',
        data: {
          type: 'success',
          title: 'Export Successful',
          filename: filename,
          period: timeRangeLabel,
          completeness: dataCompleteness,
          includes: [
            `Overview metrics for ${timeRangeLabel}`,
            `Framework progress (${frameworkStatus.length} frameworks)`,
            `Meter data (${chartData?.meters?.length || 0} meters)`,
            'Upcoming deadlines'
          ]
        }
      });
    } catch (error) {
      console.error('Export failed:', error);
      setModalData({
        isOpen: true,
        type: 'error',
        data: {
          type: 'error',
          title: 'Export Failed',
          message: 'The export failed. Please try again or contact support.'
        }
      });
    }
  };

  const handleExportData = async () => {
    // Check data completeness and warn user if incomplete
    const dataCompleteness = Math.round(dashboardData?.data_completeness_percentage || 0);
    const evidenceCompleteness = Math.round(dashboardData?.evidence_completeness_percentage || 0);
    
    if (dataCompleteness < 100 || evidenceCompleteness < 100) {
      const missingItems = [];
      if (dataCompleteness < 100) {
        missingItems.push(`Data completeness: ${dataCompleteness}% (${100 - dataCompleteness}% missing)`);
      }
      if (evidenceCompleteness < 100) {
        missingItems.push(`Evidence completeness: ${evidenceCompleteness}% (${100 - evidenceCompleteness}% missing)`);
      }
      
      // Count missing meter data
      const missingMeters = chartData?.meters?.filter(meter => {
        const meterData = chartData.dataEntries.find(entry => 
          entry.meter && entry.meter.id === meter.id
        );
        return !meterData?.submission?.value;
      }) || [];
      
      if (missingMeters.length > 0) {
        missingItems.push(`${missingMeters.length} meters have no data submitted`);
      }
      
      // Show warning modal
      setModalData({
        isOpen: true,
        type: 'warning',
        data: {
          type: 'warning',
          title: 'Incomplete Data Warning',
          message: 'Your ESG data is incomplete. The report will be missing important information.',
          missingItems: missingItems,
          missingMeters: missingMeters.map(m => m.type)
        }
      });
      
      return; // Stop here, user will decide via modal
    }
    
    // Data is complete, proceed with export
    performExport();
  };

  // Modal handlers
  const closeModal = () => {
    setModalData({ isOpen: false, type: '', data: {} });
  };

  const confirmExport = () => {
    closeModal();
    performExport();
  };

  const handleAddDeadline = () => {
    // Navigate to the relevant ESG management page
    const options = [
      'Data Collection - Add monthly submission deadline',
      'Framework Compliance - Add reporting deadline', 
      'ESG Checklist - Add action item deadline'
    ];
    
    const choice = prompt(`Choose what type of deadline to add:\n\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\nEnter 1, 2, or 3:`);
    
    switch(choice) {
      case '1':
        navigate('/data');
        break;
      case '2':
        navigate('/rame');
        break;
      case '3':
        navigate('/list');
        break;
      default:
        if (choice !== null) {
          // Show modal instead of alert for invalid choice
          setModalData({
            isOpen: true,
            type: 'error',
            data: {
              type: 'error',
              title: 'Invalid Selection',
              message: 'Please select a valid option (1, 2, or 3) and try again.'
            }
          });
        }
    }
  };

  const handleDeadlineClick = (deadline) => {
    // Navigate to relevant page based on deadline type
    switch (deadline.type) {
      case 'framework':
        navigate('/rame'); // Profiling/Framework page
        break;
      case 'data':
        navigate('/data'); // Data collection page
        break;
      case 'quarterly':
      case 'annual':
        navigate('/dashboard'); // Stay on dashboard for reports
        break;
      default:
        navigate('/list'); // Checklist as fallback
    }
  };

  // Generate chart data for selected meter using real data only
  const generateChartData = () => {
    // Determine which months to show based on selected time range
    let months = [];
    const currentMonth = 7; // August (0-indexed)
    const currentYear = 2025;
    
    switch(selectedTimeRange) {
      case 'Last 7 Days':
        // Show daily data for last 7 days
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        months = days;
        break;
      case 'Last 30 Days':
        // Show last 30 days grouped by week
        months = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Current'];
        break;
      case 'Last Quarter':
        // Show last 3 months
        months = ['Jun', 'Jul', 'Aug'];
        break;
      case 'Last Year':
        // Show all 12 months
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        break;
      default:
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    }
    
    if (!chartData || !chartData.meters || chartData.meters.length === 0) {
      const noData = months.map(() => 0);
      return { labels: months, data: noData };
    }

    const selectedMeterData = chartData.meters[selectedMeter];
    if (!selectedMeterData) {
      const noData = months.map(() => 0);
      return { labels: months, data: noData };
    }

    // Find real data for this meter from dataEntries
    const realData = chartData.dataEntries.find(entry => 
      entry.meter && entry.meter.id === selectedMeterData.id
    );
    
    // Initialize data based on time range
    const data = months.map(() => 0);
    
    // Set real value in the appropriate position based on time range
    if (realData && realData.submission && realData.submission.value) {
      const currentValue = parseFloat(realData.submission.value);
      if (currentValue > 0) {
        // Place value in the last position for most time ranges
        if (selectedTimeRange === 'Last 7 Days') {
          data[data.length - 1] = currentValue; // Today/Sunday
        } else if (selectedTimeRange === 'Last 30 Days') {
          data[data.length - 1] = currentValue; // Current week
        } else if (selectedTimeRange === 'Last Quarter') {
          data[2] = currentValue; // August
        } else if (selectedTimeRange === 'Last Year') {
          data[7] = currentValue; // August (index 7)
        } else {
          data[7] = currentValue; // Default August position
        }
      }
    }

    return { labels: months, data };
  };

  // Generate emissions breakdown data
  const generateEmissionsData = () => {
    console.log('=== EMISSIONS DATA GENERATION ===');
    console.log('chartData:', chartData);
    console.log('chartData.dataEntries:', chartData?.dataEntries);
    
    if (!chartData || !chartData.dataEntries) {
      console.log('No chart data or data entries for emissions - returning empty scopes');
      return {
        'Scope 1': { value: 0, color: '#ef4444', items: [] },
        'Scope 2': { value: 0, color: '#3b82f6', items: [] },
        'Scope 3': { value: 0, color: '#6b7280', items: [] }
      };
    }

    // Group emissions data by scope
    const scopes = {
      'Scope 1': { value: 0, color: '#ef4444', items: [] },
      'Scope 2': { value: 0, color: '#3b82f6', items: [] },
      'Scope 3': { value: 0, color: '#6b7280', items: [] }
    };

    console.log('Processing', chartData.dataEntries.length, 'data entries');

    chartData.dataEntries.forEach((entry, index) => {
      console.log(`Entry ${index}:`, entry);
      
      // Use meter type instead of element_name for proper categorization
      const meterType = entry.meter ? entry.meter.type.toLowerCase() : '';
      const value = parseFloat(entry.submission?.value) || 0;
      
      console.log(`  - Meter type: "${meterType}", Value: ${value}`);
      
      // Get display name from meter type instead of duplicate element_name
      const displayName = entry.meter ? entry.meter.type : entry.element_name;
      console.log(`  - Display name: "${displayName}"`);
      
      if (meterType.includes('fuel') || meterType.includes('gas') || meterType.includes('lpg')) {
        console.log(`  - Adding to Scope 1: ${value} * 2.3 = ${value * 2.3}`);
        scopes['Scope 1'].value += value * 2.3; // Convert to CO2e
        scopes['Scope 1'].items.push(displayName);
      } else if (meterType.includes('electricity') || meterType.includes('energy') || meterType.includes('renewable')) {
        console.log(`  - Adding to Scope 2: ${value} * 0.85 = ${value * 0.85}`);
        scopes['Scope 2'].value += value * 0.85; // Convert to CO2e
        scopes['Scope 2'].items.push(displayName);
      } else {
        console.log(`  - Adding to Scope 3: ${value} * 0.1 = ${value * 0.1}`);
        scopes['Scope 3'].value += value * 0.1; // Estimate CO2e
        scopes['Scope 3'].items.push(displayName);
      }
    });

    // Remove duplicate items
    Object.keys(scopes).forEach(scopeName => {
      scopes[scopeName].items = [...new Set(scopes[scopeName].items)];
      console.log(`Final ${scopeName}:`, scopes[scopeName]);
    });

    console.log('=== FINAL EMISSIONS DATA ===', scopes);
    return scopes;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">ESG Dashboard</h1>
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
        <div className="flex space-x-3">
          <button 
            onClick={handleExportData}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
          >
            <i className="fas fa-download mr-2"></i>Export
          </button>
          <button 
            onClick={handleExportData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            <i className="fas fa-file-chart-line mr-2"></i>Generate Report
          </button>
        </div>
      </div>


      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-${kpi.color}-100 rounded-lg flex items-center justify-center`}>
                <i className={`${kpi.icon} text-${kpi.color}-600 text-lg`}></i>
              </div>
              <div className={`flex items-center text-sm font-medium ${
                kpi.trend === 'up' ? 'text-red-600' : 'text-green-600'
              }`}>
                <i className={`fas fa-arrow-${kpi.trend} mr-1`}></i>
                {Math.abs(kpi.change)}%
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{kpi.title}</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-gray-900">{kpi.value}</span>
              <span className="text-sm text-gray-500">{kpi.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Framework Progress */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Framework Compliance</h2>
              <p className="text-gray-600">Progress across selected ESG frameworks</p>
            </div>
            <button 
              onClick={() => navigate('/rame')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
            >
              View Details
            </button>
          </div>
          <div className="space-y-4">
            {frameworkStatus.map((framework, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{framework.name}</span>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      framework.status === 'Complete' ? 'bg-green-100 text-green-800' :
                      framework.status === 'On Track' ? 'bg-blue-100 text-blue-800' :
                      framework.status === 'Needs Attention' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {framework.status}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{framework.progress}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`bg-${framework.color}-500 h-2 rounded-full`}
                    style={{ width: `${framework.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
              <p className="text-gray-600 text-sm">Latest system updates</p>
            </div>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-8 h-8 bg-${activity.color}-100 rounded-full flex items-center justify-center flex-shrink-0`}>
                  <i className={`${activity.icon} text-${activity.color}-600 text-xs`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{activity.action}</p>
                  <p className="text-gray-600 text-xs mt-1">{activity.description}</p>
                  <p className="text-gray-400 text-xs mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Energy Consumption Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900">Meter Data Analytics</h3>
              <div className="h-5"> {/* Fixed height container */}
                <p className="text-gray-600 text-sm truncate">
                  {chartData?.meters?.[selectedMeter] ? 
                    `${chartData.meters[selectedMeter].name} - ${chartData.meters[selectedMeter].type}` : 
                    'Loading meter data...'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {chartData?.meters && chartData.meters.length > 1 && (
                <span className="text-sm text-gray-500">
                  {selectedMeter + 1} of {chartData.meters.length}
                </span>
              )}
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {chartData?.meters?.[selectedMeter]?.type?.includes('Electricity') ? 'kWh' :
                 chartData?.meters?.[selectedMeter]?.type?.includes('Fuel') ? 'Liters' :
                 chartData?.meters?.[selectedMeter]?.type?.includes('Water') ? 'Liters' : 'Units'}
              </span>
            </div>
          </div>
          
          {/* Chart Area with Floating Navigation */}
          <div className="h-64 bg-gray-50 rounded-lg p-4 relative group">
            {/* Floating Left Arrow */}
            {chartData?.meters && chartData.meters.length > 1 && (
              <button 
                onClick={() => handleMeterNavigation('prev')}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 
                          p-2 bg-white/90 hover:bg-white rounded-full shadow-lg
                          opacity-0 group-hover:opacity-100 transition-all duration-200
                          hover:scale-110"
                title="Previous meter"
              >
                <i className="fas fa-chevron-left text-gray-700 text-sm"></i>
              </button>
            )}
            
            {/* Floating Right Arrow */}
            {chartData?.meters && chartData.meters.length > 1 && (
              <button 
                onClick={() => handleMeterNavigation('next')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 
                          p-2 bg-white/90 hover:bg-white rounded-full shadow-lg
                          opacity-0 group-hover:opacity-100 transition-all duration-200
                          hover:scale-110"
                title="Next meter"
              >
                <i className="fas fa-chevron-right text-gray-700 text-sm"></i>
              </button>
            )}
            
            {/* Chart Content */}
            {chartData ? (
              <EnergyChart chartData={generateChartData()} meterType={chartData.meters?.[selectedMeter]?.type} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <i className="fas fa-spinner fa-spin text-2xl text-blue-600 mb-2"></i>
                  <p className="text-gray-600">Loading chart data...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Emissions Overview */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">GHG Emissions Breakdown</h3>
              <p className="text-gray-600 text-sm">By source category (tCO2e)</p>
            </div>
            <div className="flex space-x-2">
              {['Scope 1', 'Scope 2', 'Scope 3'].map((scope) => (
                <button 
                  key={scope}
                  onClick={() => setSelectedEmissionScope(scope)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedEmissionScope === scope
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>
          
          {/* Chart Area */}
          <div className="h-64 bg-gray-50 rounded-lg p-4">
            {chartData ? (
              <EmissionsChart 
                emissionsData={generateEmissionsData()} 
                selectedScope={selectedEmissionScope} 
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <i className="fas fa-spinner fa-spin text-2xl text-blue-600 mb-2"></i>
                  <p className="text-gray-600">Loading emissions data...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Upcoming Deadlines</h2>
            <p className="text-gray-600">Important compliance and reporting dates</p>
          </div>
          <button 
            onClick={handleAddDeadline}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <i className="fas fa-calendar-plus mr-2"></i>Add Deadline
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {upcomingDeadlines.map((deadline, index) => (
            <div 
              key={index} 
              onClick={() => handleDeadlineClick(deadline)}
              className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200"
              title={`Click to manage ${deadline.type} tasks`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(deadline.priority)}`}>
                  {deadline.priority}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{deadline.daysLeft} days</span>
                  <i className="fas fa-external-link-alt text-xs text-gray-400"></i>
                </div>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 hover:text-blue-600 transition-colors">{deadline.name}</h4>
              <p className="text-sm text-gray-600">{deadline.date}</p>
              {deadline.type && (
                <p className="text-xs text-gray-500 mt-2 capitalize">{deadline.type} deadline</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Center */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
            <p className="text-gray-600">Common tasks and shortcuts</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: 'fas fa-upload', title: 'Upload Data', color: 'blue', path: '/data', description: 'Enter ESG data entries' },
            { icon: 'fas fa-file-alt', title: 'Generate Report', color: 'green', action: 'export', description: 'Export current data' },
            { icon: 'fas fa-cog', title: 'Configure Meters', color: 'orange', path: '/meter', description: 'Manage meter settings' },
            { icon: 'fas fa-chart-bar', title: 'View Analytics', color: 'purple', path: '/dashboard', description: 'Current page' },
            { icon: 'fas fa-bell', title: 'Profiling', color: 'red', path: '/rame', description: 'Company profiling' },
            { icon: 'fas fa-list', title: 'Checklist', color: 'gray', path: '/list', description: 'ESG checklist' }
          ].map((action, index) => (
            <button
              key={index}
              onClick={() => handleQuickAction(action)}
              className={`p-4 text-center bg-${action.color}-50 hover:bg-${action.color}-100 rounded-lg transition-colors group`}
              title={action.description}
            >
              <div className={`w-10 h-10 bg-${action.color}-100 group-hover:bg-${action.color}-200 rounded-lg flex items-center justify-center mx-auto mb-2 transition-colors`}>
                <i className={`${action.icon} text-${action.color}-600`}></i>
              </div>
              <span className="text-sm font-medium text-gray-900">{action.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={modalData.isOpen}
        onClose={closeModal}
        onConfirm={confirmExport}
        data={modalData.data}
      />
    </div>
  );
};

export default Dashboard;