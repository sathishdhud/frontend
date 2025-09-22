import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { 
  CogIcon, 
  BuildingOfficeIcon, 
  CreditCardIcon, 
  TagIcon, 
  UserGroupIcon, 
  GlobeAltIcon, 
  MapPinIcon, 
  ArrowPathIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { masterDataApi, roomApi, operationsApi } from '../services/api';
import { PaymentMode, RoomType, Company, PlanType, Tax, AccountHead, Nationality, RefMode, ArrivalMode, ReservationSource, User, Room, UserType, SettlementType } from '../types/api';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('hotelsoftusers');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [taxForm, setTaxForm] = useState({ taxName: '', percentage: '' });
  const [accountHeadForm, setAccountHeadForm] = useState({ 
    accHeadId: `ACC${Math.floor(Math.random() * 9000 + 1000)}`,
    name: '',
    companyName: '',
    chequeNumber: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [roomForm, setRoomForm] = useState({ roomNo: '', floor: '', roomTypeId: '' });
  const [roomTypeForm, setRoomTypeForm] = useState({ typeName: '', noOfRooms: '' });
  const [paymentModeForm, setPaymentModeForm] = useState({ id: '', name: '' });
  const [planTypeForm, setPlanTypeForm] = useState({ planName: '', discountPercentage: '' });
  const [companyForm, setCompanyForm] = useState({ companyName: '', address1: '', address2: '', address3: '', gstNumber: '' });
  const [nationalityForm, setNationalityForm] = useState({ nationality: '' });
  const [refModeForm, setRefModeForm] = useState({ refMode: '' });
  const [arrivalModeForm, setArrivalModeForm] = useState({ arrivalMode: '' });
  const [reservationSourceForm, setReservationSourceForm] = useState({ resvSource: '' });
  const [settlementTypeForm, setSettlementTypeForm] = useState({ id: '', name: '' });
  
  // Editing states
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [editingAccountHead, setEditingAccountHead] = useState<AccountHead | null>(null);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const [editingPaymentMode, setEditingPaymentMode] = useState<PaymentMode | null>(null);
  const [editingPlanType, setEditingPlanType] = useState<PlanType | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingNationality, setEditingNationality] = useState<Nationality | null>(null);
  const [editingRefMode, setEditingRefMode] = useState<RefMode | null>(null);
  const [editingArrivalMode, setEditingArrivalMode] = useState<ArrivalMode | null>(null);
  const [editingReservationSource, setEditingReservationSource] = useState<ReservationSource | null>(null);
  const [editingSettlementType, setEditingSettlementType] = useState<SettlementType | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  
  // User management states
  const [users, setUsers] = useState<User[]>([]);
  const [userForm, setUserForm] = useState({ userName: '', userTypeId: '', password: '' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // User type states
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [userTypeForm, setUserTypeForm] = useState({ typeName: '' });
  const [editingUserType, setEditingUserType] = useState<UserType | null>(null);

  // Data states
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [planTypes, setPlanTypes] = useState<PlanType[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([]);
  const [nationalities, setNationalities] = useState<Nationality[]>([]);
  const [refModes, setRefModes] = useState<RefMode[]>([]);
  const [arrivalModes, setArrivalModes] = useState<ArrivalMode[]>([]);
  const [reservationSources, setReservationSources] = useState<ReservationSource[]>([]);
  const [settlementTypes, setSettlementTypes] = useState<SettlementType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  // Operations states
  const [auditDateForm, setAuditDateForm] = useState({ confirmation: '' });
  const [shiftForm, setShiftForm] = useState({ 
    shiftDate: new Date().toISOString().split('T')[0], 
    shiftNo: '1', 
    balance: 0 
  });
  const [shiftCloseForm, setShiftCloseForm] = useState({ 
    balance: 0,
    openingBalance: 0,
    totalIncome: 0,
    totalExpense: 0
  });
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operationsSuccess, setOperationsSuccess] = useState('');
  const [operationsError, setOperationsError] = useState('');

  useEffect(() => {
    fetchMasterData();
    fetchUsers();
    fetchRooms();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersRes = await masterDataApi.getUsers();
      if (usersRes.data.success) {
        setUsers(usersRes.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [
        paymentModesRes, 
        roomTypesRes, 
        companiesRes, 
        planTypesRes,
        taxesRes,
        accountHeadsRes,
        nationalitiesRes,
        refModesRes,
        arrivalModesRes,
        reservationSourcesRes,
        settlementTypesRes,
        userTypesRes
      ] = await Promise.all([
        masterDataApi.getPaymentModes(),
        masterDataApi.getRoomTypes(),
        masterDataApi.getCompanies(),
        masterDataApi.getPlanTypes(),
        masterDataApi.getTaxes(),
        masterDataApi.getAccountHeads(),
        masterDataApi.getNationalities(),
        masterDataApi.getRefModes(),
        masterDataApi.getArrivalModes(),
        masterDataApi.getReservationSources(),
        masterDataApi.getSettlementTypes(),
        masterDataApi.getUserTypes()
      ]);

      if (paymentModesRes.data.success) setPaymentModes(paymentModesRes.data.data);
      if (roomTypesRes.data.success) setRoomTypes(roomTypesRes.data.data);
      if (companiesRes.data.success) setCompanies(companiesRes.data.data);
      if (planTypesRes.data.success) setPlanTypes(planTypesRes.data.data);
      if (taxesRes.data.success) setTaxes(taxesRes.data.data);
      if (accountHeadsRes.data.success) setAccountHeads(accountHeadsRes.data.data);
      if (nationalitiesRes.data.success) setNationalities(nationalitiesRes.data.data);
      if (refModesRes.data.success) setRefModes(refModesRes.data.data);
      if (arrivalModesRes.data.success) setArrivalModes(arrivalModesRes.data.data);
      if (reservationSourcesRes.data.success) setReservationSources(reservationSourcesRes.data.data);
      if (settlementTypesRes.data.success) setSettlementTypes(settlementTypesRes.data.data);
      if (userTypesRes.data.success) setUserTypes(userTypesRes.data.data);
    } catch (error) {
      console.error('Failed to fetch master data:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const roomsRes = await roomApi.getRooms();
      if (roomsRes.data.success) {
        setRooms(roomsRes.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const showNotification = (message: string, isSuccess: boolean = true) => {
    if (isSuccess) {
      setSuccessMessage(message);
      setErrorMessage('');
    } else {
      setErrorMessage(message);
      setSuccessMessage('');
    }
    
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 5000);
  };

  const showOperationsNotification = (message: string, isSuccess: boolean = true) => {
    if (isSuccess) {
      setOperationsSuccess(message);
      setOperationsError('');
    } else {
      setOperationsError(message);
      setOperationsSuccess('');
    }
    
    setTimeout(() => {
      setOperationsSuccess('');
      setOperationsError('');
    }, 5000);
  };

  const handleUserFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingUser) {
        // Update existing user
        const userData = {
          userName: userForm.userName,
          userTypeId: userForm.userTypeId,
          ...(userForm.password && { password: userForm.password })
        };
        
        await masterDataApi.updateUser(editingUser.userId, userData);
        showNotification('User updated successfully!');
      } else {
        // Create new user
        await masterDataApi.createUser(userForm);
        showNotification('User created successfully!');
      }
      
      // Reset form
      setUserForm({ userName: '', userTypeId: '', password: '' });
      setEditingUser(null);
      
      // Refresh users
      fetchUsers();
    } catch (error: any) {
      showNotification(`Failed to ${editingUser ? 'update' : 'create'} user. ${error.response?.data?.message || 'Please try again.'}`, false);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      userName: user.userName,
      userTypeId: user.userTypeId,
      password: ''
    });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    try {
      await masterDataApi.deleteUser(userId);
      showNotification('User deleted successfully!');
      fetchUsers();
      
      // If we were editing this user, reset the form
      if (editingUser && editingUser.userId === userId) {
        setUserForm({ userName: '', userTypeId: '', password: '' });
        setEditingUser(null);
      }
    } catch (error) {
      showNotification('Failed to delete user. Please try again.', false);
    }
  };

  const handleMasterDataFormSubmit = async (e: React.FormEvent, type: string, formData: any) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let response;
      
      switch (type) {
        case 'Room':
          // Automatically set status to 'VR' (Vacant Ready) for new rooms
          const roomData = {
            ...formData,
            status: 'VR'
          };
          response = editingRoom 
            ? await masterDataApi.updateRoom(editingRoom.roomId, roomData)
            : await masterDataApi.createRoom(roomData);
          showNotification(`Room ${editingRoom ? 'updated' : 'created'} successfully!`);
          setRoomForm({ roomNo: '', floor: '', roomTypeId: '' });
          setEditingRoom(null);
          fetchRooms();
          break;
          
        case 'Tax':
          if (editingTax) {
            response = await masterDataApi.updateTax(editingTax.taxId, formData);
          } else {
            response = await masterDataApi.createTax(formData);
          }
          break;
        case 'Account Head':
          if (editingAccountHead) {
            response = await masterDataApi.updateAccountHead(editingAccountHead.accHeadId, formData);
          } else {
            response = await masterDataApi.createAccountHead(formData);
          }
          break;
        case 'Room Type':
          if (editingRoomType) {
            response = await masterDataApi.updateRoomType(editingRoomType.typeId, formData);
          } else {
            response = await masterDataApi.createRoomType(formData);
          }
          break;
        case 'Payment Mode':
          if (editingPaymentMode) {
            response = await masterDataApi.updatePaymentMode(editingPaymentMode.id, { name: formData.name });
          } else {
            response = await masterDataApi.createPaymentMode(formData);
          }
          break;
        case 'Plan Type':
          if (editingPlanType) {
            response = await masterDataApi.updatePlanType(editingPlanType.planId, formData);
          } else {
            response = await masterDataApi.createPlanType(formData);
          }
          break;
        case 'Company':
          if (editingCompany) {
            response = await masterDataApi.updateCompany(editingCompany.companyId, formData);
          } else {
            response = await masterDataApi.createCompany(formData);
          }
          break;
        case 'Nationality':
          if (editingNationality) {
            response = await masterDataApi.updateNationality(editingNationality.id, formData);
          } else {
            response = await masterDataApi.createNationality(formData);
          }
          break;
        case 'Ref Mode':
          if (editingRefMode) {
            response = await masterDataApi.updateRefMode(editingRefMode.id, formData);
          } else {
            response = await masterDataApi.createRefMode(formData);
          }
          break;
        case 'Arrival Mode':
          if (editingArrivalMode) {
            response = await masterDataApi.updateArrivalMode(editingArrivalMode.id, formData);
          } else {
            response = await masterDataApi.createArrivalMode(formData);
          }
          break;
        case 'Reservation Source':
          if (editingReservationSource) {
            response = await masterDataApi.updateReservationSource(editingReservationSource.id, formData);
          } else {
            response = await masterDataApi.createReservationSource(formData);
          }
          break;
        case 'Settlement Type':
          if (editingSettlementType) {
            response = await masterDataApi.updateSettlementType(editingSettlementType.id, formData);
          } else {
            response = await masterDataApi.createSettlementType(formData);
          }
          break;
      }
      
      showNotification(`${editingTax || editingAccountHead || editingRoomType || editingPaymentMode || editingPlanType || editingCompany || editingNationality || editingRefMode || editingArrivalMode || editingReservationSource || editingSettlementType || editingRoom ? 'Updated' : 'Created'} ${type} successfully!`);
      
      // Reset form and editing state
      switch (type) {
        case 'Tax':
          setTaxForm({ taxName: '', percentage: '' });
          setEditingTax(null);
          break;
        case 'Account Head':
          setAccountHeadForm({ accHeadId: `ACC${Math.floor(Math.random() * 9000 + 1000)}`, name: '', companyName: '', chequeNumber: '', date: new Date().toISOString().split('T')[0] });
          setEditingAccountHead(null);
          break;
        case 'Room Type':
          setRoomTypeForm({ typeName: '', noOfRooms: '' });
          setEditingRoomType(null);
          break;
        case 'Payment Mode':
          setPaymentModeForm({ id: '', name: '' });
          setEditingPaymentMode(null);
          break;
        case 'Plan Type':
          setPlanTypeForm({ planName: '', discountPercentage: '' });
          setEditingPlanType(null);
          break;
        case 'Company':
          setCompanyForm({ companyName: '', address1: '', address2: '', address3: '', gstNumber: '' });
          setEditingCompany(null);
          break;
        case 'Nationality':
          setNationalityForm({ nationality: '' });
          setEditingNationality(null);
          break;
        case 'Ref Mode':
          setRefModeForm({ refMode: '' });
          setEditingRefMode(null);
          break;
        case 'Arrival Mode':
          setArrivalModeForm({ arrivalMode: '' });
          setEditingArrivalMode(null);
          break;
        case 'Reservation Source':
          setReservationSourceForm({ resvSource: '' });
          setEditingReservationSource(null);
          break;
        case 'Settlement Type':
          setSettlementTypeForm({ id: '', name: '' });
          setEditingSettlementType(null);
          break;
        case 'Room':
          setRoomForm({ roomNo: '', floor: '', roomTypeId: '' });
          setEditingRoom(null);
          break;
      }
      
      // Refresh master data
      fetchMasterData();
      fetchRooms();
    } catch (error: any) {
      showNotification(`Failed to ${editingTax || editingAccountHead || editingRoomType || editingPaymentMode || editingPlanType || editingCompany || editingNationality || editingRefMode || editingArrivalMode || editingReservationSource || editingSettlementType || editingRoom ? 'update' : 'create'} ${type}. ${error.response?.data?.message || 'Please try again.'}`, false);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMasterData = (type: string, item: any) => {
    switch (type) {
      case 'Tax':
        setEditingTax(item);
        setTaxForm({ taxName: item.taxName, percentage: item.percentage?.toString() || '' });
        break;
      case 'Account Head':
        setEditingAccountHead(item);
        setAccountHeadForm({ 
          accHeadId: item.accHeadId,
          name: item.name,
          companyName: item.companyName || '',
          chequeNumber: item.chequeNumber || '',
          date: item.date || ''
        });
        break;
      case 'Room Type':
        setEditingRoomType(item);
        setRoomTypeForm({ typeName: item.typeName, noOfRooms: item.noOfRooms?.toString() || '' });
        break;
      case 'Payment Mode':
        setEditingPaymentMode(item);
        setPaymentModeForm({ id: item.id, name: item.name });
        break;
      case 'Plan Type':
        setEditingPlanType(item);
        setPlanTypeForm({ planName: item.planName, discountPercentage: item.discountPercentage?.toString() || '' });
        break;
      case 'Company':
        setEditingCompany(item);
        setCompanyForm({ 
          companyName: item.companyName, 
          address1: item.address1 || '', 
          address2: item.address2 || '', 
          address3: item.address3 || '', 
          gstNumber: item.gstNumber || '' 
        });
        break;
      case 'Nationality':
        setEditingNationality(item);
        setNationalityForm({ nationality: item.nationality });
        break;
      case 'Ref Mode':
        setEditingRefMode(item);
        setRefModeForm({ refMode: item.refMode });
        break;
      case 'Arrival Mode':
        setEditingArrivalMode(item);
        setArrivalModeForm({ arrivalMode: item.arrivalMode });
        break;
      case 'Reservation Source':
        setEditingReservationSource(item);
        setReservationSourceForm({ resvSource: item.resvSource });
        break;
      case 'Settlement Type':
        setEditingSettlementType(item);
        setSettlementTypeForm({ id: item.id, name: item.name });
        break;
      case 'Room':
        setEditingRoom(item);
        setRoomForm({ 
          roomNo: item.roomNo, 
          floor: item.floor, 
          roomTypeId: item.roomTypeId 
        });
        break;
    }
  };

  const handleDeleteMasterData = async (type: string, id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }
    
    try {
      switch (type) {
        case 'Tax':
          await masterDataApi.deleteTax(id);
          break;
        case 'Account Head':
          await masterDataApi.deleteAccountHead(id);
          break;
        case 'Room Type':
          await masterDataApi.deleteRoomType(id);
          break;
        case 'Payment Mode':
          await masterDataApi.deletePaymentMode(id);
          break;
        case 'Plan Type':
          await masterDataApi.deletePlanType(id);
          break;
        case 'Company':
          await masterDataApi.deleteCompany(id);
          break;
        case 'Nationality':
          await masterDataApi.deleteNationality(id);
          break;
        case 'Ref Mode':
          await masterDataApi.deleteRefMode(id);
          break;
        case 'Arrival Mode':
          await masterDataApi.deleteArrivalMode(id);
          break;
        case 'Reservation Source':
          await masterDataApi.deleteReservationSource(id);
          break;
        case 'Settlement Type':
          await masterDataApi.deleteSettlementType(id);
          break;
        case 'Room':
          await masterDataApi.deleteRoom(id);
          break;
      }
      
      showNotification(`${type} deleted successfully!`);
      fetchMasterData();
      fetchRooms();
      
      // Reset editing state if we were editing the deleted item
      switch (type) {
        case 'Tax':
          if (editingTax && editingTax.taxId === id) {
            setEditingTax(null);
            setTaxForm({ taxName: '', percentage: '' });
          }
          break;
        case 'Account Head':
          if (editingAccountHead && editingAccountHead.accHeadId === id) {
            setEditingAccountHead(null);
            setAccountHeadForm({ accHeadId: `ACC${Math.floor(Math.random() * 9000 + 1000)}`, name: '', companyName: '', chequeNumber: '', date: new Date().toISOString().split('T')[0] });
          }
          break;
        case 'Room Type':
          if (editingRoomType && editingRoomType.typeId === id) {
            setEditingRoomType(null);
            setRoomTypeForm({ typeName: '', noOfRooms: '' });
          }
          break;
        case 'Payment Mode':
          if (editingPaymentMode && editingPaymentMode.id === id) {
            setEditingPaymentMode(null);
            setPaymentModeForm({ id: '', name: '' });
          }
          break;
        case 'Plan Type':
          if (editingPlanType && editingPlanType.planId === id) {
            setEditingPlanType(null);
            setPlanTypeForm({ planName: '', discountPercentage: '' });
          }
          break;
        case 'Company':
          if (editingCompany && editingCompany.companyId === id) {
            setEditingCompany(null);
            setCompanyForm({ companyName: '', address1: '', address2: '', address3: '', gstNumber: '' });
          }
          break;
        case 'Nationality':
          if (editingNationality && editingNationality.id === id) {
            setEditingNationality(null);
            setNationalityForm({ nationality: '' });
          }
          break;
        case 'Ref Mode':
          if (editingRefMode && editingRefMode.id === id) {
            setEditingRefMode(null);
            setRefModeForm({ refMode: '' });
          }
          break;
        case 'Arrival Mode':
          if (editingArrivalMode && editingArrivalMode.id === id) {
            setEditingArrivalMode(null);
            setArrivalModeForm({ arrivalMode: '' });
          }
          break;
        case 'Reservation Source':
          if (editingReservationSource && editingReservationSource.id === id) {
            setEditingReservationSource(null);
            setReservationSourceForm({ resvSource: '' });
          }
          break;
        case 'Settlement Type':
          if (editingSettlementType && editingSettlementType.id === id) {
            setEditingSettlementType(null);
            setSettlementTypeForm({ id: '', name: '' });
          }
          break;
        case 'Room':
          if (editingRoom && editingRoom.roomId === id) {
            setEditingRoom(null);
            setRoomForm({ roomNo: '', floor: '', roomTypeId: '' });
          }
          break;
      }
    } catch (error: any) {
      console.error(`Failed to delete ${type}:`, error);
      let errorMessage = 'Please try again.';
      
      // Handle specific error cases
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 409) {
          errorMessage = 'This item is currently in use and cannot be deleted.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = `Server error (${error.response.status}). Please try again.`;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        // Something else happened
        errorMessage = error.message || errorMessage;
      }
      
      showNotification(`Failed to delete ${type}. ${errorMessage}`, false);
    }
  };

  // Operations handlers
  const handleAuditDateChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperationsLoading(true);
    
    try {
      // Confirmation must be "YES" to proceed
      if (auditDateForm.confirmation !== 'YES') {
        showOperationsNotification('Please confirm by typing "YES" to proceed with audit date change', false);
        setOperationsLoading(false);
        return;
      }
      
      const response = await operationsApi.auditDateChange(auditDateForm.confirmation);
      
      if (response.data.success) {
        showOperationsNotification(response.data.message || 'Audit date change processed successfully!');
        // Reset form
        setAuditDateForm({ confirmation: '' });
        // Refresh data if needed
        fetchMasterData();
      } else {
        showOperationsNotification(response.data.message || 'Failed to process audit date change', false);
      }
    } catch (error: any) {
      console.error('Failed to process audit date change:', error);
      // More detailed error handling
      let errorMessage = 'Failed to process audit date change. Please try again.';
      
      if (error.response) {
        if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 400) {
          errorMessage = 'Invalid request. Please check the data and try again.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. There may be database constraints preventing this operation. Please contact support.';
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      showOperationsNotification(`Error: ${errorMessage}`, false);
    } finally {
      setOperationsLoading(false);
    }
  };

  const handleShiftChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperationsLoading(true);
    
    try {
      const response = await operationsApi.shiftChange(shiftForm);
      
      if (response.data.success) {
        showOperationsNotification(response.data.message || 'Shift change processed successfully!');
        // Reset form to default values
        setShiftForm({ 
          shiftDate: new Date().toISOString().split('T')[0], 
          shiftNo: '1', 
          balance: 0 
        });
        // Refresh data if needed
        fetchMasterData();
      } else {
        showOperationsNotification(response.data.message || 'Failed to process shift change', false);
      }
    } catch (error: any) {
      console.error('Failed to process shift change:', error);
      // More detailed error handling
      let errorMessage = 'Failed to process shift change. Please try again.';
      
      if (error.response) {
        if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 400) {
          errorMessage = 'Invalid request. Please check the data and try again.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please contact support.';
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      showOperationsNotification(`Error: ${errorMessage}`, false);
    } finally {
      setOperationsLoading(false);
    }
  };

  const handleShiftClose = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperationsLoading(true);
    
    try {
      // Calculate the closing balance based on opening balance, income, and expenses
      const calculatedClosingBalance = shiftCloseForm.openingBalance + shiftCloseForm.totalIncome - shiftCloseForm.totalExpense;
      
      const response = await operationsApi.shiftClose({
        balance: shiftCloseForm.balance,
        closingBalance: calculatedClosingBalance,
        totalIncome: shiftCloseForm.totalIncome,
        totalExpense: shiftCloseForm.totalExpense
      });
      
      if (response.data.success) {
        showOperationsNotification(response.data.message || 'Shift closed successfully!');
        // Reset form to default values
        setShiftCloseForm({ 
          balance: 0,
          openingBalance: 0,
          totalIncome: 0,
          totalExpense: 0
        });
        // Refresh data if needed
        fetchMasterData();
      } else {
        showOperationsNotification(response.data.message || 'Failed to close shift', false);
      }
    } catch (error: any) {
      console.error('Failed to close shift:', error);
      // More detailed error handling
      let errorMessage = 'Failed to close shift. Please try again.';
      
      if (error.response) {
        if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 400) {
          errorMessage = 'Invalid request. Please check the data and try again.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please contact support.';
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      showOperationsNotification(`Error: ${errorMessage}`, false);
    } finally {
      setOperationsLoading(false);
    }
  };

  const renderFormInput = (label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void, required: boolean = true, type: string = 'text') => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {type === 'select' ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        >
          <option value="">Select...</option>
          {roomTypes.map((type) => (
            <option key={type.typeId} value={type.typeId}>
              {type.typeName}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
      )}
    </div>
  );

  const renderForm = (title: string, formState: any, setFormState: React.Dispatch<React.SetStateAction<any>>, onSubmit: (e: React.FormEvent) => void, fields: any[], editing: boolean = false) => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6 transition-all duration-300 hover:shadow-xl">
      <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">
        {editing ? `Edit ${title}` : `Create ${title}`}
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map((field, index) => (
            <div key={index}>
              {renderFormInput(
                field.label,
                field.name,
                formState[field.name],
                (e) => setFormState({ ...formState, [field.name]: e.target.value }),
                field.required,
                field.type || 'text'
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          {editing && (
            <button
              type="button"
              onClick={() => {
                // Reset form and editing state based on title
                switch (title) {
                  case 'Tax Master':
                    setTaxForm({ taxName: '', percentage: '' });
                    setEditingTax(null);
                    break;
                  case 'Account Head':
                    setAccountHeadForm({ accHeadId: `ACC${Math.floor(Math.random() * 9000 + 1000)}`, name: '', companyName: '', chequeNumber: '', date: new Date().toISOString().split('T')[0] });
                    setEditingAccountHead(null);
                    break;
                  case 'Room Type':
                    setRoomTypeForm({ typeName: '', noOfRooms: '' });
                    setEditingRoomType(null);
                    break;
                  case 'Payment Mode':
                    setPaymentModeForm({ id: '', name: '' });
                    setEditingPaymentMode(null);
                    break;
                  case 'Plan Type':
                    setPlanTypeForm({ planName: '', discountPercentage: '' });
                    setEditingPlanType(null);
                    break;
                  case 'Company/Ott Creation':
                    setCompanyForm({ companyName: '', address1: '', address2: '', address3: '', gstNumber: '' });
                    setEditingCompany(null);
                    break;
                  case 'Nationality':
                    setNationalityForm({ nationality: '' });
                    setEditingNationality(null);
                    break;
                  case 'Ref Mode':
                    setRefModeForm({ refMode: '' });
                    setEditingRefMode(null);
                    break;
                  case 'Arrival Mode':
                    setArrivalModeForm({ arrivalMode: '' });
                    setEditingArrivalMode(null);
                    break;
                  case 'Reservation Source':
                    setReservationSourceForm({ resvSource: '' });
                    setEditingReservationSource(null);
                    break;
                  case 'Settlement Type':
                    setSettlementTypeForm({ id: '', name: '' });
                    setEditingSettlementType(null);
                    break;
                }
              }}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                <span>{editing ? 'Updating...' : 'Creating...'}</span>
              </>
            ) : (
              <>
                <PlusIcon className="w-4 h-4" />
                <span>{editing ? `Update ${title}` : `Create ${title}`}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  const renderMasterDataList = (title: string, data: any[], columns: any[], type: string) => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl">
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th key={index} className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  {column.header}
                </th>
              ))}
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length > 0 ? (
              data.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                  {columns.map((column, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {column.render ? column.render(item) : (item[column.key] || '-')}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleEditMasterData(type, item)}
                      className="text-blue-600 hover:text-blue-900 mr-4 p-1.5 rounded-full hover:bg-blue-50 transition-colors duration-200"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteMasterData(type, item[getIdKey(type)])}
                      className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50 transition-colors duration-200"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-8 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-gray-300 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <p>No data available</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const getIdKey = (type: string): string => {
    switch (type) {
      case 'Tax': return 'taxId';
      case 'Account Head': return 'accHeadId';
      case 'Room Type': return 'typeId';
      case 'Payment Mode': return 'id';
      case 'Plan Type': return 'planId';
      case 'Company': return 'companyId';
      case 'Nationality': return 'id';
      case 'Ref Mode': return 'id';
      case 'Arrival Mode': return 'id';
      case 'Reservation Source': return 'id';
      case 'Settlement Type': return 'id';
      case 'Room': return 'roomId';
      default: return 'id';
    }
  };

  const renderUserManagement = () => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-all duration-300 hover:shadow-xl">
      <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">Hotelsoft Users</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingUser ? 'Edit User' : 'Create New User'}
          </h3>
          <form onSubmit={handleUserFormSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={userForm.userName}
                onChange={(e) => setUserForm({ ...userForm, userName: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter user name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Type <span className="text-red-500">*</span>
              </label>
              <select
                value={userForm.userTypeId}
                onChange={(e) => setUserForm({ ...userForm, userTypeId: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Select User Type</option>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="CASHIER">Cashier</option>
                <option value="RECEPTIONIST">Receptionist</option>
                <option value="HOUSEKEEPING">Housekeeping</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {editingUser ? 'New Password (optional)' : 'Password'} {editingUser ? '' : <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                {...(!editingUser && { required: true })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              {editingUser && (
                <button
                  type="button"
                  onClick={() => {
                    setUserForm({ userName: '', userTypeId: '', password: '' });
                    setEditingUser(null);
                  }}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    <span>{editingUser ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4" />
                    <span>{editingUser ? 'Update User' : 'Create User'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">User List</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      User Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      User Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user.userId} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.userName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.userTypeName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-900 mr-4 p-1.5 rounded-full hover:bg-blue-50 transition-colors duration-200"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.userId)}
                            className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50 transition-colors duration-200"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-gray-300 mb-2">
                            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                          </div>
                          <p>No users available</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOperations = () => (
    <div className="space-y-6">
      {/* Operations Notifications */}
      {operationsSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center shadow-sm animate-fadeIn">
          <CheckCircleIcon className="w-5 h-5 mr-2" />
          {operationsSuccess}
        </div>
      )}
      {operationsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm animate-fadeIn">
          {operationsError}
        </div>
      )}

      {/* Audit Date Change Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-all duration-300 hover:shadow-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">Audit Date Change</h2>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Important:</strong> Changing the audit date will post room charges and taxes for all in-house guests. 
                This operation should only be performed at the start of a new business day.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-800 mb-2">What happens during audit date change:</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-blue-700">
            <li>Room charges are posted for all in-house guests</li>
            <li>Taxes are calculated and posted for all in-house guests</li>
            <li>All transactions are timestamped with the new audit date</li>
            <li>Financial reports will reflect the new audit date</li>
          </ul>
        </div>
        <form onSubmit={handleAuditDateChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmation <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Type "YES" to confirm that you want to change the audit date and post charges for all in-house guests.
            </p>
            <input
              type="text"
              value={auditDateForm.confirmation}
              onChange={(e) => setAuditDateForm({ ...auditDateForm, confirmation: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Type YES to confirm"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={operationsLoading}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
            >
              {operationsLoading ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Change Audit Date</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Shift Change Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-all duration-300 hover:shadow-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">Shift Change</h2>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Information:</strong> Use this form to record shift changes for financial reconciliation purposes.
              </p>
            </div>
          </div>
        </div>
        <form onSubmit={handleShiftChange} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shift Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={shiftForm.shiftDate}
                onChange={(e) => setShiftForm({ ...shiftForm, shiftDate: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shift Number <span className="text-red-500">*</span>
              </label>
              <select
                value={shiftForm.shiftNo}
                onChange={(e) => setShiftForm({ ...shiftForm, shiftNo: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shift Balance <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={shiftForm.balance}
                onChange={(e) => setShiftForm({ ...shiftForm, balance: parseFloat(e.target.value) || 0 })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter shift balance"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={operationsLoading}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
            >
              {operationsLoading ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Change Shift</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Shift Close Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-all duration-300 hover:shadow-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">Shift Close</h2>
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                <strong>Automatic Shift Management:</strong> This feature automatically handles shift rotation logic. 
                If closing a regular shift, the running shift will increment. If closing the last shift, 
                the shift date will advance and the running shift will reset to 1.
              </p>
            </div>
          </div>
        </div>
        <form onSubmit={handleShiftClose} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opening Balance
              </label>
              <input
                type="number"
                step="0.01"
                value={shiftCloseForm.openingBalance}
                onChange={(e) => setShiftCloseForm({ ...shiftCloseForm, openingBalance: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter opening balance"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Income
              </label>
              <input
                type="number"
                step="0.01"
                value={shiftCloseForm.totalIncome}
                onChange={(e) => setShiftCloseForm({ ...shiftCloseForm, totalIncome: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter total income"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Expense
              </label>
              <input
                type="number"
                step="0.01"
                value={shiftCloseForm.totalExpense}
                onChange={(e) => setShiftCloseForm({ ...shiftCloseForm, totalExpense: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter total expense"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calculated Closing Balance
              </label>
              <input
                type="number"
                step="0.01"
                value={shiftCloseForm.openingBalance + shiftCloseForm.totalIncome - shiftCloseForm.totalExpense}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Calculated closing balance"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shift Balance <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={shiftCloseForm.balance}
                onChange={(e) => setShiftCloseForm({ ...shiftCloseForm, balance: parseFloat(e.target.value) || 0 })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter shift balance"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={operationsLoading}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
            >
              {operationsLoading ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Closing Shift...</span>
                </>
              ) : (
                <span>Close Shift</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const tabs = [
    { id: 'hotelsoftusers', name: 'Hotelsoft Users', icon: UserGroupIcon },
    { id: 'taxation', name: 'Tax Master', icon: TagIcon },
    { id: 'accounthead', name: 'Account Head', icon: BuildingOfficeIcon },
    { id: 'roomcreation', name: 'Room Creation', icon: BuildingOfficeIcon },
    { id: 'roomtype', name: 'Room Type', icon: BuildingOfficeIcon },
    { id: 'paymentmode', name: 'Payment Mode', icon: CreditCardIcon },
    { id: 'plantype', name: 'Plan Type', icon: TagIcon },
    { id: 'company', name: 'Company/Ott', icon: BuildingOfficeIcon },
    { id: 'nationality', name: 'Nationality', icon: GlobeAltIcon },
    { id: 'refmode', name: 'Ref Mode', icon: MapPinIcon },
    { id: 'arrivalmode', name: 'Arrival Mode', icon: MapPinIcon },
    { id: 'resvsource', name: 'Resev Source', icon: MapPinIcon },
    { id: 'settlementtype', name: 'Settlement Type', icon: CreditCardIcon },
    { id: 'operations', name: 'Operations', icon: CogIcon },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-600 mt-1">Manage your hotel's master data and settings</p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={fetchMasterData}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center shadow-sm animate-fadeIn">
            <CheckCircleIcon className="w-5 h-5 mr-2" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm animate-fadeIn">
            {errorMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center py-4 px-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-1 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'hotelsoftusers' && renderUserManagement()}

          {activeTab === 'taxation' && (
            <>
              {renderForm(
                'Tax Master',
                taxForm,
                setTaxForm,
                (e) => handleMasterDataFormSubmit(e, 'Tax', taxForm),
                [
                  { label: 'Tax Name', name: 'taxName', required: true },
                  { label: 'Percentage', name: 'percentage', type: 'number', required: true }
                ],
                !!editingTax
              )}
              {renderMasterDataList('Taxes', taxes, [
                { header: 'Tax Name', key: 'taxName', render: (item: Tax) => item.taxName || '-' },
                { header: 'Percentage', key: 'percentage', render: (item: Tax) => item.percentage || '-' }
              ], 'Tax')}
            </>
          )}

          {activeTab === 'accounthead' && (
            <>
              {renderForm(
                'Account Head',
                accountHeadForm,
                setAccountHeadForm,
                (e) => handleMasterDataFormSubmit(e, 'Account Head', accountHeadForm),
                [
                  { label: 'Account Name', name: 'name', required: true },
                  { label: 'Company Name', name: 'companyName', required: false },
                  { label: 'Cheque Number', name: 'chequeNumber', required: false },
                  { label: 'Date', name: 'date', type: 'date', required: false }
                ],
                !!editingAccountHead
              )}
              {renderMasterDataList('Account Heads', accountHeads, [
                { header: 'Account Name', key: 'name', render: (item: AccountHead) => item.name || '-' },
                { header: 'Company Name', key: 'companyName', render: (item: AccountHead) => item.companyName || '-' },
                { header: 'Cheque Number', key: 'chequeNumber', render: (item: AccountHead) => item.chequeNumber || '-' },
                { header: 'Date', key: 'date', render: (item: AccountHead) => item.date || '-' }
              ], 'Account Head')}
            </>
          )}

          {activeTab === 'roomcreation' && (
            <>
              {renderForm(
                'Room Creation',
                roomForm,
                setRoomForm,
                (e) => handleMasterDataFormSubmit(e, 'Room', roomForm),
                [
                  { label: 'Room Number', name: 'roomNo', required: true },
                  { label: 'Floor', name: 'floor', required: true },
                  { label: 'Room Type', name: 'roomTypeId', type: 'select', required: true }
                ]
              )}
              {renderMasterDataList('Rooms', rooms, [
                { header: 'Room Number', key: 'roomNo', render: (item: Room) => item.roomNo || '-' },
                { header: 'Floor', key: 'floor', render: (item: Room) => item.floor || '-' },
                { 
                  header: 'Status', 
                  key: 'status', 
                  render: (item: Room) => {
                    const statusMap: Record<string, { label: string; className: string }> = {
                      'VR': { label: 'Vacant Ready', className: 'bg-green-100 text-green-800' },
                      'OD': { label: 'Occupied Dirty', className: 'bg-red-100 text-red-800' },
                      'OI': { label: 'Occupied In', className: 'bg-blue-100 text-blue-800' },
                      'Blocked': { label: 'Blocked', className: 'bg-gray-100 text-gray-800' }
                    };
                    const statusInfo = statusMap[item.status] || { label: item.status, className: 'bg-gray-100 text-gray-800' };
                    return (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    );
                  }
                },
                { 
                  header: 'Room Type', 
                  key: 'roomTypeName', 
                  render: (item: Room) => {
                    const roomType = roomTypes.find(rt => rt.typeId === item.roomTypeId);
                    return roomType ? roomType.typeName : 'Unknown';
                  }
                }
              ], 'Room')}
            </>
          )}

          {activeTab === 'roomtype' && (
            <>
              {renderForm(
                'Room Type',
                roomTypeForm,
                setRoomTypeForm,
                (e) => handleMasterDataFormSubmit(e, 'Room Type', roomTypeForm),
                [
                  { label: 'Room Type', name: 'typeName', required: true },
                  { label: 'No Of Rooms', name: 'noOfRooms', type: 'number', required: true }
                ],
                !!editingRoomType
              )}
              {renderMasterDataList('Room Types', roomTypes, [
                { header: 'ID', key: 'typeId', render: (item: RoomType) => item.typeId || '-' },
                { header: 'Name', key: 'typeName', render: (item: RoomType) => item.typeName || '-' },
                { header: 'No. of Rooms', key: 'noOfRooms', render: (item: RoomType) => item.noOfRooms || '-' },
                { 
                  header: 'In Use', 
                  key: 'inUse',
                  render: (item: RoomType) => {
                    const count = rooms.filter(room => room.roomTypeId === item.typeId).length;
                    return count > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {count} rooms
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Not in use
                      </span>
                    );
                  }
                }
              ], 'Room Type')}
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
                <p className="text-yellow-800 text-sm">
                  <strong>Note:</strong> Room Types that are currently assigned to rooms cannot be deleted. 
                  If you need to delete a Room Type, first reassign or delete all rooms using that type.
                </p>
              </div>
            </>
          )}

          {activeTab === 'paymentmode' && (
            <>
              {renderForm(
                'Payment Mode',
                paymentModeForm,
                setPaymentModeForm,
                (e) => handleMasterDataFormSubmit(e, 'Payment Mode', paymentModeForm),
                [
                  { label: 'ID', name: 'id', required: true },
                  { label: 'Name', name: 'name', required: true }
                ],
                !!editingPaymentMode
              )}
              {renderMasterDataList('Payment Modes', paymentModes, [
                { header: 'ID', key: 'id', render: (item: PaymentMode) => item.id || '-' },
                { header: 'Name', key: 'name', render: (item: PaymentMode) => item.name || '-' }
              ], 'Payment Mode')}
            </>
          )}

          {activeTab === 'plantype' && (
            <>
              {renderForm(
                'Plan Type',
                planTypeForm,
                setPlanTypeForm,
                (e) => handleMasterDataFormSubmit(e, 'Plan Type', planTypeForm),
                [
                  { label: 'Plan Name', name: 'planName', required: true },
                  { label: 'Discount Percentage', name: 'discountPercentage', type: 'number', required: true }
                ],
                !!editingPlanType
              )}
              {renderMasterDataList('Plan Types', planTypes, [
                { header: 'ID', key: 'planId', render: (item: PlanType) => item.planId || '-' },
                { header: 'Name', key: 'planName', render: (item: PlanType) => item.planName || '-' },
                { header: 'Discount %', key: 'discountPercentage', render: (item: PlanType) => item.discountPercentage || '-' }
              ], 'Plan Type')}
            </>
          )}

          {activeTab === 'company' && (
            <>
              {renderForm(
                'Company/Ott Creation',
                companyForm,
                setCompanyForm,
                (e) => handleMasterDataFormSubmit(e, 'Company', companyForm),
                [
                  { label: 'Company Name', name: 'companyName', required: true },
                  { label: 'Address Line 1', name: 'address1', required: false },
                  { label: 'Address Line 2', name: 'address2', required: false },
                  { label: 'Address Line 3', name: 'address3', required: false },
                  { label: 'GST Number', name: 'gstNumber', required: false }
                ],
                !!editingCompany
              )}
              {renderMasterDataList('Companies', companies, [
                { header: 'ID', key: 'companyId', render: (item: Company) => item.companyId || '-' },
                { header: 'Name', key: 'companyName', render: (item: Company) => item.companyName || '-' },
                { header: 'Address', key: 'address1', render: (item: Company) => item.address1 || '-' },
                { header: 'GST Number', key: 'gstNumber', render: (item: Company) => item.gstNumber || '-' }
              ], 'Company')}
            </>
          )}

          {activeTab === 'nationality' && (
            <>
              {renderForm(
                'Nationality',
                nationalityForm,
                setNationalityForm,
                (e) => handleMasterDataFormSubmit(e, 'Nationality', nationalityForm),
                [
                  { label: 'Nationality', name: 'nationality', required: true }
                ],
                !!editingNationality
              )}
              {renderMasterDataList('Nationalities', nationalities, [
                { header: 'ID', key: 'id', render: (item: Nationality) => item.id || '-' },
                { header: 'Nationality', key: 'nationality', render: (item: Nationality) => item.nationality || '-' }
              ], 'Nationality')}
            </>
          )}

          {activeTab === 'refmode' && (
            <>
              {renderForm(
                'Ref Mode',
                refModeForm,
                setRefModeForm,
                (e) => handleMasterDataFormSubmit(e, 'Ref Mode', refModeForm),
                [
                  { label: 'Ref Mode', name: 'refMode', required: true }
                ],
                !!editingRefMode
              )}
              {renderMasterDataList('Ref Modes', refModes, [
                { header: 'ID', key: 'id', render: (item: RefMode) => item.id || '-' },
                { header: 'Ref Mode', key: 'refMode', render: (item: RefMode) => item.refMode || '-' }
              ], 'Ref Mode')}
            </>
          )}

          {activeTab === 'arrivalmode' && (
            <>
              {renderForm(
                'Arrival Mode',
                arrivalModeForm,
                setArrivalModeForm,
                (e) => handleMasterDataFormSubmit(e, 'Arrival Mode', arrivalModeForm),
                [
                  { label: 'Arrival Mode', name: 'arrivalMode', required: true }
                ],
                !!editingArrivalMode
              )}
              {renderMasterDataList('Arrival Modes', arrivalModes, [
                { header: 'ID', key: 'id', render: (item: ArrivalMode) => item.id || '-' },
                { header: 'Arrival Mode', key: 'arrivalMode', render: (item: ArrivalMode) => item.arrivalMode || '-' }
              ], 'Arrival Mode')}
            </>
          )}

          {activeTab === 'resvsource' && (
            <>
              {renderForm(
                'Reservation Source',
                reservationSourceForm,
                setReservationSourceForm,
                (e) => handleMasterDataFormSubmit(e, 'Reservation Source', reservationSourceForm),
                [
                  { label: 'Reservation Source', name: 'resvSource', required: true }
                ],
                !!editingReservationSource
              )}
              {renderMasterDataList('Reservation Sources', reservationSources, [
                { header: 'Reservation Source', key: 'resvSource', render: (item: ReservationSource) => item.resvSource || '-' }
              ], 'Reservation Source')}
            </>
          )}

          {activeTab === 'settlementtype' && (
            <>
              {renderForm(
                'Settlement Type',
                settlementTypeForm,
                setSettlementTypeForm,
                (e) => handleMasterDataFormSubmit(e, 'Settlement Type', settlementTypeForm),
                [
                  { label: 'ID', name: 'id', required: true },
                  { label: 'Name', name: 'name', required: true }
                ],
                !!editingSettlementType
              )}
              {renderMasterDataList('Settlement Types', settlementTypes, [
                { header: 'ID', key: 'id', render: (item: SettlementType) => item.id || '-' },
                { header: 'Name', key: 'name', render: (item: SettlementType) => item.name || '-' }
              ], 'Settlement Type')}
            </>
          )}

          {/* Operations Tab */}
          {activeTab === 'operations' && renderOperations()}
        </div>
      </div>
    </Layout>
  );
};

export default Admin;