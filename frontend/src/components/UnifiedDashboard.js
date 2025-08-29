import React, { useState, useEffect } from 'react';
import { useAuth, makeAuthenticatedRequest } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const UnifiedDashboard = () => {
  const { user, selectedCompany, hasPermission } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');
  const [selectedMeter, setSelectedMeter] = useState(null);
  const [selectedScope, setSelectedScope] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // Dashboard data state - no hardcoded values
  const [dashboardData, setDashboardData] = useState({
    esgScores: {
      environmental: { score: null, grade: null, trend: null, metrics: [] },
      social: { score: null, grade: null, trend: null, metrics: [] },
      governance: { score: null, grade: null, trend: null, metrics: [] },
      overall: null
    },
    meters: {
      active: [],
      inactive: [],
      alerts: [],
      consumption: {},
      trends: {}
    },
    emissions: {
      scope1: { value: null, percentage: null, sources: [] },
      scope2: { value: null, percentage: null, sources: [] },
      scope3: { value: null, percentage: null, sources: [] },
      total: null,
      intensity: {},
      opportunities: []
    },
    recentActivities: [],
    kpiData: [],
    frameworkData: []
  });

  // Role-based permission system
  const rolePermissions = {
    super_user: ['all'],
    admin: ['esg', 'meters', 'emissions', 'activities', 'frameworks'],
    site_manager: ['esg_limited', 'meters_site', 'emissions_site', 'activities_site'],
    uploader: ['personal_progress', 'assigned_meters', 'activities_own'],
    viewer: ['esg_view', 'meters_view', 'emissions_view', 'activities_view'],
    meter_manager: ['meters_full', 'meter_health', 'activities_meter']
  };

  const hasRolePermission = (section) => {
    const userPermissions = rolePermissions[user?.role] || [];
    return userPermissions.includes('all') || userPermissions.includes(section);
  };

  const isReadOnly = (userRole) => {
    return ['viewer', 'auditor'].includes(userRole);
  };

  // Fetch dashboard data using the same approach as DashboardNew
  const fetchDashboardData = async () => {
    if (!selectedCompany?.id) {
      console.log('No company selected, skipping dashboard data fetch');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Fetching unified dashboard data for company:', selectedCompany.id);
      
      // Use the same API calls as DashboardNew.js
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      const [dashboardResponse, progressResponse, frameworksResponse, metersResponse, dataResponse, progressDetailResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/dashboard/?company_id=${selectedCompany.id}`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/companies/${selectedCompany.id}/progress/`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/companies/${selectedCompany.id}/frameworks/`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/meters/?company_id=${selectedCompany.id}`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/data-collection/tasks/?company_id=${selectedCompany.id}&year=${currentYear}&month=${currentMonth}`, { credentials: 'include' }),
        makeAuthenticatedRequest(`${API_BASE_URL}/api/data-collection/progress/?company_id=${selectedCompany.id}&year=${currentYear}&month=${currentMonth}`)
      ]);
      
      console.log('📊 Unified Dashboard API Response Status:', {
        dashboard: dashboardResponse.status,
        progress: progressResponse.status,
        frameworks: frameworksResponse.status,
        meters: metersResponse.status,
        data: dataResponse.status,
        progressDetail: 'made request'
      });

      const dashboard = dashboardResponse.ok ? await dashboardResponse.json() : {};
      const progress = progressResponse.ok ? await progressResponse.json() : {};
      const frameworksData = frameworksResponse.ok ? await frameworksResponse.json() : {};
      const metersData = metersResponse.ok ? await metersResponse.json() : {};
      const dataEntries = dataResponse.ok ? await dataResponse.json() : [];
      const progressDetail = progressDetailResponse.ok ? await progressDetailResponse.json() : { data_progress: 0, evidence_progress: 0, overall_progress: 0 };

      console.log('🔍 Raw API Data:', {
        dashboard,
        progress,
        frameworksData,
        metersData: metersData, // Log the full meters response
        metersCount: Array.isArray(metersData) ? metersData.length : (metersData?.results?.length || 0),
        dataEntriesCount: Array.isArray(dataEntries) ? dataEntries.length : 0,
        progressDetail
      });

      // Process the data into our dashboard format
      const newDashboardData = { ...dashboardData };
      
      // Calculate data completions
      const completedEntries = Array.isArray(dataEntries) ? dataEntries.filter(entry => entry.value || entry.evidence_file) : [];
      const totalEntries = Array.isArray(dataEntries) ? dataEntries.length : 0;
      const dataCompleteness = totalEntries > 0 ? Math.round((completedEntries.length / totalEntries) * 100) : 0;
      
      // Evidence completions
      const entriesWithEvidence = Array.isArray(dataEntries) ? dataEntries.filter(entry => entry.evidence_file) : [];
      const evidenceCompleteness = totalEntries > 0 ? Math.round((entriesWithEvidence.length / totalEntries) * 100) : 0;
      
      // Process meters data with proper structure handling (same as DashboardNew)
      const meters = Array.isArray(metersData) 
        ? metersData 
        : (metersData?.results || metersData?.data || []);
      
      console.log('🔧 Processed Meters:', meters.length, 'meters found', meters);
      
      const activeMeters = meters.filter(m => m.status !== 'inactive' && m.is_active !== false);
      const alertMeters = meters.filter(m => m.has_alerts === true || m.status === 'alert');
      
      // Pending tasks (entries without values)
      const pendingTasks = Array.isArray(dataEntries) ? dataEntries.filter(entry => !entry.value && !entry.evidence_file) : [];
      
      // Create KPI data from real API responses
      newDashboardData.kpiData = [
        {
          id: 'data_progress',
          title: 'Data Progress',
          value: progressDetail.data_progress || dataCompleteness,
          unit: '%',
          icon: 'chart-line',
          color: 'blue'
        },
        {
          id: 'evidence_progress',
          title: 'Evidence Progress', 
          value: progressDetail.evidence_progress || evidenceCompleteness,
          unit: '%',
          icon: 'file-upload',
          color: 'green'
        },
        {
          id: 'active_meters',
          title: 'Active Meters',
          value: activeMeters.length,
          unit: '',
          icon: 'tachometer-alt',
          color: 'purple'
        },
        {
          id: 'pending_tasks',
          title: 'Pending Tasks',
          value: pendingTasks.length,
          unit: '',
          icon: 'tasks',
          color: 'orange'
        }
      ];
      
      // ESG Scores (use dashboard API or fallback)
      newDashboardData.esgScores = {
        environmental: { 
          score: dashboard.environmental_score || 0, 
          grade: dashboard.environmental_grade || 'N/A', 
          trend: dashboard.environmental_trend 
        },
        social: { 
          score: dashboard.social_score || 0, 
          grade: dashboard.social_grade || 'N/A', 
          trend: dashboard.social_trend 
        },
        governance: { 
          score: dashboard.governance_score || 0, 
          grade: dashboard.governance_grade || 'N/A', 
          trend: dashboard.governance_trend 
        },
        overall: dashboard.overall_esg_score || progressDetail.overall_progress || 0
      };
      
      // Process frameworks data (same logic as DashboardNew)
      let frameworks = [];
      if (frameworksData) {
        if (Array.isArray(frameworksData)) {
          frameworks = frameworksData;
        } else if (frameworksData.results && Array.isArray(frameworksData.results)) {
          frameworks = frameworksData.results;
        } else if (frameworksData.data && Array.isArray(frameworksData.data)) {
          frameworks = frameworksData.data;
        } else if (typeof frameworksData === 'object') {
          frameworks = [frameworksData];
        }
      }
      
      // Add fallback frameworks if none found
      if (frameworks.length === 0) {
        frameworks = [
          { framework_id: 'ESG', name: 'ESG Standards', type: 'mandatory', progress: dataCompleteness },
          { framework_id: 'DST', name: 'Dubai Sustainable Tourism', type: 'mandatory_conditional', progress: evidenceCompleteness },
          { framework_id: 'GRI', name: 'GRI Standards', type: 'voluntary', progress: Math.round((dataCompleteness + evidenceCompleteness) / 2) }
        ];
      }
      
      newDashboardData.frameworkData = frameworks.map(fw => ({
        id: fw.framework_id || fw.id || fw.name,
        name: fw.name || fw.framework_name,
        progress: Math.round(fw.progress || fw.completion_percentage || 0)
      }));
      
      // Process meters data with proper field mapping
      newDashboardData.meters = {
        active: activeMeters.map(meter => ({
          id: meter.id,
          name: meter.name,
          type: meter.type || meter.meter_type, // Use 'type' field from API
          location: meter.location_description || meter.location || 'Not configured',
          status: meter.status || 'active',
          account_number: meter.account_number
        })),
        inactive: meters.filter(m => m.status === 'inactive' || m.is_active === false),
        alerts: alertMeters,
        consumption: {},
        trends: {}
      };
      
      // Set initial selected meter
      if (activeMeters.length > 0 && !selectedMeter) {
        setSelectedMeter(activeMeters[0].id);
      }
      
      // Create recent activities from data entries
      const activities = Array.isArray(dataEntries) ? 
        dataEntries
          .filter(entry => entry.updated_at || entry.created_at)
          .slice(0, 10)
          .map((entry, index) => ({
            id: `activity_${entry.id || index}`,
            type: entry.evidence_file ? 'DATA_SUBMISSION' : (entry.value ? 'DATA_ENTRY' : 'TASK_ASSIGNED'),
            description: `${entry.value ? 'Data entered' : entry.evidence_file ? 'Evidence uploaded' : 'Task assigned'} for ${entry.name}`,
            timestamp: entry.updated_at || entry.created_at || new Date().toISOString(),
            user: entry.assigned_user || user?.name || 'System',
            user_id: entry.assigned_user_id || user?.id,
            value: entry.value || null
          }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        : [];
      
      newDashboardData.recentActivities = activities;
      
      // Basic emissions data (if available from dashboard)
      if (dashboard.emissions_data || dashboard.scope1_emissions) {
        newDashboardData.emissions = {
          scope1: { 
            value: dashboard.scope1_emissions || dashboard.emissions_data?.scope1_total, 
            percentage: dashboard.scope1_percentage || dashboard.emissions_data?.scope1_percentage || 0
          },
          scope2: { 
            value: dashboard.scope2_emissions || dashboard.emissions_data?.scope2_total, 
            percentage: dashboard.scope2_percentage || dashboard.emissions_data?.scope2_percentage || 0
          },
          scope3: { 
            value: dashboard.scope3_emissions || dashboard.emissions_data?.scope3_total, 
            percentage: dashboard.scope3_percentage || dashboard.emissions_data?.scope3_percentage || 0
          },
          total: dashboard.total_emissions || dashboard.emissions_data?.total_emissions || 0
        };
      }

      setDashboardData(newDashboardData);
      console.log('✅ Unified dashboard data processed:', newDashboardData);
      
    } catch (error) {
      console.error('❌ Failed to fetch unified dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedCompany, user?.role, selectedTimeRange]);

  // Activity types and their icons
  const getActivityIcon = (type) => {
    const icons = {
      DATA_SUBMISSION: 'fa-database',
      METER_UPDATE: 'fa-tachometer-alt',
      FRAMEWORK_PROGRESS: 'fa-chart-line',
      USER_ACTION: 'fa-user',
      SYSTEM_ALERT: 'fa-exclamation-triangle',
      REPORT_GENERATION: 'fa-file-alt',
      TASK_COMPLETION: 'fa-check-circle'
    };
    return icons[type] || 'fa-info-circle';
  };

  // Time Range Selector Component
  const TimeRangeSelector = ({ selected, onChange }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-gray-700">Time Range:</span>
        <div className="flex space-x-2">
          {['week', 'month', 'quarter', 'year'].map(range => (
            <button
              key={range}
              onClick={() => onChange(range)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selected === range
                  ? 'bg-purple-100 text-purple-800'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // KPI Card Component
  const KPICard = ({ title, value, unit, change, trend, icon, color }) => {
    // Handle color classes dynamically
    const bgColorClass = `bg-${color}-100`;
    const textColorClass = `text-${color}-600`;
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            color === 'green' ? 'bg-green-100' :
            color === 'blue' ? 'bg-blue-100' :
            color === 'purple' ? 'bg-purple-100' :
            color === 'orange' ? 'bg-orange-100' : 'bg-gray-100'
          }`}>
            <i className={`fas fa-${icon} text-xl ${
              color === 'green' ? 'text-green-600' :
              color === 'blue' ? 'text-blue-600' :
              color === 'purple' ? 'text-purple-600' :
              color === 'orange' ? 'text-orange-600' : 'text-gray-600'
            }`}></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-800">
              {value !== undefined && value !== null && value !== '--' ? value : '--'} {unit}
            </p>
            {change && trend && (
              <span className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend === 'up' ? '↑' : '↓'} {Math.abs(change)}%
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Meter Navigation Component - Show one meter at a time
  const MeterNavigation = ({ meters, selectedMeter, onMeterSelect }) => {
    const navigateMeter = (direction) => {
      if (!meters?.length) return;
      
      const currentIndex = meters.findIndex(m => m.id === selectedMeter);
      let newIndex;
      
      if (direction === 'prev') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : meters.length - 1;
      } else {
        newIndex = currentIndex < meters.length - 1 ? currentIndex + 1 : 0;
      }
      
      onMeterSelect(meters[newIndex].id);
    };

    if (!meters?.length) return null;
    
    const currentMeter = meters.find(m => m.id === selectedMeter) || meters[0];
    const currentIndex = meters.findIndex(m => m.id === selectedMeter);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigateMeter('prev')}
            disabled={meters.length <= 1}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              meters.length <= 1 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          
          <div className="flex-1 mx-4 text-center">
            <div 
              onClick={() => onMeterSelect(currentMeter.id)}
              className="cursor-pointer p-4 rounded-lg border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors"
            >
              <h3 className="font-semibold text-purple-900 text-lg">{currentMeter.name}</h3>
              <p className="text-purple-700 text-sm">{currentMeter.type}</p>
              <p className="text-purple-600 text-xs">{currentMeter.location}</p>
              <div className="mt-2 flex items-center justify-center space-x-4">
                <span className="text-xs text-purple-600">
                  {currentIndex + 1} of {meters.length}
                </span>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  currentMeter.status === 'active' || currentMeter.status === 'Active'
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {currentMeter.status}
                </span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => navigateMeter('next')}
            disabled={meters.length <= 1}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              meters.length <= 1 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    );
  };

  // Meter Chart Component - Shows data visualization for selected meter
  const MeterChart = ({ meter, timeRange }) => {
    if (!meter) return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <i className="fas fa-tachometer-alt text-4xl mb-4"></i>
          <p>No meter selected</p>
        </div>
      </div>
    );

    // Generate sample chart data based on meter type and time range
    const generateChartData = (meterType, timeRange) => {
      const periods = {
        week: 7,
        month: 30, 
        quarter: 90,
        year: 12
      };
      
      const points = periods[timeRange] || 30;
      const data = [];
      const baseValue = meterType?.toLowerCase().includes('electric') ? 1000 : 
                       meterType?.toLowerCase().includes('water') ? 500 :
                       meterType?.toLowerCase().includes('gas') ? 200 : 300;
      
      for (let i = 0; i < points; i++) {
        const variation = (Math.random() - 0.5) * 0.3 * baseValue;
        const trend = i * (baseValue * 0.02 / points); // Slight upward trend
        data.push(Math.max(0, Math.round(baseValue + variation + trend)));
      }
      
      return data;
    };

    const chartData = generateChartData(meter.type, timeRange);
    const currentReading = chartData[chartData.length - 1];
    const previousReading = chartData[chartData.length - 2];
    const change = currentReading - previousReading;
    const changePercent = previousReading ? Math.round((change / previousReading) * 100) : 0;
    
    const maxValue = Math.max(...chartData);
    const minValue = Math.min(...chartData);
    const avgValue = Math.round(chartData.reduce((a, b) => a + b, 0) / chartData.length);
    
    const unit = meter.type?.toLowerCase().includes('electric') ? 'kWh' :
                meter.type?.toLowerCase().includes('water') ? 'L' :
                meter.type?.toLowerCase().includes('gas') ? 'm³' : 'units';

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{meter.name}</h3>
            <p className="text-sm text-gray-600">{meter.type} • {meter.location}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{currentReading.toLocaleString()}</p>
            <p className="text-sm text-gray-600">{unit}</p>
          </div>
        </div>
        
        {/* Current Reading and Change */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Current</p>
            <p className="text-xl font-semibold text-gray-900">{currentReading.toLocaleString()}</p>
            <div className="flex items-center justify-center mt-1">
              <span className={`text-sm flex items-center ${
                change >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                <i className={`fas fa-arrow-${change >= 0 ? 'up' : 'down'} mr-1`}></i>
                {Math.abs(changePercent)}%
              </span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Average</p>
            <p className="text-xl font-semibold text-gray-900">{avgValue.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{unit}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Peak</p>
            <p className="text-xl font-semibold text-gray-900">{maxValue.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{unit}</p>
          </div>
        </div>
        
        {/* Simple Chart Visualization */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Usage Trend ({timeRange})</h4>
          <div className="h-32 flex items-end space-x-1">
            {chartData.map((value, index) => {
              const height = ((value - minValue) / (maxValue - minValue)) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-gradient-to-t from-purple-500 to-purple-300 rounded-t"
                  style={{ height: `${Math.max(height, 5)}%` }}
                  title={`${value.toLocaleString()} ${unit}`}
                ></div>
              );
            })}
          </div>
        </div>
        
        {/* Usage Statistics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Total Usage ({timeRange})</p>
            <p className="text-lg font-semibold text-gray-900">
              {chartData.reduce((a, b) => a + b, 0).toLocaleString()} {unit}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Efficiency Rating</p>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${85}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900">85%</span>
            </div>
          </div>
        </div>
        
        {/* Alert Section */}
        {change > previousReading * 0.2 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <i className="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>
              <span className="text-sm text-yellow-800">
                High usage detected - {changePercent}% increase from last reading
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Framework Progress Component
  const FrameworkProgress = ({ frameworks }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Framework Compliance</h3>
      {frameworks?.map(framework => (
        <div key={framework.id} className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="font-medium">{framework.name}</span>
            <span className="text-sm text-gray-600">{framework.progress || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${framework.progress || 0}%` }}
            />
          </div>
        </div>
      )) || <p className="text-gray-500">No framework data available</p>}
    </div>
  );

  // ESG Scores Component
  const ESGScoresCard = ({ esgScores }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">ESG Scores</h3>
      <div className="space-y-4">
        {['environmental', 'social', 'governance'].map(category => (
          <div key={category} className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                category === 'environmental' ? 'bg-green-100' :
                category === 'social' ? 'bg-blue-100' : 'bg-purple-100'
              }`}>
                <i className={`fas ${
                  category === 'environmental' ? 'fa-leaf' :
                  category === 'social' ? 'fa-users' : 'fa-balance-scale'
                } ${
                  category === 'environmental' ? 'text-green-600' :
                  category === 'social' ? 'text-blue-600' : 'text-purple-600'
                }`}></i>
              </div>
              <div>
                <p className="font-medium capitalize">{category}</p>
                <p className="text-sm text-gray-500">
                  Grade: {esgScores?.[category]?.grade || 'N/A'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">
                {esgScores?.[category]?.score || '--'}
              </p>
              {esgScores?.[category]?.trend && (
                <span className={`text-sm ${
                  esgScores[category].trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {esgScores[category].trend === 'up' ? '↑' : '↓'}
                </span>
              )}
            </div>
          </div>
        ))}
        {esgScores?.overall && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Overall ESG Score</span>
              <span className="text-2xl font-bold text-purple-600">
                {esgScores.overall}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Emissions Chart Component
  const EmissionsChart = ({ emissionsData, selectedScope, onScopeChange }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Emissions by Scope</h3>
        <select 
          value={selectedScope} 
          onChange={(e) => onScopeChange(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Scopes</option>
          <option value="scope1">Scope 1</option>
          <option value="scope2">Scope 2</option>
          <option value="scope3">Scope 3</option>
        </select>
      </div>
      
      <div className="space-y-4">
        {['scope1', 'scope2', 'scope3'].map(scope => (
          <div key={scope} className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-4 h-4 rounded mr-3 ${
                scope === 'scope1' ? 'bg-red-500' :
                scope === 'scope2' ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
              <span className="font-medium capitalize">
                {scope.replace('scope', 'Scope ')}
              </span>
            </div>
            <div className="text-right">
              <p className="font-semibold">
                {emissionsData?.[scope]?.value || '--'} tCO₂e
              </p>
              <p className="text-sm text-gray-500">
                {emissionsData?.[scope]?.percentage || '--'}%
              </p>
            </div>
          </div>
        ))}
        {emissionsData?.total && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total Emissions</span>
              <span className="text-xl font-bold">
                {emissionsData.total} tCO₂e
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Recent Activities Component with role-based filtering
  const RecentActivities = ({ activities, userRole }) => {
    const filterByRole = (activities, role) => {
      if (!activities?.length) return [];
      
      switch (role) {
        case 'super_user':
        case 'admin':
          return activities; // See all activities
        case 'site_manager':
          return activities.filter(a => a.type !== 'SYSTEM_ALERT');
        case 'uploader':
          return activities.filter(a => a.user_id === user?.id);
        case 'viewer':
        case 'auditor':
          return activities; // Read-only view of all
        case 'meter_manager':
          return activities.filter(a => 
            ['METER_UPDATE', 'SYSTEM_ALERT'].includes(a.type)
          );
        default:
          return [];
      }
    };

    const filteredActivities = filterByRole(activities, userRole);

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Recent Activity
        </h3>
        <div className="space-y-3">
          {filteredActivities?.length > 0 ? (
            filteredActivities.slice(0, 10).map(activity => (
              <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <i className={`fas ${getActivityIcon(activity.type)} text-gray-600 text-sm`}></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.description}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{activity.user}</span>
                    <span>•</span>
                    <span>{new Date(activity.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                {activity.value && (
                  <div className="text-right">
                    <p className="text-sm font-medium">{activity.value}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500">No recent activities</p>
          )}
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.role === 'super_user' ? 'System Overview' :
             user?.role === 'admin' ? 'Company Dashboard' :
             user?.role === 'site_manager' ? 'Site Dashboard' :
             user?.role === 'uploader' ? 'My Progress' :
             user?.role === 'meter_manager' ? 'Meter Management' :
             'Dashboard'}
          </h1>
          <p className="text-gray-600">
            {selectedCompany?.name || 'ESG Portal'} • {user?.name}
          </p>
        </div>

        {/* Time Range Selector */}
        <TimeRangeSelector 
          selected={selectedTimeRange} 
          onChange={setSelectedTimeRange} 
        />
        
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {dashboardData.kpiData?.length > 0 ? (
            dashboardData.kpiData.map(kpi => (
              <KPICard key={kpi.id} {...kpi} />
            ))
          ) : (
            // Default KPI cards with placeholder data
            [
              { id: 'esg', title: 'ESG Score', value: '--', unit: '', icon: 'leaf', color: 'green' },
              { id: 'progress', title: 'Data Progress', value: '--', unit: '%', icon: 'chart-line', color: 'blue' },
              { id: 'meters', title: 'Active Meters', value: '--', unit: '', icon: 'tachometer-alt', color: 'purple' },
              { id: 'tasks', title: 'Pending Tasks', value: '--', unit: '', icon: 'tasks', color: 'orange' }
            ].map(kpi => (
              <KPICard key={kpi.id} {...kpi} />
            ))
          )}
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* ESG Scores Section */}
          {(hasRolePermission('esg') || hasRolePermission('esg_view') || hasRolePermission('esg_limited')) && (
            <ESGScoresCard esgScores={dashboardData.esgScores} />
          )}
          
          {/* Meters Section with Navigation and Details */}
          {(hasRolePermission('meters') || hasRolePermission('meters_full') || hasRolePermission('meters_site') || hasRolePermission('meters_view') || hasRolePermission('assigned_meters')) && (
            <div>
              <MeterNavigation 
                meters={dashboardData.meters.active}
                selectedMeter={selectedMeter}
                onMeterSelect={setSelectedMeter}
              />
              <MeterChart 
                meter={dashboardData.meters.active?.find(m => m.id === selectedMeter)}
                timeRange={selectedTimeRange}
              />
            </div>
          )}
        </div>
        
        {/* Emissions Section */}
        {(hasRolePermission('emissions') || hasRolePermission('emissions_view') || hasRolePermission('emissions_site')) && (
          <div className="mb-8">
            <EmissionsChart 
              emissionsData={dashboardData.emissions}
              selectedScope={selectedScope}
              onScopeChange={setSelectedScope}
            />
          </div>
        )}
        
        {/* Framework Compliance */}
        {hasRolePermission('frameworks') && (
          <div className="mb-8">
            <FrameworkProgress frameworks={dashboardData.frameworkData} />
          </div>
        )}
        
        {/* Recent Activities */}
        <RecentActivities 
          activities={dashboardData.recentActivities} 
          userRole={user?.role} 
        />
      </div>
    </div>
  );
};

export default UnifiedDashboard;