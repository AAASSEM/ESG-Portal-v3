import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TopNavbar from './components/TopNavbar';
import Onboard from './components/Onboard';
import Rame from './components/Rame';
import List from './components/List';
import Meter from './components/Meter';
import Data from './components/Data';
import Dashboard from './components/Dashboard';
import DashboardTest from './components/DashboardTest';
import DashboardSimple from './components/DashboardSimple';
import './App.css';

console.log('App.js loaded');

function App() {
  console.log('App component rendering');
  
  // Test WITH TopNavbar now
  return (
    <Router>
      <div className="App min-h-screen bg-gray-50">
        <TopNavbar />
        <div className="container mx-auto p-8">
          <Routes>
            <Route path="/" element={<Onboard />} />
            <Route path="/onboard" element={<Onboard />} />
            <Route path="/rame" element={<Rame />} />
            <Route path="/list" element={<List />} />
            <Route path="/meter" element={<Meter />} />
            <Route path="/data" element={<Data />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard-test" element={<DashboardTest />} />
            <Route path="/dashboard-full" element={<Dashboard />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;