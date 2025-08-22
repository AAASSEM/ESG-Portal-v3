import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Simple chart components
const EnergyChart = ({ chartData, meterType }) => {
  if (!chartData || !chartData.labels || !chartData.data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.data);
  const unit = meterType?.includes('Electricity') ? 'kWh' : 
               meterType?.includes('Fuel') ? 'L' : 
               meterType?.includes('Water') ? 'L' : 'units';

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-end space-x-2 pb-4">
        {chartData.data.map((value, index) => {
          const height = (value / maxValue) * 100;
          const isCurrentMonth = index === chartData.data.length - 1;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="relative flex-1 flex items-end w-full">
                <div 
                  className={`w-full rounded-t transition-all duration-300 ${
                    isCurrentMonth ? 'bg-blue-500' : 'bg-blue-300'
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${chartData.labels[index]}: ${value.toLocaleString()} ${unit}`}
                ></div>
              </div>
              <div className="mt-2 text-xs text-gray-600 font-medium">
                {chartData.labels[index]}
              </div>
              <div className="text-xs text-gray-500">
                {value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-gray-500 text-center pt-2 border-t">
        Unit: {unit} | Current month highlighted in blue
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
      <div className="w-48 pl-4 flex flex-col justify-center">
        {scopes.map(([scopeName, scope]) => {
          const percentage = totalEmissions > 0 ? (scope.value / totalEmissions) * 100 : 0;
          const isSelected = selectedScope === scopeName;
          
          if (!isSelected) return null;
          
          return (
            <div 
              key={scopeName} 
              className="p-4 rounded-lg border border-blue-300 bg-blue-50 transition-all"
            >
              <div className="flex items-center space-x-2 mb-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: scope.color }}
                ></div>
                <span className="font-medium text-base text-gray-900">{scopeName}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {Math.round(scope.value)} tCO2e
              </div>
              <div className="text-sm text-gray-600 mb-3">
                {percentage.toFixed(1)}% of total emissions
              </div>
              
              {scope.items.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-1">Sources:</h4>
                  <div className="space-y-1">
                    {scope.items.map((item, index) => (
                      <div key={index} className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {scope.items.length === 0 && (
                <div className="text-xs text-gray-500 italic">
                  No data sources for this scope
                </div>
              )}
            </div>
          );
        })}
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

  // Load dashboard data
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
  }, [companyId]);

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

  const kpiCards = dashboardData ? [
    {
      title: 'Total Data Points',
      value: dashboardData.total_data_elements || '0',
      unit: 'items',
      change: 0,
      trend: 'up',
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
      title: 'Data Completeness',
      value: Math.round(dashboardData.data_completeness_percentage || 0),
      unit: '%',
      change: 0,
      trend: 'up',
      color: 'yellow',
      icon: 'fas fa-chart-pie'
    }
  ] : [
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

  const frameworkStatus = dashboardData?.frameworks ? dashboardData.frameworks.map(framework => {
    // Calculate progress based on module completion
    const moduleProgress = dashboardData.progress;
    let progress = 0;
    let status = 'Not Started';
    let color = 'red';
    
    if (moduleProgress) {
      progress = Math.round(moduleProgress.overall_percentage || 0);
      
      if (progress >= 90) {
        status = 'Complete';
        color = 'green';
      } else if (progress >= 70) {
        status = 'On Track';
        color = 'blue';
      } else if (progress >= 40) {
        status = 'Needs Attention';
        color = 'orange';
      } else {
        status = 'Behind Schedule';
        color = 'red';
      }
    }
    
    return {
      name: framework.name,
      progress,
      color,
      status
    };
  }) : [
    { name: 'GRI Standards', progress: 85, color: 'green', status: 'On Track' },
    { name: 'UAE ESG Guidelines', progress: 92, color: 'blue', status: 'Complete' },
    { name: 'TCFD', progress: 68, color: 'orange', status: 'Needs Attention' },
    { name: 'SASB', progress: 45, color: 'red', status: 'Behind Schedule' }
  ];

  const recentActivities = dashboardData?.recent_activities || (() => {
    const activities = [];
    let activityId = 1;
    
    if (dashboardData?.progress) {
      const progress = dashboardData.progress;
      
      if (progress.module_1_complete) {
        activities.push({
          id: activityId++,
          action: 'Business activities configured',
          description: 'Company activities have been set up',
          time: '1 day ago',
          type: 'system',
          icon: 'fas fa-building',
          color: 'blue'
        });
      }
      
      if (progress.module_2_complete) {
        activities.push({
          id: activityId++,
          action: 'ESG frameworks assigned',
          description: 'Company frameworks have been configured',
          time: '1 day ago',
          type: 'system',
          icon: 'fas fa-list-check',
          color: 'purple'
        });
      }
      
      if (progress.module_3_complete) {
        activities.push({
          id: activityId++,
          action: 'Profiling completed',
          description: 'Company profile and checklist generated',
          time: '1 day ago',
          type: 'system',
          icon: 'fas fa-check-circle',
          color: 'green'
        });
      }
      
      if (progress.module_4_complete) {
        activities.push({
          id: activityId++,
          action: 'Meters configured',
          description: `${dashboardData.active_meters || 0} meters are now active`,
          time: '1 day ago',
          type: 'system',
          icon: 'fas fa-gauge',
          color: 'orange'
        });
      }
      
      if (progress.module_5_complete) {
        activities.push({
          id: activityId++,
          action: 'Data collection started',
          description: 'ESG data submissions have been initiated',
          time: '1 day ago',
          type: 'data',
          icon: 'fas fa-upload',
          color: 'blue'
        });
      }
    }
    
    // Add default activities if none exist
    if (activities.length === 0) {
      activities.push(
        {
          id: 1,
          action: 'System initialized',
          description: 'ESG platform setup completed',
          time: '2 days ago',
          type: 'system',
          icon: 'fas fa-play-circle',
          color: 'green'
        }
      );
    }
    
    return activities.slice(0, 4); // Show only 4 most recent
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

  const handleExportData = async () => {
    try {
      // Create a CSV export of current dashboard data
      const csvData = [
        ['Metric', 'Value', 'Unit'],
        ['Total Data Elements', dashboardData?.total_data_elements || '0', 'items'],
        ['Active Meters', dashboardData?.active_meters || '0', 'units'],
        ['Total Frameworks', dashboardData?.total_frameworks || '0', 'active'],
        ['Data Completeness', Math.round(dashboardData?.data_completeness_percentage || 0), '%'],
        ['Evidence Completeness', Math.round(dashboardData?.evidence_completeness_percentage || 0), '%']
      ];

      if (dashboardData?.frameworks) {
        csvData.push(['', '', '']); // Empty row
        csvData.push(['Framework', 'Progress', 'Status']);
        frameworkStatus.forEach(framework => {
          csvData.push([framework.name, `${framework.progress}%`, framework.status]);
        });
      }

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `esg-dashboard-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleAddDeadline = () => {
    // For now, navigate to the data collection page as a placeholder
    // In a real app, this would open a modal or form to add custom deadlines
    alert('Navigate to relevant compliance page or open deadline management modal');
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

  // Generate chart data for selected meter
  const generateChartData = () => {
    if (!chartData || !chartData.meters || chartData.meters.length === 0) {
      console.log('No chart data or meters available');
      return { labels: [], data: [] };
    }

    const selectedMeterData = chartData.meters[selectedMeter];
    if (!selectedMeterData) {
      console.log('No selected meter data available');
      return { labels: [], data: [] };
    }

    // Generate mock historical data based on real meter type
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const baseValue = selectedMeterData.type.includes('Electricity') ? 2450 :
                     selectedMeterData.type.includes('Fuel') ? 500 :
                     selectedMeterData.type.includes('Water') ? 1250 : 300;

    // Find real data for this meter from dataEntries
    const realData = chartData.dataEntries.find(entry => 
      entry.meter && entry.meter.id === selectedMeterData.id
    );
    const realValue = realData ? parseFloat(realData.submission.value) || baseValue : baseValue;

    // Generate trend data with some variation
    const data = months.map((month, index) => {
      if (index === 7) { // August - use real data
        return realValue;
      }
      const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
      return Math.round(baseValue * (1 + variation));
    });

    return { labels: months, data };
  };

  // Generate emissions breakdown data
  const generateEmissionsData = () => {
    if (!chartData || !chartData.dataEntries) {
      console.log('No chart data or data entries for emissions');
      return {};
    }

    // Group emissions data by scope
    const scopes = {
      'Scope 1': { value: 0, color: '#ef4444', items: [] },
      'Scope 2': { value: 0, color: '#3b82f6', items: [] },
      'Scope 3': { value: 0, color: '#6b7280', items: [] }
    };

    chartData.dataEntries.forEach(entry => {
      const elementName = entry.element_name.toLowerCase();
      const value = parseFloat(entry.submission.value) || 0;
      
      if (elementName.includes('fuel') || elementName.includes('gas')) {
        scopes['Scope 1'].value += value * 2.3; // Convert to CO2e
        scopes['Scope 1'].items.push(entry.element_name);
      } else if (elementName.includes('electricity') || elementName.includes('energy')) {
        scopes['Scope 2'].value += value * 0.85; // Convert to CO2e
        scopes['Scope 2'].items.push(entry.element_name);
      } else {
        scopes['Scope 3'].value += value * 0.1; // Estimate CO2e
        scopes['Scope 3'].items.push(entry.element_name);
      }
    });

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
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">
            <i className="fas fa-download mr-2"></i>Export
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <i className="fas fa-plus mr-2"></i>Generate Report
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
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
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
            <div className="flex items-center space-x-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Meter Data Analytics</h3>
                <p className="text-gray-600 text-sm">
                  {chartData?.meters?.[selectedMeter] ? 
                    `${chartData.meters[selectedMeter].name} - ${chartData.meters[selectedMeter].type}` : 
                    'Loading meter data...'
                  }
                </p>
              </div>
              {chartData?.meters && chartData.meters.length > 1 && (
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleMeterNavigation('prev')}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    title="Previous meter"
                  >
                    <i className="fas fa-chevron-left text-gray-600"></i>
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedMeter + 1} of {chartData.meters.length}
                  </span>
                  <button 
                    onClick={() => handleMeterNavigation('next')}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    title="Next meter"
                  >
                    <i className="fas fa-chevron-right text-gray-600"></i>
                  </button>
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {chartData?.meters?.[selectedMeter]?.type?.includes('Electricity') ? 'kWh' :
                 chartData?.meters?.[selectedMeter]?.type?.includes('Fuel') ? 'Liters' :
                 chartData?.meters?.[selectedMeter]?.type?.includes('Water') ? 'Liters' : 'Units'}
              </span>
            </div>
          </div>
          
          {/* Chart Area */}
          <div className="h-64 bg-gray-50 rounded-lg p-4">
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
    </div>
  );
};

export default Dashboard;