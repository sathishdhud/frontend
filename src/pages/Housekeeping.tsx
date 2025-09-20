import React, { useState, useEffect } from 'react';
import { 
  HomeIcon, 
  UserGroupIcon, 
  KeyIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { housekeepingApi, roomApi } from '../services/api';
import { HousekeepingTask, HousekeepingStats, Room } from '../types/api';
import Layout from '../components/Layout/Layout';

const Housekeeping: React.FC = () => {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<HousekeepingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 4;
  
  // Form states
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<HousekeepingTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    roomId: '',
    status: 'VR',
    assignedTo: '',
    notes: ''
  });
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [tasksRes, roomsRes, statsRes] = await Promise.all([
        housekeepingApi.getTasks(),
        roomApi.getRooms(),
        housekeepingApi.getStatistics()
      ]);

      if (tasksRes.data.success) {
        setTasks(tasksRes.data.data);
      }
      
      if (roomsRes.data.success) setRooms(roomsRes.data.data);
      if (statsRes.data.success) setStats(statsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      alert('Failed to fetch housekeeping data. Please try again.');
    } finally {
      setLoading(false);
      // Reset to first page when data is refreshed
      setCurrentPage(1);
    }
  };

  const handleTaskFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingTask) {
        // Validate task ID
        const taskId = editingTask.taskId;
        if (!taskId || taskId <= 0) {
          alert('Invalid task ID. Please try again.');
          setLoading(false);
          return;
        }
        
        const taskData = {
          roomId: taskForm.roomId,
          status: taskForm.status,
          assignedTo: taskForm.assignedTo || '',
          notes: taskForm.notes || ''
        };
        
        const response = await housekeepingApi.updateTask(taskId, taskData);
        if (response.data.success) {
          // Refresh all data to ensure consistency
          await fetchAllData();
          alert('Task updated successfully!');
        } else {
          throw new Error(response.data.message || 'Failed to update task');
        }
      } else {
        // For new tasks, ensure we're sending the correct data structure
        const taskData = {
          roomId: taskForm.roomId,
          status: taskForm.status,
          assignedTo: taskForm.assignedTo || '',
          notes: taskForm.notes || ''
        };
        
        const response = await housekeepingApi.createTask(taskData);
        if (response.data.success) {
          // Refresh all data to ensure the new task is properly displayed with all information
          await fetchAllData();
          alert('Task created successfully!');
        } else {
          throw new Error(response.data.message || 'Failed to create task');
        }
      }
      
      // Reset form
      setTaskForm({
        roomId: '',
        status: 'VR',
        assignedTo: '',
        notes: ''
      });
      setEditingTask(null);
      setShowTaskForm(false);
    } catch (error: any) {
      console.error('Task submission error:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to save task'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTask = (task: HousekeepingTask) => {
    // Validate task ID
    const taskId = task.taskId;
    if (!taskId || taskId <= 0) {
      alert('Cannot edit this task: Invalid task ID.');
      return;
    }
    
    setEditingTask(task);
    setTaskForm({
      roomId: task.roomId,
      status: task.status,
      assignedTo: task.assignedTo || '',
      notes: task.notes || ''
    });
    setShowTaskForm(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete || taskToDelete <= 0) {
      alert('Invalid task ID for deletion.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await housekeepingApi.deleteTask(taskToDelete);
      if (response.data.success) {
        // Refresh all data to ensure consistency
        await fetchAllData();
        alert('Task deleted successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to delete task');
      }
    } catch (error: any) {
      console.error('Delete task error:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to delete task'}`);
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setTaskToDelete(null);
    }
  };

  const handleUpdateRoomStatus = async (roomId: string, status: string) => {
    // Check if roomId is valid before making the API call
    if (!roomId || roomId === 'undefined') {
      alert('Invalid room ID. Please try again.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await housekeepingApi.updateRoomStatus(roomId, status);
      if (response.data.success) {
        // Update room in the rooms list
        setRooms(rooms.map(room => 
          room.roomId === roomId ? { ...room, status: status as 'VR' | 'OD' | 'OI' | 'Blocked' } : room
        ));
        // Refresh tasks and stats
        await fetchAllData();
        alert('Room status updated successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to update room status');
      }
    } catch (error: any) {
      console.error('Update room status error:', error);
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to update room status'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VR': return 'bg-green-100 text-green-800 border-green-200';
      case 'OD': return 'bg-red-100 text-red-800 border-red-200';
      case 'OI': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Blocked': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'VR': return 'Vacant Ready';
      case 'OD': return 'Occupied Dirty';
      case 'OI': return 'Occupied In-house';
      case 'Blocked': return 'Blocked';
      default: return status;
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (selectedStatus !== 'all' && task.status !== selectedStatus) return false;
    if (selectedRoom !== 'all' && task.roomId !== selectedRoom) return false;
    return true;
  });

  // Calculate pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredTasks.length / recordsPerPage);

  if (loading && tasks.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Housekeeping Management</h1>
          <button
            onClick={fetchAllData}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            <ArrowPathIcon className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Operations Section - Added Below Housekeeping */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Operations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all">
              <span className="text-lg font-semibold">Night Audit</span>
              <span className="text-sm opacity-90">End of day operations</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all">
              <span className="text-lg font-semibold">Shift Close</span>
              <span className="text-sm opacity-90">Close current shift</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all">
              <span className="text-lg font-semibold">Day Close</span>
              <span className="text-sm opacity-90">Close business day</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Total Rooms</p>
                  <p className="text-lg font-bold text-gray-900">{stats.totalRooms}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <HomeIcon className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Occupied</p>
                  <p className="text-lg font-bold text-red-600">{stats.occupiedRooms}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <UserGroupIcon className="w-4 h-4 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Vacant</p>
                  <p className="text-lg font-bold text-green-600">{stats.availableRooms}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <KeyIcon className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Blocked</p>
                  <p className="text-lg font-bold text-gray-600">{stats.blockedRooms}</p>
                </div>
                <div className="p-2 bg-gray-100 rounded-lg">
                  <ExclamationTriangleIcon className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Out of Order</p>
                  <p className="text-lg font-bold text-purple-600">{stats.outOfOrderRooms}</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ExclamationTriangleIcon className="w-4 h-4 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Actions */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1); // Reset to first page when filter changes
                  }}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="VR">Vacant Ready</option>
                  <option value="OD">Occupied Dirty</option>
                  <option value="OI">Occupied In-house</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Room</label>
                <select
                  value={selectedRoom}
                  onChange={(e) => {
                    setSelectedRoom(e.target.value);
                    setCurrentPage(1); // Reset to first page when filter changes
                  }}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Rooms</option>
                  {rooms.map(room => (
                    <option key={room.roomId} value={room.roomId}>
                      Room {room.roomNo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <button
              onClick={() => {
                setEditingTask(null);
                setTaskForm({
                  roomId: '',
                  status: 'VR',
                  assignedTo: '',
                  notes: ''
                });
                setShowTaskForm(true);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm rounded-md hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              <PlusIcon className="w-3 h-3" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* Task Form Modal */}
        {showTaskForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-sm">
              <h2 className="text-lg font-bold mb-3">
                {editingTask ? 'Edit Housekeeping Task' : 'Create Housekeeping Task'}
              </h2>
              <form onSubmit={handleTaskFormSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Room <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={taskForm.roomId}
                    onChange={(e) => setTaskForm({...taskForm, roomId: e.target.value})}
                    required
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a room</option>
                    {rooms.map(room => (
                      <option key={room.roomId} value={room.roomId}>
                        Room {room.roomNo} - {room.roomTypeName || 'Standard'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({...taskForm, status: e.target.value})}
                    required
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="VR">Vacant Ready</option>
                    <option value="OD">Occupied Dirty</option>
                    <option value="OI">Occupied In-house</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Assigned To
                  </label>
                  <input
                    type="text"
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({...taskForm, assignedTo: e.target.value})}
                    placeholder="Housekeeper name or ID"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={taskForm.notes}
                    onChange={(e) => setTaskForm({...taskForm, notes: e.target.value})}
                    placeholder="Special instructions or notes"
                    rows={2}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTaskForm(false);
                      setEditingTask(null);
                    }}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all"
                  >
                    {loading ? 'Saving...' : (editingTask ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tasks Table - Updated to match the image style */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Housekeeping Tasks</h2>
              </div>
              <button
                onClick={fetchAllData}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                <ArrowPathIcon className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guest Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Folio No
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentTasks.length > 0 ? (
                  currentTasks.map((task) => (
                    <tr key={task.taskId || `task-${task.roomId}-${task.status}-${Math.random()}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          Room {task.roomNo || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Floor {task.floor || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusText(task.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {task.guestName || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {task.folioNo || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit Task"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            // Validate task ID before setting it for deletion
                            const taskId = task.taskId;
                            if (taskId && taskId > 0) {
                              setTaskToDelete(taskId);
                              setShowDeleteModal(true);
                            } else {
                              alert('Cannot delete this task: Invalid task ID.');
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Task"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                      No housekeeping tasks found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {filteredTasks.length > recordsPerPage && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="text-xs text-gray-700">
                Showing {Math.min(indexOfFirstRecord + 1, filteredTasks.length)} to {Math.min(indexOfLastRecord, filteredTasks.length)} of {filteredTasks.length} tasks
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let startPage = Math.max(1, currentPage - 2);
                  let endPage = Math.min(totalPages, startPage + 4);
                  
                  if (endPage - startPage < 4) {
                    startPage = Math.max(1, endPage - 4);
                  }
                  
                  const pageNum = startPage + i;
                  if (pageNum > endPage) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Room Status Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Room Status Management</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
            {rooms.map((room) => (
              <div key={room.roomId} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Room {room.roomNo}</h3>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(room.status)}`}>
                    {getStatusText(room.status)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <select
                    value={room.status}
                    onChange={(e) => handleUpdateRoomStatus(room.roomId, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs"
                  >
                    <option value="VR">Vacant Ready</option>
                    <option value="OD">Occupied Dirty</option>
                    <option value="OI">Occupied In-house</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-xs">
              <h2 className="text-lg font-bold mb-2">Confirm Deletion</h2>
              <p className="text-gray-600 text-sm mb-4">
                Are you sure you want to delete this housekeeping task? This action cannot be undone.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTaskToDelete(null);
                  }}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTask}
                  disabled={loading}
                  className="flex-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Housekeeping;