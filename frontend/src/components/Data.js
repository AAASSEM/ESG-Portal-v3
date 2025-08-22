import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Data = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(2025); // Use 2025 to match backend data
  const [selectedMonth, setSelectedMonth] = useState(8); // Use August to match current backend data
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState('All');
  const [groupBy, setGroupBy] = useState('Category');
  const [entryValues, setEntryValues] = useState({});
  const [entryFiles, setEntryFiles] = useState({});
  const [savingEntries, setSavingEntries] = useState({});
  const [autoSaveTimeouts, setAutoSaveTimeouts] = useState({});
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState([]);
  const [dataEntries, setDataEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [progressData, setProgressData] = useState({
    annual: { data_progress: 0, evidence_progress: 0, total_points: 0 },
    monthly: { data_progress: 0, evidence_progress: 0, items_remaining: 0 }
  });

  // Get current company ID (you may want to get this from context or props)
  const companyId = 1; // This should come from your auth context or route params

  // Format number with thousand separators
  const formatNumber = (value) => {
    if (!value) return value;
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // File matching logic - match files to data entries based on filename
  const matchFileToEntry = (filename, entries) => {
    const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Try to match by keywords in filename
    const matches = entries.filter(entry => {
      const entryName = entry.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const meterType = entry.meter_type ? entry.meter_type.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
      
      // Check if filename contains entry name keywords
      const nameWords = entryName.split(/\s+/).filter(word => word.length > 2);
      const typeWords = meterType.split(/\s+/).filter(word => word.length > 2);
      
      const matchesName = nameWords.some(word => cleanFilename.includes(word));
      const matchesType = typeWords.some(word => cleanFilename.includes(word));
      
      return matchesName || matchesType;
    });
    
    // Return best match (first match for now)
    return matches.length > 0 ? matches[0] : null;
  };

  // Handle multiple file upload
  const handleMultipleFileUpload = async (files) => {
    setIsUploading(true);
    const results = {
      successful: [],
      failed: [],
      unmatched: []
    };
    
    try {
      for (let file of files) {
        const matchedEntry = matchFileToEntry(file.name, dataEntries);
        
        if (matchedEntry) {
          try {
            const success = await saveDataEntry(matchedEntry.id, null, file);
            if (success) {
              results.successful.push({
                filename: file.name,
                entryName: matchedEntry.name,
                entryId: matchedEntry.id
              });
              
              // Update the entry in state
              setDataEntries(prev => 
                prev.map(entry => 
                  entry.id === matchedEntry.id 
                    ? { 
                        ...entry, 
                        status: entry.value ? 'complete' : 'partial',
                        evidence_file: URL.createObjectURL(file) // Temporary URL for display
                      } 
                    : entry
                )
              );
            } else {
              results.failed.push({
                filename: file.name,
                reason: 'Upload failed'
              });
            }
          } catch (error) {
            results.failed.push({
              filename: file.name,
              reason: error.message
            });
          }
        } else {
          results.unmatched.push(file.name);
        }
      }
      
      // Refresh progress after all uploads
      await refreshProgressData();
      setUploadResults(results);
      
    } catch (error) {
      console.error('Bulk upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // API functions
  const fetchAvailableMonths = async (year) => {
    try {
      const response = await fetch(`http://localhost:8000/api/data-collection/available_months/?year=${year}`);
      const data = await response.json();
      return data.months || [];
    } catch (error) {
      console.error('Error fetching available months:', error);
      return [];
    }
  };

  const fetchDataEntries = async (year, month) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/data-collection/tasks/?company_id=${companyId}&year=${year}&month=${month}`
      );
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching data entries:', error);
      return [];
    }
  };

  const fetchProgress = async (year, month = null) => {
    try {
      const url = month 
        ? `http://localhost:8000/api/data-collection/progress/?company_id=${companyId}&year=${year}&month=${month}`
        : `http://localhost:8000/api/data-collection/progress/?company_id=${companyId}&year=${year}`;
      
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching progress:', error);
      return { data_progress: 0, evidence_progress: 0 };
    }
  };

  const saveDataEntry = async (submissionId, value, file = null) => {
    try {
      const formData = new FormData();
      if (value) formData.append('value', value);
      if (file) formData.append('evidence_file', file);

      const response = await fetch(`http://localhost:8000/api/data-collection/${submissionId}/`, {
        method: 'PATCH',
        body: formData, // Use FormData for file uploads
      });
      return response.ok;
    } catch (error) {
      console.error('Error saving data entry:', error);
      return false;
    }
  };

  // Generate months based on current date and available data
  const generateMonthsData = async (availableMonths, currentYear, currentMonth, selectedMonth) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Get completion status for each available month
    const monthsWithStatus = await Promise.all(
      monthNames.map(async (name, index) => {
        const monthNum = index + 1;
        let status = 'upcoming';
        
        if (monthNum === selectedMonth) {
          status = 'selected';
        } else if (monthNum < currentMonth) {
          // Check if this past month is complete
          if (availableMonths.includes(monthNum)) {
            try {
              const progress = await fetchProgress(currentYear, monthNum);
              const isComplete = progress.items_remaining === 0;
              status = isComplete ? 'complete' : 'incomplete';
            } catch (error) {
              status = 'incomplete';
            }
          } else {
            status = 'upcoming';
          }
        } else if (monthNum === currentMonth) {
          status = 'current';
        } else if (monthNum > 11) { // Future months beyond reasonable planning
          status = 'disabled';
        }
        
        return {
          id: monthNum,
          name,
          status,
          available: availableMonths.includes(monthNum)
        };
      })
    );
    
    return monthsWithStatus;
  };

  const getMonthButtonStyle = (month) => {
    switch (month.status) {
      case 'complete':
        return 'bg-green-100 border border-green-300 text-green-700';
      case 'selected':
        return 'bg-blue-100 border-2 border-blue-500 text-blue-700';
      case 'current':
        return 'bg-blue-50 border border-blue-300 text-blue-600';
      case 'incomplete':
        return 'bg-orange-100 border border-orange-300 text-orange-700';
      case 'upcoming':
        return 'bg-gray-100 border border-gray-300 text-gray-700';
      case 'disabled':
        return 'bg-gray-200 border border-gray-400 text-gray-500 opacity-50 cursor-not-allowed';
      default:
        return 'bg-gray-100 border border-gray-300 text-gray-700';
    }
  };

  const getEntryStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'w-3 h-3 bg-green-500 rounded-full';
      case 'partial':
        return 'w-3 h-3 bg-orange-500 rounded-full';
      case 'missing':
        return 'w-3 h-3 bg-red-500 rounded-full';
      default:
        return 'w-3 h-3 bg-gray-500 rounded-full';
    }
  };


  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Load available months for current year
        const availableMonths = await fetchAvailableMonths(selectedYear);
        const currentDate = new Date();
        const monthsData = await generateMonthsData(availableMonths, selectedYear, currentDate.getMonth() + 1, selectedMonth);
        setMonths(monthsData);

        // Load progress data
        const annualProgress = await fetchProgress(selectedYear);
        const monthlyProgress = await fetchProgress(selectedYear, selectedMonth);
        
        setProgressData({
          annual: { 
            data_progress: annualProgress.data_progress || 0,
            evidence_progress: annualProgress.evidence_progress || 0,
            total_points: annualProgress.total_points || 0
          },
          monthly: { 
            data_progress: monthlyProgress.data_progress || 0,
            evidence_progress: monthlyProgress.evidence_progress || 0,
            items_remaining: monthlyProgress.items_remaining || 0
          }
        });

        // Load data entries for current month
        const entries = await fetchDataEntries(selectedYear, selectedMonth);
        console.log('Raw entries from API:', entries);
        const transformedEntries = entries.map(entry => ({
          id: entry.submission.id,
          name: entry.element_name,
          meter: entry.meter ? `${entry.meter.name} (${entry.meter.type})` : 'N/A',
          meter_id: entry.meter ? entry.meter.id : null,
          meter_type: entry.meter ? entry.meter.type : null,
          meter_location: entry.meter ? entry.meter.location : null,
          frequency: entry.cadence,
          value: entry.submission.value || '',
          unit: entry.element_unit || '',
          status: entry.submission.status || 'missing',
          category: entry.type,
          description: entry.element_description || '',
          evidence_file: entry.submission.evidence_file || null
        }));
        console.log('Transformed entries:', transformedEntries);
        setDataEntries(transformedEntries);

      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [selectedYear, selectedMonth]);

  // Update filtered entries when search, filter, or grouping changes
  useEffect(() => {
    const filtered = applyFiltersAndSearch(dataEntries);
    setFilteredEntries(filtered);
  }, [searchTerm, viewFilter, groupBy, dataEntries]);

  const handleValueChange = (entryId, value) => {
    setEntryValues(prev => ({
      ...prev,
      [entryId]: value
    }));
    
    // Clear existing timeout for this entry
    if (autoSaveTimeouts[entryId]) {
      clearTimeout(autoSaveTimeouts[entryId]);
    }
    
    // Set new timeout for auto-save (debounced)
    const timeoutId = setTimeout(() => {
      handleAutoSave(entryId, value, entryFiles[entryId]);
    }, 1500); // 1.5 second delay
    
    setAutoSaveTimeouts(prev => ({
      ...prev,
      [entryId]: timeoutId
    }));
  };

  const handleFileChange = (entryId, file) => {
    setEntryFiles(prev => ({
      ...prev,
      [entryId]: file
    }));
    
    // Auto-save immediately when file is uploaded
    handleAutoSave(entryId, entryValues[entryId], file);
  };

  const handleClearValue = async (entryId) => {
    // Clear from temporary state
    setEntryValues(prev => {
      const newValues = { ...prev };
      delete newValues[entryId];
      return newValues;
    });

    // Clear from backend by saving empty value
    setSavingEntries(prev => ({ ...prev, [entryId]: true }));
    
    try {
      const success = await saveDataEntry(entryId, '', null);
      if (success) {
        // Update the entry status and clear value
        setDataEntries(prev => 
          prev.map(entry => 
            entry.id === entryId 
              ? { 
                  ...entry, 
                  status: 'missing',
                  value: ''
                } 
              : entry
          )
        );
        
        // Refresh progress data
        await refreshProgressData();
      }
    } catch (error) {
      console.error('Error clearing value:', error);
    } finally {
      setSavingEntries(prev => ({ ...prev, [entryId]: false }));
    }
  };

  const handleClearFile = async (entryId) => {
    // Clear from temporary state
    setEntryFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[entryId];
      return newFiles;
    });

    // Clear from backend by saving without file
    setSavingEntries(prev => ({ ...prev, [entryId]: true }));
    
    try {
      // Send request to remove file (send null/empty for evidence_file)
      const formData = new FormData();
      formData.append('remove_evidence', 'true'); // Signal to remove file
      
      const response = await fetch(`http://localhost:8000/api/data-collection/${entryId}/`, {
        method: 'PATCH',
        body: formData,
      });
      
      if (response.ok) {
        // Update the entry status
        setDataEntries(prev => 
          prev.map(entry => 
            entry.id === entryId 
              ? { 
                  ...entry, 
                  status: entry.value ? 'partial' : 'missing',
                  evidence_file: null
                } 
              : entry
          )
        );
        
        // Refresh progress data
        await refreshProgressData();
      }
    } catch (error) {
      console.error('Error clearing file:', error);
    } finally {
      setSavingEntries(prev => ({ ...prev, [entryId]: false }));
    }
  };

  const handleAutoSave = async (entryId, value, file) => {
    // Skip if no value and no file
    if (!value && !file) return;
    
    // Skip if already saving this entry
    if (savingEntries[entryId]) return;

    setSavingEntries(prev => ({ ...prev, [entryId]: true }));
    
    try {
      const success = await saveDataEntry(entryId, value, file);
      if (success) {
        // Update the entry status and value
        setDataEntries(prev => 
          prev.map(entry => 
            entry.id === entryId 
              ? { 
                  ...entry, 
                  status: (value && file) ? 'complete' : 'partial',
                  value: value || entry.value 
                } 
              : entry
          )
        );
        
        // Clear the temporary values
        setEntryValues(prev => {
          const newValues = { ...prev };
          delete newValues[entryId];
          return newValues;
        });
        setEntryFiles(prev => {
          const newFiles = { ...prev };
          delete newFiles[entryId];
          return newFiles;
        });

        // Refresh progress data
        await refreshProgressData();
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setSavingEntries(prev => ({ ...prev, [entryId]: false }));
    }
  };

  // Filter and search function
  const applyFiltersAndSearch = (entries) => {
    let filtered = [...entries];

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(entry =>
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.meter.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply view filter
    if (viewFilter === 'Metered') {
      filtered = filtered.filter(entry => entry.meter_id !== null);
    } else if (viewFilter === 'Non-metered') {
      filtered = filtered.filter(entry => entry.meter_id === null);
    } else if (viewFilter === 'Missing') {
      filtered = filtered.filter(entry => entry.status === 'missing');
    } else if (viewFilter === 'Partial') {
      filtered = filtered.filter(entry => entry.status === 'partial');
    } else if (viewFilter === 'Complete') {
      filtered = filtered.filter(entry => entry.status === 'complete');
    }
    // 'All' shows everything

    return filtered;
  };

  // Group data function
  const groupData = (entries) => {
    if (groupBy === 'Category') {
      return entries.reduce((groups, entry) => {
        const category = entry.category || 'Other';
        if (!groups[category]) groups[category] = [];
        groups[category].push(entry);
        return groups;
      }, {});
    } else if (groupBy === 'Frequency') {
      return entries.reduce((groups, entry) => {
        const frequency = entry.frequency || 'Unknown';
        if (!groups[frequency]) groups[frequency] = [];
        groups[frequency].push(entry);
        return groups;
      }, {});
    } else if (groupBy === 'Status') {
      return entries.reduce((groups, entry) => {
        const status = entry.status || 'missing';
        const statusLabel = status === 'complete' ? 'Complete' : 
                           status === 'partial' ? 'Partial' : 'Missing';
        if (!groups[statusLabel]) groups[statusLabel] = [];
        groups[statusLabel].push(entry);
        return groups;
      }, {});
    }
    return { 'All Items': entries };
  };

  const refreshProgressData = async () => {
    try {
      const annualProgress = await fetchProgress(selectedYear);
      const monthlyProgress = await fetchProgress(selectedYear, selectedMonth);
      
      setProgressData({
        annual: { 
          data_progress: annualProgress.data_progress || 0,
          evidence_progress: annualProgress.evidence_progress || 0,
          total_points: annualProgress.total_points || 0
        },
        monthly: { 
          data_progress: monthlyProgress.data_progress || 0,
          evidence_progress: monthlyProgress.evidence_progress || 0,
          items_remaining: monthlyProgress.items_remaining || 0
        }
      });

      // Update month statuses when progress changes
      const availableMonths = await fetchAvailableMonths(selectedYear);
      const currentDate = new Date();
      const monthsData = await generateMonthsData(availableMonths, selectedYear, currentDate.getMonth() + 1, selectedMonth);
      setMonths(monthsData);
    } catch (error) {
      console.error('Error refreshing progress data:', error);
    }
  };

  const handleSaveEntry = async (entryId) => {
    const value = entryValues[entryId];
    const file = entryFiles[entryId];
    
    if (!value && !file) {
      alert('Please enter a value or upload a file before saving.');
      return;
    }

    setSavingEntries(prev => ({ ...prev, [entryId]: true }));
    
    try {
      const success = await saveDataEntry(entryId, value, file);
      if (success) {
        // Update the entry status and value
        setDataEntries(prev => 
          prev.map(entry => 
            entry.id === entryId 
              ? { 
                  ...entry, 
                  status: (value && file) ? 'complete' : 'partial',
                  value: value || entry.value 
                } 
              : entry
          )
        );
        
        // Clear the temporary values
        setEntryValues(prev => {
          const newValues = { ...prev };
          delete newValues[entryId];
          return newValues;
        });
        setEntryFiles(prev => {
          const newFiles = { ...prev };
          delete newFiles[entryId];
          return newFiles;
        });

        // Refresh progress data
        await refreshProgressData();
        
        alert('Data saved successfully!');
      } else {
        alert('Failed to save data. Please try again.');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('An error occurred while saving. Please try again.');
    } finally {
      setSavingEntries(prev => ({ ...prev, [entryId]: false }));
    }
  };

  const handleMonthSelect = async (monthId) => {
    if (monthId !== selectedMonth) {
      setSelectedMonth(monthId);
      setLoading(true);
      
      try {
        // Update months with new selected month
        const availableMonths = await fetchAvailableMonths(selectedYear);
        const currentDate = new Date();
        const monthsData = await generateMonthsData(availableMonths, selectedYear, currentDate.getMonth() + 1, monthId);
        setMonths(monthsData);

        // Reload data entries for new month
        const entries = await fetchDataEntries(selectedYear, monthId);
        const transformedEntries = entries.map(entry => ({
          id: entry.submission.id,
          name: entry.element_name,
          meter: entry.meter ? `${entry.meter.name} (${entry.meter.type})` : 'N/A',
          meter_id: entry.meter ? entry.meter.id : null,
          meter_type: entry.meter ? entry.meter.type : null,
          meter_location: entry.meter ? entry.meter.location : null,
          frequency: entry.cadence,
          value: entry.submission.value || '',
          unit: entry.element_unit || '',
          status: entry.submission.status || 'missing',
          category: entry.type,
          description: entry.element_description || '',
          evidence_file: entry.submission.evidence_file || null
        }));
        setDataEntries(transformedEntries);

        // Update monthly progress
        const monthlyProgress = await fetchProgress(selectedYear, monthId);
        setProgressData(prev => ({
          ...prev,
          monthly: { 
            data_progress: monthlyProgress.data_progress || 0,
            evidence_progress: monthlyProgress.evidence_progress || 0,
            items_remaining: monthlyProgress.items_remaining || 0
          }
        }));
      } catch (error) {
        console.error('Error loading month data:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading data collection interface...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">

      {/* Reporting Period Selector */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Reporting Period</h3>
        <div className="flex items-center space-x-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select 
              className="border border-gray-300 rounded-lg px-4 py-2 w-32"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
              <option value={2023}>2023</option>
              <option value={2022}>2022</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <div className="grid grid-cols-6 gap-2">
              {months.map((month) => (
                <button 
                  key={month.id}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${getMonthButtonStyle(month)}`}
                  onClick={() => month.status !== 'disabled' && handleMonthSelect(month.id)}
                  disabled={month.status === 'disabled'}
                >
                  {month.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Annual Progress ({selectedYear})</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Data Entry Progress</span>
                <span className="text-sm font-bold text-blue-600">{Math.round(progressData.annual.data_progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${progressData.annual.data_progress}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Evidence Upload</span>
                <span className="text-sm font-bold text-green-600">{Math.round(progressData.annual.evidence_progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: `${progressData.annual.evidence_progress}%` }}></div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{progressData.annual.total_points}</div>
              <div className="text-sm text-gray-500">Total Data Points YTD</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {months.find(m => m.id === selectedMonth)?.name} {selectedYear} Progress
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Data Entry Progress</span>
                <span className="text-sm font-bold text-orange-600">{Math.round(progressData.monthly.data_progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-orange-500 h-3 rounded-full" style={{ width: `${progressData.monthly.data_progress}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Evidence Upload</span>
                <span className="text-sm font-bold text-purple-600">{Math.round(progressData.monthly.evidence_progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-purple-500 h-3 rounded-full" style={{ width: `${progressData.monthly.evidence_progress}%` }}></div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{progressData.monthly.items_remaining}</div>
              <div className="text-sm text-gray-500">Items Remaining</div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Entry Interface */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Data Entry Interface</h3>
            <div className="flex space-x-3">
              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => handleMultipleFileUpload(Array.from(e.target.files))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="multiple-file-upload"
                />
                <button 
                  className={`bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isUploading}
                >
                  <i className={`fas ${isUploading ? 'fa-spinner fa-spin' : 'fa-upload'} mr-2`}></i>
                  {isUploading ? 'Uploading...' : 'Upload Multiple Files'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">View by:</label>
              <select 
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
                value={viewFilter}
                onChange={(e) => setViewFilter(e.target.value)}
              >
                <option>All Items</option>
                <option>Metered</option>
                <option>Non-metered</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Group by:</label>
              <select 
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option>Category</option>
                <option>Frequency</option>
                <option>Status</option>
              </select>
            </div>
            <div className="flex-1">
              <input 
                type="text" 
                placeholder="Search data elements..." 
                className="w-full border border-gray-300 rounded-lg px-3 py-1 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {dataEntries.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-gauge text-gray-400 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No data entries found</h3>
              <p className="text-gray-600 mb-4">
                Data entries are generated based on your configured meters and checklist requirements.
              </p>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={() => navigate('/meter')}
              >
                <i className="fas fa-cog mr-2"></i>Configure Meters
              </button>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-search text-gray-400 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matching entries found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search terms or filters to find data entries.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {(() => {
                const groupedData = groupData(filteredEntries);
                return Object.entries(groupedData).map(([groupName, entries]) => (
                  <div key={groupName}>
                    {Object.keys(groupedData).length > 1 && (
                      <div className="flex items-center mb-4">
                        <h4 className="text-lg font-semibold text-gray-800 mr-3">{groupName}</h4>
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="ml-3 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {entries.length} {entries.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    )}
                    <div className="space-y-4">
                      {entries.map((entry) => (
                        <div key={entry.id} className={`rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${
                          entry.status === 'complete' ? 'bg-green-50 border border-green-200' :
                          entry.status === 'partial' ? 'bg-orange-50 border border-orange-200' :
                          entry.status === 'missing' ? 'bg-red-50 border border-red-200' :
                          'bg-gray-50 border border-gray-200'
                        }`}>
                          {/* Card Header */}
                          <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <div className="flex items-center space-x-3">
                              <div className={getEntryStatusColor(entry.status)}></div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{entry.name}</h4>
                                <div className="flex items-center space-x-2 mt-1">
                                  {entry.meter_id && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                      {entry.meter_type}
                                    </span>
                                  )}
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                                    {entry.frequency}
                                  </span>
                                  {entry.meter_location && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                                      {entry.meter_location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {savingEntries[entry.id] ? (
                                <div className="flex items-center text-sm text-blue-600">
                                  <i className="fas fa-spinner fa-spin mr-2"></i>
                                  <span className="text-xs">Auto-saving...</span>
                                </div>
                              ) : entry.status === 'complete' ? (
                                <div className="flex items-center text-sm text-green-600">
                                  <i className="fas fa-check mr-1"></i>
                                  <span className="text-xs">Complete</span>
                                </div>
                              ) : entry.status === 'partial' ? (
                                <div className="flex items-center text-sm text-orange-600">
                                  <i className="fas fa-clock mr-1"></i>
                                  <span className="text-xs">Partial</span>
                                </div>
                              ) : (
                                <div className="flex items-center text-sm text-gray-500">
                                  <i className="fas fa-circle mr-1"></i>
                                  <span className="text-xs">Missing</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Card Content */}
                          <div className="flex">
                            {/* Left Side: Data Input (50%) */}
                            <div className="flex-1 p-4 pr-2" style={{width: '50%'}}>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-2 mb-2">
                                  <i className="fas fa-chart-line text-blue-500 text-sm"></i>
                                  <span className="text-sm font-medium text-gray-700">Data Entry</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <div className="relative flex-1">
                                    <input 
                                      type="number" 
                                      value={entryValues[entry.id] !== undefined ? entryValues[entry.id] : entry.value || ''}
                                      onChange={(e) => handleValueChange(entry.id, e.target.value)}
                                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-lg font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                      placeholder="0"
                                    />
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-500 bg-white px-2 rounded">
                                      {entry.unit}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Right Side: Evidence Upload (50%) */}
                            <div className="w-px bg-gray-200"></div>
                            <div className="p-4 pl-2" style={{width: '50%'}}>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <i className="fas fa-paperclip text-purple-500 text-sm"></i>
                                    <span className="text-sm font-medium text-gray-700">Evidence</span>
                                  </div>
                                  {entry.evidence_file && (
                                    <button 
                                      onClick={() => handleClearFile(entry.id)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded text-xs"
                                      title="Remove file"
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  )}
                                </div>
                                <div className="relative">
                                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200 cursor-pointer">
                                    <input 
                                      type="file" 
                                      onChange={(e) => handleFileChange(entry.id, e.target.files[0])}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                    />
                                    {entry.evidence_file ? (
                                      <div className="space-y-2">
                                        <i className="fas fa-file-alt text-green-500 text-lg"></i>
                                        <div className="text-xs text-gray-600 truncate">
                                          {entry.evidence_file.split('/').pop()}
                                        </div>
                                        <div className="text-xs text-green-600 font-medium">
                                          File uploaded
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <i className="fas fa-upload text-gray-400 text-lg"></i>
                                        <div className="text-xs text-gray-500">
                                          Drop file or click
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>


      {/* Action Footer */}
      <div className="flex items-center justify-between bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <button 
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            onClick={() => navigate('/meter')}
          >
            <i className="fas fa-arrow-left mr-2"></i>Back
          </button>
        </div>
        <div className="flex space-x-4">
          <button 
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:shadow-lg font-medium"
            onClick={handleContinue}
          >
            Complete Setup
            <i className="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>

      {/* Upload Results Modal */}
      {uploadResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Results</h3>
              <button 
                onClick={() => setUploadResults(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              {uploadResults.successful.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-600 mb-2">
                    ✅ Successfully Uploaded ({uploadResults.successful.length})
                  </h4>
                  <div className="space-y-1">
                    {uploadResults.successful.map((item, index) => (
                      <div key={index} className="text-xs text-gray-600 bg-green-50 p-2 rounded">
                        <div className="font-medium">{item.filename}</div>
                        <div>→ {item.entryName}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {uploadResults.unmatched.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-yellow-600 mb-2">
                    ⚠️ No Match Found ({uploadResults.unmatched.length})
                  </h4>
                  <div className="space-y-1">
                    {uploadResults.unmatched.map((filename, index) => (
                      <div key={index} className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                        {filename}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {uploadResults.failed.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-600 mb-2">
                    ❌ Failed Uploads ({uploadResults.failed.length})
                  </h4>
                  <div className="space-y-1">
                    {uploadResults.failed.map((item, index) => (
                      <div key={index} className="text-xs text-gray-600 bg-red-50 p-2 rounded">
                        <div className="font-medium">{item.filename}</div>
                        <div>Error: {item.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setUploadResults(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Data;