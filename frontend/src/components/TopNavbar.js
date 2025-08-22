import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TopNavbar = () => {
  console.log('TopNavbar rendering');
  const navigate = useNavigate();
  const location = useLocation();
  console.log('Current location:', location.pathname);

  const modules = [
    { id: 1, name: 'Company Onboarding', path: '/onboard', description: 'Set up your company profile and business activities', progress: 17 },
    { id: 2, name: 'Framework Selection', path: '/rame', description: 'Choose ESG frameworks that align with your reporting requirements', progress: 33 },
    { id: 3, name: 'Data Checklist', path: '/list', description: 'Review personalized data requirements based on your frameworks', progress: 50 },
    { id: 4, name: 'Meter Management', path: '/meter', description: 'Configure and monitor your data collection points', progress: 67 },
    { id: 5, name: 'Data Collection', path: '/data', description: 'Track, input, and validate your ESG performance data', progress: 83 },
    { id: 6, name: 'Dashboard', path: '/dashboard', description: 'Comprehensive view of your sustainability performance', progress: 100 }
  ];

  const getCurrentModule = () => {
    return modules.find(module => location.pathname === module.path) || modules[0];
  };

  const currentModule = getCurrentModule();
  const progress = currentModule.progress;
  
  // Update modules with completion status based on progress
  const modulesWithCompletion = modules.map(module => ({
    ...module,
    completed: progress >= module.progress
  }));

  const getBreadcrumb = () => {
    return [
      { name: 'ESG Portal', path: '/', isActive: false },
      { name: currentModule.name, path: currentModule.path, isActive: true }
    ];
  };

  const isModuleUnlocked = (index) => index === 0 || modulesWithCompletion[index - 1].completed;

  const breadcrumb = getBreadcrumb();

  return (
    <div className="bg-white shadow-2xl">
      {/* Top Bar - 48px height */}
      <div className="h-12 px-8 bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 backdrop-blur-lg border-b border-purple-100">
        <div className="flex items-center justify-between h-full">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm">
            {breadcrumb.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <button
                  onClick={() => !item.isActive && navigate(item.path)}
                  className={`${
                    item.isActive 
                      ? 'text-purple-700 font-semibold' 
                      : 'text-gray-600 hover:text-purple-600 transition-colors'
                  }`}
                >
                  {item.name}
                </button>
                {index < breadcrumb.length - 1 && (
                  <i className="fas fa-chevron-right text-gray-400 text-xs"></i>
                )}
              </div>
            ))}
          </nav>

          {/* Center Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <i className="fas fa-leaf text-white"></i>
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-700 to-blue-600 bg-clip-text text-transparent">
              ESG Portal
            </h1>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <button className="text-gray-500 hover:text-purple-600 transition-colors">
              <i className="fas fa-question-circle"></i>
            </button>
            <button className="text-gray-500 hover:text-purple-600 transition-colors relative">
              <i className="fas fa-bell"></i>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            </button>
            <div className="flex items-center space-x-2">
              {/* <img 
                src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg" 
                alt="User" 
                className="w-7 h-7 rounded-full ring-2 ring-purple-200"
              /> */}
              <div className="w-7 h-7 rounded-full ring-2 ring-purple-200 bg-purple-500"></div>
              <span className="text-sm font-medium text-gray-700">Sarah Johnson</span>
            </div>
          </div>
        </div>
      </div>

      {/* Module Status Bar - 120px height */}
      <div className="h-30 px-8 py-6 bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 text-white relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full -ml-36 -mb-36"></div>
        
        <div className="relative z-10 flex items-center justify-between h-full">
          {/* Left Section - 60% */}
          <div className="flex-1 pr-8">
            <div className="flex items-center space-x-6">
              {/* Module Number Circle - 48px */}
              <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border border-white/30 shadow-xl">
                <span className="text-xl font-bold text-white">{currentModule.id}</span>
              </div>
              
              {/* Module Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {currentModule.name}
                </h2>
                <p className="text-purple-100 text-sm leading-relaxed mb-3">
                  {currentModule.description}
                </p>
              </div>
            </div>
          </div>

          {/* Right Section - 40% */}
          <div className="flex items-center space-x-8">
            {/* Module Progress Bar */}
            <div className="w-80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-purple-200 font-medium">Module Progress</span>
                <span className="text-xs text-white font-semibold">{progress}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className="h-full bg-gradient-to-r from-white to-purple-200 rounded-full transition-all duration-700 ease-out shadow-sm"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

          </div>
        </div>

        {/* Interactive Navigation Dots */}
        <div className="absolute bottom-0 left-0 right-0 px-8 pb-4">
          <div className="flex items-center justify-center space-x-3">
            {[
              { id: 1, name: 'Company Info', path: '/' },
              { id: 2, name: 'Frameworks', path: '/rame' },
              { id: 3, name: 'Profiling', path: '/list' },
              { id: 4, name: 'Meters', path: '/meter' },
              { id: 5, name: 'Data Collection', path: '/data' },
              { id: 6, name: 'Dashboard', path: '/dashboard' }
            ].map((step, index) => {
              const isActive = location.pathname === step.path;
              
              return (
                <button
                  key={step.id}
                  onClick={() => navigate(step.path)}
                  className="relative group cursor-pointer transition-all duration-300 hover:scale-150"
                >
                  {/* Navigation Dot */}
                  <div className={`
                    w-2 h-2 rounded-full transition-all duration-300
                    ${isActive ? 'bg-white' : 'bg-white opacity-50'}
                  `} />
                  
                  {/* Hover Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 z-50">
                    <div className="px-3 py-2 bg-gray-900/90 text-white text-xs rounded-lg whitespace-nowrap shadow-lg backdrop-blur-sm">
                      {step.name}
                      
                      {/* Tooltip Arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900/90"></div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNavbar;