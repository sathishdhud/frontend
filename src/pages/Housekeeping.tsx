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
import { housekeepingApi, roomApi, operationsApi } from '../services/api';
import { HousekeepingTask, HousekeepingStats, Room } from '../types/api';
import Layout from '../components/Layout/Layout';
import Modal from '../components/Modal';

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
  
  // Night Audit states
  const [showNightAuditModal, setShowNightAuditModal] = useState(false);
  const [nightAuditConfirmation, setNightAuditConfirmation] = useState('');
  
  // Shift Close states
  const [showShiftCloseModal, setShowShiftCloseModal] = useState(false);
  const [shiftCloseData, setShiftCloseData] = useState({
    openingBalance: 0,
    totalIncome: 0,
    totalExpense: 0
  });
  const [shiftCloseBalance, setShiftCloseBalance] = useState(0);

  // New modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [modalAction, setModalAction] = useState<(() => void) | null>(null);
  const [showConfirmButton, setShowConfirmButton] = useState(true);
  const [showCancelButton, setShowCancelButton] = useState(true);
  const [confirmText, setConfirmText] = useState('Confirm');
  const [cancelText, setCancelText] = useState('Cancel');

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
          setModalTitle("Validation Error");
          setModalMessage("Invalid task ID. Please try again.");
          setModalType('error');
          setModalOpen(true);
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
          setModalTitle("Task Updated");
          setModalMessage("Task updated successfully!");
          setModalType('success');
          setModalOpen(true);
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
          setModalTitle("Task Created");
          setModalMessage("Task created successfully!");
          setModalType('success');
          setModalOpen(true);
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
      setModalTitle("Error");
      setModalMessage(`Error: ${error.response?.data?.message || error.message || 'Failed to save task'}`);
      setModalType('error');
      setModalOpen(true);
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
      setModalTitle("Validation Error");
      setModalMessage("Invalid task ID for deletion.");
      setModalType('error');
      setModalOpen(true);
      return;
    }
    
    setLoading(true);
    try {
      const response = await housekeepingApi.deleteTask(taskToDelete);
      if (response.data.success) {
        // Refresh all data to ensure consistency
        await fetchAllData();
        setModalTitle("Task Deleted");
        setModalMessage("Task deleted successfully!");
        setModalType('success');
        setModalOpen(true);
      } else {
        throw new Error(response.data.message || 'Failed to delete task');
      }
    } catch (error: any) {
      console.error('Delete task error:', error);
      setModalTitle("Error");
      setModalMessage(`Error: ${error.response?.data?.message || error.message || 'Failed to delete task'}`);
      setModalType('error');
      setModalOpen(true);
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setTaskToDelete(null);
    }
  };

  const handleUpdateRoomStatus = async (roomId: string, status: string) => {
    // Check if roomId is valid before making the API call
    if (!roomId || roomId === 'undefined') {
      setModalTitle("Validation Error");
      setModalMessage("Invalid room ID. Please try again.");
      setModalType('error');
      setModalOpen(true);
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
        setModalTitle("Status Updated");
        setModalMessage("Room status updated successfully!");
        setModalType('success');
        setModalOpen(true);
      } else {
        throw new Error(response.data.message || 'Failed to update room status');
      }
    } catch (error: any) {
      console.error('Update room status error:', error);
      setModalTitle("Error");
      setModalMessage(`Error: ${error.response?.data?.message || error.message || 'Failed to update room status'}`);
      setModalType('error');
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Night Audit
  const handleNightAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Confirmation must be "YES" to proceed
    if (nightAuditConfirmation !== 'YES') {
      setModalTitle("Validation Error");
      setModalMessage('Please confirm by typing "YES" to proceed with night audit');
      setModalType('warning');
      setModalOpen(true);
      return;
    }
    
    setLoading(true);
    try {
      const response = await operationsApi.auditDateChange(nightAuditConfirmation);
      
      if (response.data.success) {
        setModalTitle("Night Audit Complete");
        setModalMessage(response.data.message || 'Night audit processed successfully! All checked-in rooms have been charged with room charges including SGST and CGST.');
        setModalType('success');
        setModalAction(() => {
          // Reset form
          setNightAuditConfirmation('');
          setShowNightAuditModal(false);
          // Refresh data if needed
          fetchAllData();
          return null;
        });
        setModalOpen(true);
      } else {
        setModalTitle("Night Audit Failed");
        setModalMessage(response.data.message || 'Failed to process night audit');
        setModalType('error');
        setModalOpen(true);
      }
    } catch (error: any) {
      console.error('Failed to process night audit:', error);
      let errorMessage = 'Failed to process night audit. Please try again.';
      
      if (error.response) {
        if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 400) {
          errorMessage = 'Invalid request. Please check the data and try again.';
        } else if (error.response.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else {
          errorMessage = `Server error (${error.response.status}). Please try again.`;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setModalTitle("Error");
      setModalMessage(errorMessage);
      setModalType('error');
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Day Close
  const handleDayClose = async () => {
    setModalTitle("Confirm Day Close");
    setModalMessage("Are you sure you want to close the day and advance the audit date to the next calendar date?");
    setModalType('warning');
    setConfirmText("Close Day");
    setCancelText("Cancel");
    setShowConfirmButton(true);
    setShowCancelButton(true);
    
    setModalAction(() => async () => {
      setLoading(true);
      try {
        // For Day Close, we automatically send "YES" confirmation to change the audit date
        const response = await operationsApi.auditDateChange('YES');
        
        if (response.data.success) {
          setModalTitle("Day Closed");
          setModalMessage(response.data.message || 'Day closed successfully! The audit date has been advanced to the next calendar date.');
          setModalType('success');
          setModalAction(() => {
            // Refresh data if needed
            fetchAllData();
            return null;
          });
          setModalOpen(true);
        } else {
          setModalTitle("Day Close Failed");
          setModalMessage(response.data.message || 'Failed to close the day');
          setModalType('error');
          setModalOpen(true);
        }
      } catch (error: any) {
        console.error('Failed to close the day:', error);
        let errorMessage = 'Failed to close the day. Please try again.';
        
        if (error.response) {
          if (error.response.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.status === 400) {
            errorMessage = 'Invalid request. Please check the data and try again.';
          } else if (error.response.status === 401) {
            errorMessage = 'Unauthorized. Please log in again.';
          } else {
            errorMessage = `Server error (${error.response.status}). Please try again.`;
          }
        } else if (error.request) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message || errorMessage;
        }
        
        setModalTitle("Error");
        setModalMessage(errorMessage);
        setModalType('error');
        setModalOpen(true);
      } finally {
        setLoading(false);
      }
      return null;
    });
    
    setModalOpen(true);
  };

  // Handle Shift Close
  const handleShiftClose = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      // Calculate the closing balance based on opening balance, income, and expenses
      const calculatedClosingBalance = shiftCloseData.openingBalance + shiftCloseData.totalIncome - shiftCloseData.totalExpense;
      
      const response = await operationsApi.shiftClose({ 
        balance: shiftCloseBalance,
        openingBalance: shiftCloseData.openingBalance,
        closingBalance: calculatedClosingBalance,
        totalIncome: shiftCloseData.totalIncome,
        totalExpense: shiftCloseData.totalExpense
      });
      
      if (response.data.success) {
        setModalTitle("Shift Closed");
        setModalMessage(response.data.message || 'Shift closed successfully! The closing balance has been calculated and stored in the shift table and shift has been changed.');
        setModalType('success');
        setModalAction(() => {
          // Reset form
          setShiftCloseData({
            openingBalance: 0,
            totalIncome: 0,
            totalExpense: 0
          });
          setShiftCloseBalance(0);
          setShowShiftCloseModal(false);
          // Refresh data if needed
          fetchAllData();
          return null;
        });
        setModalOpen(true);
      } else {
        setModalTitle("Shift Close Failed");
        setModalMessage(response.data.message || 'Failed to close shift');
        setModalType('error');
        setModalOpen(true);
      }
    } catch (error: any) {
      console.error('Failed to close shift:', error);
      let errorMessage = 'Failed to close shift. Please try again.';
      
      if (error.response) {
        if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 400) {
          errorMessage = 'Invalid request. Please check the data and try again.';
        } else if (error.response.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else {
          errorMessage = `Server error (${error.response.status}). Please try again.`;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setModalTitle("Error");
      setModalMessage(errorMessage);
      setModalType('error');
      setModalOpen(true);
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
            <button 
              onClick={() => setShowNightAuditModal(true)}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
            >
              <span className="text-lg font-semibold">Night Audit</span>
              <span className="text-sm opacity-90">End of day operations</span>
            </button>
            <button 
              onClick={() => setShowShiftCloseModal(true)}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all"
            >
              <span className="text-lg font-semibold">Shift Close</span>
              <span className="text-sm opacity-90">Close current shift</span>
            </button>
            <button 
              onClick={handleDayClose}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all"
            >
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
                  {[...rooms] // Create a copy to avoid mutating the original array
                    .sort((a, b) => {
                      // Sort by room number numerically
                      return a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true });
                    })
                    .map(room => (
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
                    {[...rooms] // Create a copy to avoid mutating the original array
                      .sort((a, b) => {
                        // Sort by room number numerically
                        return a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true });
                      })
                      .map(room => (
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
                  [...currentTasks] // Create a copy to avoid mutating the original array
                    .sort((a, b) => {
                      // Sort by room number numerically
                      const roomNoA = a.roomNo || '';
                      const roomNoB = b.roomNo || '';
                      return roomNoA.localeCompare(roomNoB, undefined, { numeric: true });
                    })
                    .map((task) => (
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
            {[...rooms] // Create a copy to avoid mutating the original array
              .sort((a, b) => {
                // Sort by room number numerically
                return a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true });
              })
              .map((room) => (
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
        
        {/* Night Audit Modal */}
        {showNightAuditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Night Audit</h2>
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  This will charge all checked-in rooms with room charges including SGST and CGST.
                </p>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to proceed with the night audit?
                </p>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        <strong>Important:</strong> Type "YES" to confirm this operation.
                      </p>
                    </div>
                  </div>
                </div>
                <form onSubmit={handleNightAudit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nightAuditConfirmation}
                      onChange={(e) => setNightAuditConfirmation(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Type YES to confirm"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNightAuditModal(false);
                        setNightAuditConfirmation('');
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 transition-all"
                    >
                      {loading ? 'Processing...' : 'Proceed with Night Audit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        
        {/* Shift Close Modal - Updated to be more compact */}
        {showShiftCloseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md">
              <h2 className="text-xl font-bold mb-3">Shift Close</h2>
              <div className="mb-4">
                <p className="text-gray-700 text-sm mb-3">
                  When you confirm the shift close, the closing balance for the shift will be calculated and stored in the shift table and shift will be changed.
                </p>
                <div className="bg-green-50 border-l-4 border-green-400 p-3 mb-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-xs text-green-700">
                        <strong>Automatic Shift Management:</strong> This feature automatically handles shift rotation logic. 
                        If closing a regular shift, the running shift will increment. If closing the last shift, 
                        the shift date will advance and the running shift will reset to 1.
                      </p>
                    </div>
                  </div>
                </div>
                <form onSubmit={handleShiftClose}>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Opening Balance
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={shiftCloseData.openingBalance}
                        onChange={(e) => setShiftCloseData({...shiftCloseData, openingBalance: parseFloat(e.target.value) || 0})}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Total Income
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={shiftCloseData.totalIncome}
                        onChange={(e) => setShiftCloseData({...shiftCloseData, totalIncome: parseFloat(e.target.value) || 0})}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Total Expense
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={shiftCloseData.totalExpense}
                        onChange={(e) => setShiftCloseData({...shiftCloseData, totalExpense: parseFloat(e.target.value) || 0})}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Closing Balance
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={shiftCloseData.openingBalance + shiftCloseData.totalIncome - shiftCloseData.totalExpense}
                        readOnly
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Shift Balance <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={shiftCloseBalance}
                      onChange={(e) => setShiftCloseBalance(parseFloat(e.target.value) || 0)}
                      required
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter shift balance"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowShiftCloseModal(false);
                        setShiftCloseBalance(0);
                        setShiftCloseData({
                          openingBalance: 0,
                          totalIncome: 0,
                          totalExpense: 0
                        });
                      }}
                      className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-3 py-1.5 text-sm bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md hover:from-green-700 hover:to-green-800 disabled:opacity-50 transition-all"
                    >
                      {loading ? 'Closing...' : 'Close Shift'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        type={modalType}
        onConfirm={modalAction || undefined}
        confirmText={confirmText}
        cancelText={cancelText}
        showConfirmButton={showConfirmButton}
        showCancelButton={showCancelButton}
      >
        {modalMessage}
      </Modal>
    </Layout>
  );
};

export default Housekeeping;