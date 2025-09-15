import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DynamicFormField = ({ element, companyId, onValueChange, onCarbonCalculate }) => {
  const [value, setValue] = useState('');
  const [file, setFile] = useState(null);
  const [carbonEmissions, setCarbonEmissions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [evidenceReqs, setEvidenceReqs] = useState([]);

  // Fetch evidence requirements when component mounts
  useEffect(() => {
    const fetchEvidenceRequirements = async () => {
      if (element.evidence_requirements?.length > 0) {
        try {
          const response = await axios.get(
            `/api/framework-elements/${element.element_id}/evidence_requirements/?company_id=${companyId}`
          );
          setEvidenceReqs(response.data.evidence_requirements || []);
        } catch (error) {
          console.error('Error fetching evidence requirements:', error);
        }
      }
    };

    fetchEvidenceRequirements();
  }, [element.element_id, companyId]);

  const handleValueChange = async (newValue) => {
    setValue(newValue);
    onValueChange(element.element_id, newValue, file);

    // Auto-calculate carbon emissions if specifications exist
    if (element.carbon_specifications && newValue && !isNaN(newValue)) {
      setLoading(true);
      try {
        const response = await axios.post(
          `/api/framework-elements/${element.element_id}/calculate_carbon/`,
          {
            value: parseFloat(newValue),
            company_id: companyId,
            period: 'monthly'
          }
        );

        if (response.data.carbon_emissions !== undefined) {
          setCarbonEmissions(response.data);
          onCarbonCalculate && onCarbonCalculate(element.element_id, response.data);
        }
      } catch (error) {
        console.error('Error calculating carbon emissions:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFileChange = (newFile) => {
    setFile(newFile);
    onValueChange(element.element_id, value, newFile);
  };

  const getInputType = () => {
    if (element.unit?.toLowerCase().includes('currency') || element.unit?.toLowerCase().includes('aed')) {
      return 'number';
    }
    if (element.unit && ['kwh', 'liters', 'kg', 'tonnes', 'meters', 'units'].some(unit =>
      element.unit.toLowerCase().includes(unit))) {
      return 'number';
    }
    return 'text';
  };

  const formatUnit = (unit) => {
    if (!unit) return '';
    // Convert common units to readable format
    const unitMap = {
      'kwh': 'kWh',
      'co2e': 'CO₂e',
      'aed': 'AED',
      'm3': 'm³',
      'm2': 'm²'
    };
    return unitMap[unit.toLowerCase()] || unit;
  };

  return (
    <div className="dynamic-form-field p-4 border rounded-lg mb-4 bg-white shadow-sm">
      {/* Element Header */}
      <div className="mb-3">
        <h4 className="text-lg font-semibold text-gray-800">
          {element.name_plain}
        </h4>
        <p className="text-sm text-gray-600 mt-1">
          {element.description}
        </p>
        {element.official_code && (
          <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
            {element.official_code}
          </span>
        )}
      </div>

      {/* Main Input */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {element.prompt}
          {element.unit && (
            <span className="text-gray-500 ml-1">
              ({formatUnit(element.unit)})
            </span>
          )}
        </label>

        <input
          type={getInputType()}
          value={value}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder={`Enter value${element.unit ? ` in ${formatUnit(element.unit)}` : ''}`}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          step={getInputType() === 'number' ? 'any' : undefined}
        />
      </div>

      {/* Carbon Emissions Display */}
      {carbonEmissions && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-800">
              Carbon Footprint:
            </span>
            <span className="text-lg font-semibold text-green-900">
              {carbonEmissions.carbon_emissions?.toFixed(2)} {carbonEmissions.unit}
            </span>
          </div>
          {carbonEmissions.scope && (
            <div className="text-xs text-green-700 mt-1">
              Scope: {carbonEmissions.scope}
            </div>
          )}
          {loading && (
            <div className="text-xs text-gray-500 mt-1">
              Calculating...
            </div>
          )}
        </div>
      )}

      {/* File Upload for Evidence */}
      {(evidenceReqs.length > 0 || element.evidence_requirements?.length > 0) && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Evidence Required:
          </label>
          <div className="text-xs text-gray-600 mb-2">
            {evidenceReqs.length > 0 ? (
              <ul className="list-disc list-inside">
                {evidenceReqs.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            ) : (
              <span>Supporting documentation required</span>
            )}
          </div>
          <input
            type="file"
            onChange={(e) => handleFileChange(e.target.files[0])}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"
          />
        </div>
      )}

      {/* Framework and Category Tags */}
      <div className="flex flex-wrap gap-2 mt-3">
        {element.framework_id && (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
            {element.framework_id}
          </span>
        )}
        {element.category && (
          <span className={`px-2 py-1 text-xs rounded ${
            element.category === 'E' ? 'bg-green-100 text-green-800' :
            element.category === 'S' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {element.category === 'E' ? 'Environmental' :
             element.category === 'S' ? 'Social' : 'Governance'}
          </span>
        )}
        {element.type && (
          <span className={`px-2 py-1 text-xs rounded ${
            element.type === 'must-have' ? 'bg-red-100 text-red-800' :
            'bg-orange-100 text-orange-800'
          }`}>
            {element.type === 'must-have' ? 'Mandatory' : 'Conditional'}
          </span>
        )}
        {element.cadence && (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
            {element.cadence}
          </span>
        )}
      </div>

      {/* Metered Indicator */}
      {element.metered && (
        <div className="mt-2 text-xs text-blue-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h2zM8 5a1 1 0 011-1h2a1 1 0 011 1v1H8V5zM9 12a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
          </svg>
          Meter reading recommended
        </div>
      )}
    </div>
  );
};

export default DynamicFormField;