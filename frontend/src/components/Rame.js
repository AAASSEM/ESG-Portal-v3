import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const Rame = () => {
  // ALL HOOKS DECLARED AT THE TOP
  const navigate = useNavigate();
  const { user, selectedCompany } = useAuth();
  const [selectedVoluntaryFrameworks, setSelectedVoluntaryFrameworks] = useState([]);
  const [mandatoryFrameworks, setMandatoryFrameworks] = useState([]);
  const [loadingFrameworks, setLoadingFrameworks] = useState(true);
  const [savingFramework, setSavingFramework] = useState(false);
  const companyId = selectedCompany?.id;

  // Fetch existing voluntary frameworks from database
  useEffect(() => {
    if (!companyId) {
      console.log('⏸️ No company selected, skipping voluntary framework fetch');
      return;
    }
    
    const fetchExistingVoluntaryFrameworks = async () => {
      try {
        console.log('🔍 Fetching existing voluntary frameworks for company:', companyId);
        
        // Get all company frameworks
        const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}/frameworks/`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const frameworks = await response.json();

          // Ensure frameworks is an array
          const frameworksArray = Array.isArray(frameworks) ? frameworks : [];

          if (!Array.isArray(frameworks)) {
            console.warn('⚠️ Backend returned non-array data for existing frameworks:', typeof frameworks, frameworks);
          }

          // Filter for voluntary frameworks (type === 'voluntary')
          const voluntaryIds = frameworksArray
            .filter(fw => fw.type === 'voluntary')
            .map(fw => fw.framework_id);

          console.log('📋 Existing voluntary frameworks from DB:', voluntaryIds);
          setSelectedVoluntaryFrameworks(voluntaryIds);
        }
      } catch (error) {
        console.error('❌ Error fetching voluntary frameworks:', error);
      } finally {
        setLoadingFrameworks(false);
      }
    };
    
    fetchExistingVoluntaryFrameworks();
  }, [companyId]);

  // Fetch company's assigned mandatory frameworks
  useEffect(() => {
    if (!companyId) {
      console.log('⏸️ No company selected, skipping framework fetch');
      return;
    }
    
    const fetchMandatoryFrameworks = async () => {
      try {
        console.log('🔍 Fetching mandatory frameworks for company:', companyId);
        
        // Get company frameworks from backend
        const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}/frameworks/`, {
          credentials: 'include'
        });
        if (response.ok) {
          const frameworks = await response.json();
          console.log('📋 Backend frameworks:', frameworks);
          
          // Only DST and ESG are mandatory frameworks
          const defaultMandatoryFrameworks = [
            {
              id: 'esg',
              name: 'ESG Framework',
              description: 'Core Environmental, Social, and Governance reporting framework',
              icon: 'fas fa-chart-line',
              color: 'blue',
              coverage: 'Environmental, Social, Governance',
              reason: 'Core framework for all businesses'
            },
            {
              id: 'dst',
              name: 'Dubai Sustainable Tourism (DST)',
              description: 'Dubai Department of Economy and Tourism sustainability requirements for all hotels in Dubai',
              icon: 'fas fa-building',
              color: 'green',
              coverage: 'Energy, Water, Waste, Community',
              reason: 'Mandatory for all Dubai hospitality entities'
            }
          ];
          
          let mappedFrameworks = [];
          
          // If backend has frameworks, filter for only mandatory ones (DST and ESG)
          if (frameworks && Array.isArray(frameworks) && frameworks.length > 0) {
            const mandatoryFrameworks = frameworks.filter(f => f.type === 'mandatory');
            mappedFrameworks = mandatoryFrameworks.map(framework => {
              if (framework.framework_id === 'DST') {
                return defaultMandatoryFrameworks[1]; // DST
              } else if (framework.framework_id === 'ESG') {
                return defaultMandatoryFrameworks[0]; // ESG
              }
              // Default mapping for other frameworks (shouldn't happen)
              return {
                id: framework.framework_id.toLowerCase(),
                name: framework.name || framework.framework_id,
                description: framework.description || 'Framework description',
                icon: 'fas fa-chart-line',
                color: 'blue',
                coverage: 'Various sustainability aspects',
                reason: 'Required for your business profile'
              };
            });
            
            console.log('✅ Mapped backend frameworks:', mappedFrameworks);
          } else {
            console.log('⚠️ Backend returned empty frameworks, using all mandatory frameworks');
            mappedFrameworks = defaultMandatoryFrameworks;
          }
          
          // Ensure we always have at least the 2 mandatory frameworks
          const frameworkIds = mappedFrameworks.map(f => f.id);
          defaultMandatoryFrameworks.forEach(defaultFw => {
            if (!frameworkIds.includes(defaultFw.id)) {
              mappedFrameworks.push(defaultFw);
            }
          });
          
          console.log('✅ Final mandatory frameworks:', mappedFrameworks);
          setMandatoryFrameworks(mappedFrameworks);
        } else {
          console.error('Failed to fetch frameworks, using fallback');
          // Fallback to only 2 mandatory frameworks
          setMandatoryFrameworks([
            {
              id: 'esg',
              name: 'ESG Framework',
              description: 'Core Environmental, Social, and Governance reporting framework',
              icon: 'fas fa-chart-line',
              color: 'blue',
              coverage: 'Environmental, Social, Governance',
              reason: 'Core framework for all businesses'
            },
            {
              id: 'dst',
              name: 'Dubai Sustainable Tourism (DST)',
              description: 'Dubai Department of Economy and Tourism sustainability requirements for all hotels in Dubai',
              icon: 'fas fa-building',
              color: 'green',
              coverage: 'Energy, Water, Waste, Community',
              reason: 'Mandatory for all Dubai hospitality entities'
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching mandatory frameworks:', error);
        // Fallback to only 2 mandatory frameworks
        setMandatoryFrameworks([
          {
            id: 'esg',
            name: 'ESG Framework',
            description: 'Core Environmental, Social, and Governance reporting framework',
            icon: 'fas fa-chart-line',
            color: 'blue',
            coverage: 'Environmental, Social, Governance',
            reason: 'Core framework for all businesses'
          },
          {
            id: 'dst',
            name: 'Dubai Sustainable Tourism (DST)',
            description: 'Dubai Department of Economy and Tourism sustainability requirements for all hotels in Dubai',
            icon: 'fas fa-building',
            color: 'green',
            coverage: 'Energy, Water, Waste, Community',
            reason: 'Mandatory for all Dubai hospitality entities'
          }
        ]);
      }
    };

    fetchMandatoryFrameworks();
  }, [companyId]);

  const [voluntaryFrameworks, setVoluntaryFrameworks] = useState([]);

  // Fetch available voluntary frameworks from backend
  useEffect(() => {
    const fetchVoluntaryFrameworks = async () => {
      try {
        console.log('🔍 Fetching voluntary frameworks from backend...');
        const response = await fetch(`${API_BASE_URL}/api/frameworks/voluntary/`, {
          credentials: 'include'
        });

        if (response.ok) {
          const frameworks = await response.json();
          console.log('📋 Backend voluntary frameworks:', frameworks);

          // Ensure frameworks is an array
          const frameworksArray = Array.isArray(frameworks) ? frameworks : [];

          if (!Array.isArray(frameworks)) {
            console.warn('⚠️ Backend returned non-array data for voluntary frameworks:', typeof frameworks, frameworks);
          }

          // Map backend data to frontend format with icons and styling
          const mappedFrameworks = frameworksArray.map(fw => ({
            id: fw.framework_id,
            name: fw.name,
            description: fw.description || 'Comprehensive sustainability framework',
            icon: getFrameworkIcon(fw.framework_id),
            color: getFrameworkColor(fw.framework_id),
            features: getFrameworkFeatures(fw.framework_id),
            bestFor: getFrameworkBestFor(fw.framework_id)
          }));

          console.log('✅ Mapped voluntary frameworks:', mappedFrameworks);
          setVoluntaryFrameworks(mappedFrameworks);
        } else {
          console.error('❌ Failed to fetch voluntary frameworks:', response.status);
          console.error('❌ Response details:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url
          });
        }
      } catch (error) {
        console.error('❌ Error fetching voluntary frameworks:', error);
      }
    };

    fetchVoluntaryFrameworks();
  }, []);

  // Helper functions for framework styling
  const getFrameworkIcon = (frameworkId) => {
    const iconMap = {
      'GREEN-KEY-HOSPITALITY': 'fas fa-key',
      'HOSPITALITY-MASTER': 'fas fa-database',
      'GRI': 'fas fa-globe',
      'SASB': 'fas fa-chart-bar',
      'TCFD': 'fas fa-thermometer-half',
      'CDP': 'fas fa-cloud'
    };
    return iconMap[frameworkId] || 'fas fa-certificate';
  };

  const getFrameworkColor = (frameworkId) => {
    const colorMap = {
      'GREEN-KEY-HOSPITALITY': 'green',
      'HOSPITALITY-MASTER': 'blue',
      'GRI': 'blue',
      'SASB': 'purple',
      'TCFD': 'orange',
      'CDP': 'teal'
    };
    return colorMap[frameworkId] || 'gray';
  };

  const getFrameworkFeatures = (frameworkId) => {
    const featureMap = {
      'GREEN-KEY-HOSPITALITY': ['13 criteria areas', 'Water & energy efficiency', 'Guest engagement programs'],
      'HOSPITALITY-MASTER': ['87 framework elements', 'Consolidated ESG data', 'Comprehensive coverage'],
      'GRI': ['Universal standards', 'Stakeholder engagement', 'Detailed disclosures'],
      'SASB': ['Industry-specific metrics', 'Investor-focused reporting', 'Materiality assessment'],
      'TCFD': ['Climate risk assessment', 'Scenario planning', 'Financial impact disclosure'],
      'CDP': ['Environmental disclosure', 'Climate scoring', 'Water & forest reporting']
    };
    return featureMap[frameworkId] || ['Comprehensive sustainability criteria', 'Industry best practices', 'Stakeholder engagement'];
  };

  const getFrameworkBestFor = (frameworkId) => {
    const bestForMap = {
      'GREEN-KEY-HOSPITALITY': 'Hotels seeking eco-certification',
      'HOSPITALITY-MASTER': 'Comprehensive master reporting',
      'GRI': 'Comprehensive sustainability reporting',
      'SASB': 'Public companies, Investor relations',
      'TCFD': 'Climate-focused reporting',
      'CDP': 'Environmental transparency'
    };
    return bestForMap[frameworkId] || 'Sustainability reporting';
  };

  const toggleVoluntaryFramework = async (frameworkId) => {
    console.log('🔄 toggleVoluntaryFramework called with frameworkId:', frameworkId);
    console.log('🔄 selectedVoluntaryFrameworks:', selectedVoluntaryFrameworks);

    const isCurrentlySelected = selectedVoluntaryFrameworks.includes(frameworkId);
    console.log('🔄 isCurrentlySelected:', isCurrentlySelected);
    setSavingFramework(true);
    
    try {
      if (isCurrentlySelected) {
        // Remove framework
        const response = await fetch(`${API_BASE_URL}/api/frameworks/remove_voluntary/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            company_id: companyId,
            framework_id: frameworkId
          })
        });
        
        if (response.ok) {
          console.log('✅ Framework removed successfully:', frameworkId);
          setSelectedVoluntaryFrameworks(prev => prev.filter(id => id !== frameworkId));
        } else {
          console.error('❌ Failed to remove framework:', response.status);
        }
      } else {
        // Add framework
        const response = await fetch(`${API_BASE_URL}/api/frameworks/assign_voluntary/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            company_id: companyId,
            framework_id: frameworkId
          })
        });
        
        if (response.ok) {
          console.log('✅ Framework assigned successfully:', frameworkId);
          setSelectedVoluntaryFrameworks(prev => [...prev, frameworkId]);
        } else {
          console.error('❌ Failed to assign framework:', response.status);
        }
      }
    } catch (error) {
      console.error('❌ Error toggling framework:', error);
    } finally {
      setSavingFramework(false);
    }
  };

  const handleContinue = () => {
    navigate('/location');
  };

  // Check if user has permission to access framework selection (moved after hooks)
  const canAccessFrameworks = () => {
    if (!user) return false;
    // Module 1-2 (Company Setup & Frameworks): CORRECTED
    // ✅ Super User, Admin: Full edit access
    // 👁️ Site Manager, Viewer: View-only access  
    // ❌ Uploader, Meter Manager: NO ACCESS (completely blocked)
    return ['super_user', 'admin', 'site_manager', 'viewer'].includes(user.role);
  };

  // If no permission, show permission denied message
  if (!canAccessFrameworks()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-lock text-red-600 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">
              You don't have permission to access framework selection.
            </p>
            <p className="text-sm text-gray-500">
              Contact your administrator if you need access to this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Role-based functionality controls for Framework Selection
  console.log('🔍 Rame.js Debug - User object:', user);
  console.log('🔍 Rame.js Debug - User role:', user?.role);
  console.log('🔍 Rame.js Debug - User is_superuser:', user?.is_superuser);

  const canEditFrameworks = ['super_user', 'admin'].includes(user?.role) || user?.is_superuser === true; // Full edit access
  const isViewOnly = ['site_manager', 'viewer'].includes(user?.role); // View only

  console.log('🔍 Rame.js Debug - canEditFrameworks:', canEditFrameworks);
  console.log('🔍 Rame.js Debug - isViewOnly:', isViewOnly);

  return (
     <div className="max-w-6xl mx-auto">

      {/* Mandatory Frameworks Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-lock text-red-600"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Mandatory Frameworks</h2>
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">Required</div>
          </div>
          {isViewOnly && (
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
              <i className="fas fa-eye mr-2"></i>View Only Mode
            </div>
          )}
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-hand-pointer text-blue-600"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Voluntary Frameworks</h2>
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Optional</div>
          </div>
          {isViewOnly && (
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
              <i className="fas fa-eye mr-2"></i>View Selected Frameworks
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {voluntaryFrameworks.map((framework) => {
            const isSelected = selectedVoluntaryFrameworks.includes(framework.id);
            return (
              <div 
                key={framework.id} 
                className={`bg-white rounded-xl p-6 shadow-sm border transition-all relative ${
                  isSelected ? 'border-blue-300 shadow-md' : 'border-gray-200'
                } ${canEditFrameworks ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : 'cursor-default'}`}
                onClick={canEditFrameworks ? () => {
                  console.log('🖱️ Framework card clicked:', framework.id, 'canEditFrameworks:', canEditFrameworks);
                  toggleVoluntaryFramework(framework.id);
                } : () => console.log('🚫 Framework card clicked but editing disabled')}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-16 h-16 bg-${framework.color}-100 rounded-xl flex items-center justify-center ${!canEditFrameworks ? 'opacity-60' : ''}`}>
                    <i className={`${framework.icon} text-${framework.color}-600 text-2xl`}></i>
                  </div>
                  <label className={`relative inline-flex items-center ${canEditFrameworks ? 'cursor-pointer' : 'cursor-default'}`}>
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={isSelected}
                      onChange={() => {}}
                      disabled={!canEditFrameworks}
                    />
                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${isSelected ? 'peer-checked:bg-blue-600' : ''} ${!canEditFrameworks ? 'opacity-60' : ''}`}></div>
                  </label>
                </div>
                {isViewOnly && (
                  <div className="absolute -top-1 -right-1">
                    <div className="px-1 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                      <i className="fas fa-eye"></i>
                    </div>
                  </div>
                )}
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
          {isViewOnly && (
            <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm">
              <i className="fas fa-eye mr-1"></i>View Only Access
            </div>
          )}
        </div>
        <div className="flex space-x-4">
          {canEditFrameworks ? (
            <button 
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg font-medium"
              onClick={handleContinue}
            >
              Save & Continue
              <i className="fas fa-arrow-right ml-2"></i>
            </button>
          ) : (
            <button 
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg font-medium"
              onClick={handleContinue}
            >
              Continue
              <i className="fas fa-arrow-right ml-2"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Rame;