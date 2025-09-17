import React from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardTest = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard Test</h1>
      <p className="text-gray-600 mb-4">This is a minimal test version to verify the dashboard can render.</p>
      
      <button
        onClick={() => navigate('/')}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Back to Main
      </button>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Test Card 1</h3>
          <p className="text-2xl font-bold text-blue-600">123</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Test Card 2</h3>
          <p className="text-2xl font-bold text-green-600">456</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Test Card 3</h3>
          <p className="text-2xl font-bold text-purple-600">789</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Test Card 4</h3>
          <p className="text-2xl font-bold text-orange-600">101</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardTest;