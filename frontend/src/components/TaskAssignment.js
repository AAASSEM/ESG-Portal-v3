import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, makeAuthenticatedRequest } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const TaskAssignment = () => {
  const { user, selectedCompany, userSites, hasPermission } = useAuth();
  const [dataElements, setDataElements] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'assigned', 'unassigned'
  const [showBulkAssign, setShowBulkAssign] = useState(false);

  useEffect(() => {
    if (selectedCompany && hasPermission('dataChecklist', 'assign')) {
      fetchData();
    }
  }, [selectedCompany]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDataElements(),
        fetchAssignments(),
        fetchUsers()
      ]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDataElements = async () => {
    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/companies/${selectedCompany.id}/data-elements/`
      );
      if (response.ok) {
        const data = await response.json();
        setDataElements(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch data elements:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/tasks/assignments/`
      );
      if (response.ok) {
        const data = await response.json();
        setAssignments(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/users/my-team/`
      );
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const getAssignmentForElement = (elementId, siteId) => {
    return assignments.find(a => a.data_element_id === elementId && a.site_id === siteId);
  };

  const handleAssignTask = async (elementId, siteId, userId) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/tasks/assign/`, {
        method: 'POST',
        body: JSON.stringify({
          data_element_id: elementId,
          site_id: siteId,
          assigned_to: userId
        })
      });

      if (response.ok) {
        fetchAssignments(); // Refresh assignments
      }
    } catch (error) {
      console.error('Failed to assign task:', error);
    }
  };

  const handleUnassignTask = async (assignmentId) => {
    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/tasks/assignments/${assignmentId}/`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        fetchAssignments(); // Refresh assignments
      }
    } catch (error) {
      console.error('Failed to unassign task:', error);
    }
  };

  const getStatusIcon = (assignment) => {
    if (!assignment) return <i className="fas fa-user-plus text-gray-400" title="Unassigned"></i>;
    
    const statusIcons = {
      pending: <i className="fas fa-clock text-yellow-500" title="Pending"></i>,
      in_progress: <i className="fas fa-play text-orange-500" title="In Progress"></i>,
      completed: <i className="fas fa-check text-green-500" title="Completed"></i>,
      overdue: <i className="fas fa-exclamation-triangle text-red-500" title="Overdue"></i>
    };
    
    return statusIcons[assignment.status] || statusIcons.pending;
  };

  const filteredDataElements = dataElements.filter(element => {
    if (viewMode === 'assigned') {
      return userSites.some(site => getAssignmentForElement(element.id, site.id));
    }
    if (viewMode === 'unassigned') {
      return userSites.some(site => !getAssignmentForElement(element.id, site.id));
    }
    return true;
  });

  const BulkAssignModal = ({ isOpen, onClose, onSuccess }) => {
    const [bulkData, setBulkData] = useState({
      assignTo: '',
      site: '',
      elements: [],
      action: 'assign' // 'assign' or 'copy'
    });

    const handleBulkAssign = async () => {
      try {
        const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/tasks/bulk-assign/`, {
          method: 'POST',
          body: JSON.stringify(bulkData)
        });

        if (response.ok) {
          onSuccess();
        }
      } catch (error) {
        console.error('Failed to bulk assign:', error);
      }
    };

    if (!isOpen) return null;

    const modalContent = (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100000]"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
      >
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Assignment</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Assign To</label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={bulkData.assignTo}
                  onChange={(e) => setBulkData({...bulkData, assignTo: e.target.value})}
                >
                  <option value="">Select User</option>
                  {users.filter(u => ['uploader', 'site_manager'].includes(u.role)).map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Site</label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={bulkData.site}
                  onChange={(e) => setBulkData({...bulkData, site: e.target.value})}
                >
                  <option value="">Select Site</option>
                  {userSites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Options</label>
              <div className="space-y-2">
                <button
                  type="button"
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50"
                  onClick={() => {
                    setBulkData({...bulkData, elements: dataElements.filter(e => e.category === 'Environmental').map(e => e.id)});
                  }}
                >
                  <div className="font-medium">Assign all Environmental tasks</div>
                  <div className="text-sm text-gray-500">All electricity, water, waste, and energy tasks</div>
                </button>
                
                <button
                  type="button"
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50"
                  onClick={() => {
                    setBulkData({...bulkData, elements: dataElements.filter(e => e.category === 'Social').map(e => e.id)});
                  }}
                >
                  <div className="font-medium">Assign all Social tasks</div>
                  <div className="text-sm text-gray-500">Employee training, community initiatives</div>
                </button>
                
                <button
                  type="button"
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50"
                  onClick={() => {
                    setBulkData({...bulkData, elements: dataElements.filter(e => e.is_metered).map(e => e.id)});
                  }}
                >
                  <div className="font-medium">Assign all metered tasks</div>
                  <div className="text-sm text-gray-500">Tasks requiring meter readings</div>
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkAssign}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Apply Assignment
              </button>
            </div>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  if (!hasPermission('dataChecklist', 'assign')) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">
          <i className="fas fa-lock text-4xl mb-4"></i>
          <p>You don't have permission to assign tasks.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading task assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Assignment</h1>
          <p className="text-gray-600">Assign data collection tasks to team members</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowBulkAssign(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
          >
            <i className="fas fa-layer-group mr-2"></i>
            Bulk Assign
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <select
          className="border border-gray-300 rounded-md px-3 py-2 bg-white"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
        >
          <option value="all">All Tasks</option>
          <option value="assigned">Assigned Tasks</option>
          <option value="unassigned">Unassigned Tasks</option>
        </select>

        <select
          className="border border-gray-300 rounded-md px-3 py-2 bg-white"
          value={selectedUser || ''}
          onChange={(e) => setSelectedUser(e.target.value || null)}
        >
          <option value="">All Users</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
          ))}
        </select>
      </div>

      {/* Assignment Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data Element
              </th>
              {userSites.map(site => (
                <th key={site.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {site.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDataElements.map((element) => (
              <tr key={element.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{element.name}</div>
                    <div className="text-sm text-gray-500">
                      {element.category} • {element.frequency}
                      {element.is_metered && <span className="ml-2 text-purple-600">📊 Metered</span>}
                    </div>
                  </div>
                </td>
                {userSites.map(site => {
                  const assignment = getAssignmentForElement(element.id, site.id);
                  return (
                    <td key={site.id} className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {getStatusIcon(assignment)}
                        {assignment ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {users.find(u => u.id === assignment.assigned_to)?.name || 'Unknown User'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(assignment.assigned_at).toLocaleDateString()}
                            </div>
                            <button
                              onClick={() => handleUnassignTask(assignment.id)}
                              className="text-xs text-red-600 hover:text-red-800 mt-1"
                            >
                              Unassign
                            </button>
                          </div>
                        ) : (
                          <select
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignTask(element.id, site.id, e.target.value);
                              }
                            }}
                          >
                            <option value="">Assign to...</option>
                            {users.filter(u => ['uploader', 'site_manager'].includes(u.role)).map(user => (
                              <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredDataElements.length === 0 && (
          <div className="text-center py-8">
            <i className="fas fa-tasks text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-500">No data elements found matching the selected filters.</p>
          </div>
        )}
      </div>

      {/* Assignment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">
            {dataElements.length}
          </div>
          <div className="text-sm text-gray-500">Total Tasks</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">
            {assignments.filter(a => a.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-orange-600">
            {assignments.filter(a => a.status === 'in_progress').length}
          </div>
          <div className="text-sm text-gray-500">In Progress</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-red-600">
            {assignments.filter(a => a.status === 'overdue').length}
          </div>
          <div className="text-sm text-gray-500">Overdue</div>
        </div>
      </div>

      {/* Bulk Assignment Modal */}
      <BulkAssignModal
        isOpen={showBulkAssign}
        onClose={() => setShowBulkAssign(false)}
        onSuccess={() => {
          setShowBulkAssign(false);
          fetchAssignments();
        }}
      />
    </div>
  );
};

export default TaskAssignment;