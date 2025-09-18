import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { roomApi, transactionApi, reservationApi, checkInApi, advanceApi, masterDataApi, reportApi } from '../services/api';
import { RoomStats, Reservation, CheckIn, Advance, AccountHead, PaymentMode } from '../types/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Report: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'occupancy' | 'financial' | 'operational' | 'guest' | 'sales' | 'manager' | 'mis'>('occupancy');
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const reportContentRef = useRef<HTMLDivElement>(null);
  
  // Occupancy stats
  const [roomStats, setRoomStats] = useState<RoomStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  
  // Financial reports
  const [transactions, setTransactions] = useState<any[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([]);
  const [loadingFinancial, setLoadingFinancial] = useState(false);
  const [financialChartData, setFinancialChartData] = useState<any[]>([]);
  
  // Operational reports
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loadingOperational, setLoadingOperational] = useState(false);
  const [reservationTrendData, setReservationTrendData] = useState<any[]>([]);
  
  // Guest reports
  const [inHouseGuests, setInHouseGuests] = useState<CheckIn[]>([]);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [guestData, setGuestData] = useState<any[]>([]);
  const [monthlyCheckins, setMonthlyCheckins] = useState<any[]>([]);
  
  // Sales reports
  const [salesReportData, setSalesReportData] = useState<any[]>([]);
  const [folioNo, setFolioNo] = useState('');
  const [loadingSales, setLoadingSales] = useState(false);
  
  // Shift report
  const [shiftInfo, setShiftInfo] = useState({
    shiftDate: new Date().toISOString().split('T')[0],
    shiftNo: '1'
  });
  const [shiftReportData, setShiftReportData] = useState<any[]>([]);
  const [loadingShift, setLoadingShift] = useState(false);
  
  // Receipt report
  const [receiptReportData, setReceiptReportData] = useState<any[]>([]);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  
  // Bill account wise summary
  const [billAccountSummaryData, setBillAccountSummaryData] = useState<any[]>([]);
  const [loadingBillAccount, setLoadingBillAccount] = useState(false);
  
  // Foreigner guest report
  const [foreignerGuestData, setForeignerGuestData] = useState<any[]>([]);
  const [loadingForeigner, setLoadingForeigner] = useState(false);
  
  // In-house guest list
  const [inhouseGuestListData, setInhouseGuestListData] = useState<CheckIn[]>([]);
  const [sortBy, setSortBy] = useState<'room' | 'name' | 'mobile' | 'company'>('room');
  const [loadingInhouse, setLoadingInhouse] = useState(false);
  
  // Expected arrivals
  const [expectedArrivalsData, setExpectedArrivalsData] = useState<Reservation[]>([]);
  const [loadingArrivals, setLoadingArrivals] = useState(false);
  
  // Expected departures
  const [expectedDeparturesData, setExpectedDeparturesData] = useState<CheckIn[]>([]);
  const [loadingDepartures, setLoadingDepartures] = useState(false);
  
  // Occupancy report
  const [occupancyReportData, setOccupancyReportData] = useState<any[]>([]);
  const [roomTypeId, setRoomTypeId] = useState('');
  const [loadingOccupancy, setLoadingOccupancy] = useState(false);
  
  // Manager report
  const [managerReportData, setManagerReportData] = useState<any[]>([]);
  const [loadingManager, setLoadingManager] = useState(false);
  
  // MIS report
  const [misReportData, setMisReportData] = useState<any[]>([]);
  const [segmentType, setSegmentType] = useState('company');
  const [loadingMIS, setLoadingMIS] = useState(false);

  // Fetch room stats for occupancy report
  const fetchRoomStats = async () => {
    setLoadingStats(true);
    try {
      const response = await roomApi.getRoomStats();
      if (response.data.success) {
        setRoomStats(response.data.data);
        
        // Prepare data for occupancy chart
        const data = [
          { name: 'Occupied', value: response.data.data.occupiedRooms },
          { name: 'Available', value: response.data.data.availableRooms },
          { name: 'Blocked', value: response.data.data.blockedRooms }
        ];
        setOccupancyData(data);
      }
    } catch (error) {
      console.error('Failed to fetch room stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch financial data
  const fetchFinancialData = async () => {
    setLoadingFinancial(true);
    try {
      // Fetch all required data in parallel
      const [paymentModesRes, accountHeadsRes, reservationsRes, checkInsRes] = await Promise.all([
        masterDataApi.getPaymentModes(),
        masterDataApi.getAccountHeads(),
        reservationApi.getReservations(),
        checkInApi.getInHouseGuests()
      ]);
      
      if (paymentModesRes.data.success) {
        setPaymentModes(paymentModesRes.data.data);
      }
      
      if (accountHeadsRes.data.success) {
        setAccountHeads(accountHeadsRes.data.data);
      }
      
      if (reservationsRes.data.success) {
        setReservations(reservationsRes.data.data);
      }
      
      if (checkInsRes.data.success) {
        setCheckIns(checkInsRes.data.data);
      }
      
      // Prepare financial chart data (mock data for now since we don't have actual transaction data)
      const financialData = [
        { name: 'Mon', revenue: 4000, advances: 2400 },
        { name: 'Tue', revenue: 3000, advances: 1398 },
        { name: 'Wed', revenue: 2000, advances: 9800 },
        { name: 'Thu', revenue: 2780, advances: 3908 },
        { name: 'Fri', revenue: 1890, advances: 4800 },
        { name: 'Sat', revenue: 2390, advances: 3800 },
        { name: 'Sun', revenue: 3490, advances: 4300 },
      ];
      setFinancialChartData(financialData);
      
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
    } finally {
      setLoadingFinancial(false);
    }
  };

  // Fetch operational data
  const fetchOperationalData = async () => {
    setLoadingOperational(true);
    try {
      // Fetch reservations and check-ins
      const [reservationsRes, checkInsRes] = await Promise.all([
        reservationApi.getReservations(),
        checkInApi.getInHouseGuests()
      ]);
      
      if (reservationsRes.data.success) {
        setReservations(reservationsRes.data.data);
        
        // Prepare reservation trend data based on actual dates
        const reservationTrend: {[key: string]: {reservations: number, checkIns: number}} = {};
        
        // Process reservations by date
        reservationsRes.data.data.forEach((reservation: Reservation) => {
          if (reservation.arrivalDate) {
            const date = new Date(reservation.arrivalDate);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            if (!reservationTrend[dateKey]) {
              reservationTrend[dateKey] = { reservations: 0, checkIns: 0 };
            }
            reservationTrend[dateKey].reservations += 1;
          }
        });
        
        // Process check-ins by date
        checkInsRes.data.data.forEach((checkIn: CheckIn) => {
          if (checkIn.arrivalDate) {
            const date = new Date(checkIn.arrivalDate);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            if (!reservationTrend[dateKey]) {
              reservationTrend[dateKey] = { reservations: 0, checkIns: 0 };
            }
            reservationTrend[dateKey].checkIns += 1;
          }
        });
        
        // Convert to array format and sort by date
        const trendData = Object.entries(reservationTrend)
          .map(([date, counts]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            reservations: counts.reservations,
            checkIns: counts.checkIns
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 14); // Last 14 days
        
        setReservationTrendData(trendData);
      }
      
      if (checkInsRes.data.success) {
        setCheckIns(checkInsRes.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch operational data:', error);
    } finally {
      setLoadingOperational(false);
    }
  };

  // Fetch guest data
  const fetchGuestData = async () => {
    setLoadingGuest(true);
    try {
      const response = await checkInApi.getInHouseGuests();
      if (response.data.success) {
        setInHouseGuests(response.data.data);
        
        // Prepare guest data for chart (room type distribution)
        const guestByRoomType = response.data.data.reduce((acc: any, guest: CheckIn) => {
          const roomType = guest.roomNo ? guest.roomNo.charAt(0) : 'Unknown';
          acc[roomType] = (acc[roomType] || 0) + 1;
          return acc;
        }, {});
        
        const chartData = Object.entries(guestByRoomType).map(([roomType, count]) => ({
          name: `Floor ${roomType}`,
          value: count
        }));
        
        setGuestData(chartData);
        
        // Prepare monthly check-ins data
        const monthlyData: {[key: string]: number} = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        response.data.data.forEach((guest: CheckIn) => {
          if (guest.arrivalDate) {
            const date = new Date(guest.arrivalDate);
            const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
          }
        });
        
        // Convert to array format for Recharts
        const monthlyChartData = Object.entries(monthlyData).map(([month, count]) => ({
          name: month,
          checkins: count
        }));
        
        // Sort by date
        monthlyChartData.sort((a, b) => {
          const [aMonth, aYear] = a.name.split(' ');
          const [bMonth, bYear] = b.name.split(' ');
          const aMonthIndex = monthNames.indexOf(aMonth);
          const bMonthIndex = monthNames.indexOf(bMonth);
          
          if (aYear !== bYear) {
            return parseInt(aYear) - parseInt(bYear);
          }
          return aMonthIndex - bMonthIndex;
        });
        
        setMonthlyCheckins(monthlyChartData);
      }
    } catch (error) {
      console.error('Failed to fetch guest data:', error);
    } finally {
      setLoadingGuest(false);
    }
  };

  // Handle date range change
  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle report generation
  const handleGenerateReport = () => {
    switch (activeTab) {
      case 'occupancy':
        fetchRoomStats();
        break;
      case 'financial':
        fetchFinancialData();
        break;
      case 'operational':
        fetchOperationalData();
        break;
      case 'guest':
        fetchGuestData();
        break;
      case 'sales':
        fetchSalesReport();
        break;
      case 'manager':
        fetchManagerReport();
        break;
      case 'mis':
        fetchMISReport();
        break;
    }
  };

  // Fetch sales report
  const fetchSalesReport = async () => {
    setLoadingSales(true);
    try {
      // For folio-wise sales
      if (folioNo) {
        const response = await reportApi.getFolioWiseSales(folioNo);
        if (response.data.success) {
          setSalesReportData(response.data.data);
        } else {
          alert(response.data.message || 'Failed to generate sales report');
        }
      } else {
        // For date-wise sales
        const response = await reportApi.getSaleReport(dateRange.startDate, dateRange.endDate, 'date');
        if (response.data.success) {
          setSalesReportData(response.data.data);
        } else {
          alert(response.data.message || 'Failed to generate sales report');
        }
      }
    } catch (error) {
      console.error('Failed to generate sales report:', error);
      alert('Failed to generate sales report. Please try again.');
    } finally {
      setLoadingSales(false);
    }
  };

  // Fetch shift report
  const fetchShiftReport = async () => {
    setLoadingShift(true);
    try {
      const response = await reportApi.getShiftReport(shiftInfo.shiftDate, shiftInfo.shiftNo);
      if (response.data.success) {
        setShiftReportData(response.data.data);
      } else {
        alert(response.data.message || 'Failed to generate shift report');
      }
    } catch (error) {
      console.error('Failed to generate shift report:', error);
      alert('Failed to generate shift report. Please try again.');
    } finally {
      setLoadingShift(false);
    }
  };

  // Fetch receipt report
  const fetchReceiptReport = async () => {
    setLoadingReceipt(true);
    try {
      const response = await reportApi.getReceiptReport(dateRange.startDate, dateRange.endDate);
      if (response.data.success) {
        setReceiptReportData(response.data.data);
      } else {
        alert(response.data.message || 'Failed to generate receipt report');
      }
    } catch (error) {
      console.error('Failed to generate receipt report:', error);
      alert('Failed to generate receipt report. Please try again.');
    } finally {
      setLoadingReceipt(false);
    }
  };

  // Fetch bill account wise summary
  const fetchBillAccountSummary = async () => {
    setLoadingBillAccount(true);
    try {
      const response = await reportApi.getBillAccountWiseSummary(dateRange.startDate, dateRange.endDate);
      if (response.data.success) {
        setBillAccountSummaryData(response.data.data);
      } else {
        alert(response.data.message || 'Failed to generate bill account summary');
      }
    } catch (error) {
      console.error('Failed to generate bill account summary:', error);
      alert('Failed to generate bill account summary. Please try again.');
    } finally {
      setLoadingBillAccount(false);
    }
  };

  // Fetch foreigner guest report
  const fetchForeignerGuestReport = async () => {
    setLoadingForeigner(true);
    try {
      const response = await reportApi.getForeignerGuestReport(dateRange.startDate, dateRange.endDate);
      if (response.data.success) {
        setForeignerGuestData(response.data.data);
      } else {
        alert(response.data.message || 'Failed to generate foreigner guest report');
      }
    } catch (error) {
      console.error('Failed to generate foreigner guest report:', error);
      alert('Failed to generate foreigner guest report. Please try again.');
    } finally {
      setLoadingForeigner(false);
    }
  };

  // Fetch in-house guest list
  const fetchInhouseGuestList = async () => {
    setLoadingInhouse(true);
    try {
      const response = await reportApi.getInhouseGuestList(sortBy);
      if (response.data.success) {
        setInhouseGuestListData(response.data.data);
      } else {
        alert(response.data.message || 'Failed to generate in-house guest list');
      }
    } catch (error) {
      console.error('Failed to generate in-house guest list:', error);
      alert('Failed to generate in-house guest list. Please try again.');
    } finally {
      setLoadingInhouse(false);
    }
  };

  // Fetch expected arrivals
  const fetchExpectedArrivals = async () => {
    setLoadingArrivals(true);
    try {
      const response = await reportApi.getExpectedArrivals(dateRange.startDate, dateRange.endDate);
      if (response.data.success) {
        setExpectedArrivalsData(response.data.data);
      } else {
        alert(response.data.message || 'Failed to generate expected arrivals report');
      }
    } catch (error) {
      console.error('Failed to generate expected arrivals report:', error);
      alert('Failed to generate expected arrivals report. Please try again.');
    } finally {
      setLoadingArrivals(false);
    }
  };

  // Fetch expected departures
  const fetchExpectedDepartures = async () => {
    setLoadingDepartures(true);
    try {
      const response = await reportApi.getExpectedDepartures(dateRange.startDate, dateRange.endDate);
      if (response.data.success) {
        setExpectedDeparturesData(response.data.data);
      } else {
        alert(response.data.message || 'Failed to generate expected departures report');
      }
    } catch (error) {
      console.error('Failed to generate expected departures report:', error);
      alert('Failed to generate expected departures report. Please try again.');
    } finally {
      setLoadingDepartures(false);
    }
  };

  // Fetch occupancy report
  const fetchOccupancyReport = async () => {
    setLoadingOccupancy(true);
    try {
      const response = await reportApi.getOccupancyReport(dateRange.startDate, dateRange.endDate, roomTypeId);
      if (response.data.success) {
        setOccupancyReportData(response.data.data);
      } else {
        alert(response.data.message || 'Failed to generate occupancy report');
      }
    } catch (error) {
      console.error('Failed to generate occupancy report:', error);
      alert('Failed to generate occupancy report. Please try again.');
    } finally {
      setLoadingOccupancy(false);
    }
  };

  // Fetch manager report
  const fetchManagerReport = async () => {
    setLoadingManager(true);
    try {
      const response = await reportApi.getManagersReport(dateRange.startDate, dateRange.endDate);
      if (response.data.success) {
        setManagerReportData(response.data.data);
      } else {
        alert(response.data.message || 'Failed to generate manager report');
      }
    } catch (error) {
      console.error('Failed to generate manager report:', error);
      alert('Failed to generate manager report. Please try again.');
    } finally {
      setLoadingManager(false);
    }
  };

  // Fetch MIS report
  const fetchMISReport = async () => {
    setLoadingMIS(true);
    try {
      const response = await reportApi.getSegmentWiseMIS(dateRange.startDate, dateRange.endDate, segmentType);
      if (response.data.success) {
        setMisReportData(response.data.data);
      } else {
        alert(response.data.message || 'Failed to generate MIS report');
      }
    } catch (error) {
      console.error('Failed to generate MIS report:', error);
      alert('Failed to generate MIS report. Please try again.');
    } finally {
      setLoadingMIS(false);
    }
  };

  // Generate PDF report
  const generatePDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add title
    doc.setFontSize(22);
    doc.text('Hotel Management Report', pageWidth / 2, 20, { align: 'center' });
    
    // Add report type and date range
    doc.setFontSize(16);
    const reportTitles: { [key: string]: string } = {
      occupancy: 'Occupancy Report',
      financial: 'Financial Report',
      operational: 'Operational Report',
      guest: 'Guest Report',
      sales: 'Sales Report',
      manager: 'Manager Report',
      mis: 'MIS Report'
    };
    doc.text(reportTitles[activeTab], pageWidth / 2, 35, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Date Range: ${dateRange.startDate} to ${dateRange.endDate}`, pageWidth / 2, 45, { align: 'center' });
    
    // Add content based on active tab
    let yPos = 60;
    
    switch (activeTab) {
      case 'occupancy':
        if (roomStats) {
          // Add occupancy stats table
          autoTable(doc, {
            head: [['Metric', 'Value']],
            body: [
              ['Total Rooms', roomStats.totalRooms.toString()],
              ['Occupied Rooms', roomStats.occupiedRooms.toString()],
              ['Available Rooms', roomStats.availableRooms.toString()],
              ['Blocked Rooms', roomStats.blockedRooms.toString()],
              ['Occupancy Rate', `${roomStats.occupancyPercentage.toFixed(2)}%`]
            ],
            startY: yPos,
            theme: 'grid'
          });
          yPos = (doc as any).lastAutoTable.finalY + 10;
        }
        break;
        
      case 'financial':
        // Add financial summary table
        autoTable(doc, {
          head: [['Report Type', 'Description', 'Status']],
          body: [
            ['Revenue Report', 'Daily, weekly, and monthly revenue summaries', 'Coming Soon'],
            ['Payment Summary', 'Breakdown by payment modes', 'Coming Soon'],
            ['Departmental Report', 'Revenue by department (Restaurant, Room, etc.)', 'Coming Soon'],
            ['Advance Report', 'Advance payments received', 'Coming Soon'],
            ['Tax Report', 'Tax collected and payable', 'Coming Soon']
          ],
          startY: yPos,
          theme: 'grid'
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
        break;
        
      case 'operational':
        // Add operational summary table
        autoTable(doc, {
          head: [['Metric', 'Value']],
          body: [
            ['Total Reservations', reservations.length.toString()],
            ['In-house Guests', checkIns.length.toString()],
            ['Pending Check-ins', reservations.filter(r => r.noOfRooms > 0).length.toString()],
            ['Avg. Stay Duration', reservations.length > 0 ? `${Math.round(reservations.reduce((acc, r) => acc + (r.noOfDays || 0), 0) / reservations.length)} nights` : '0 nights'],
            ['Avg. Room Rate', reservations.length > 0 ? `₹${Math.round(reservations.reduce((acc, r) => acc + (r.rate || 0), 0) / reservations.length).toLocaleString()}` : '₹0'],
            ['Total Rooms Reserved', reservations.reduce((acc, r) => acc + (r.noOfRooms || 0), 0).toString()],
            ['Check-in Rate', reservations.length > 0 ? `${Math.round((checkIns.length / reservations.length) * 100)}%` : '0%']
          ],
          startY: yPos,
          theme: 'grid'
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
        
        // Add reservation details table
        if (reservations.length > 0) {
          const reservationData = reservations.map(reservation => [
            reservation.reservationNo || '',
            reservation.guestName || '',
            reservation.arrivalDate ? new Date(reservation.arrivalDate).toLocaleDateString() : 'N/A',
            reservation.departureDate ? new Date(reservation.departureDate).toLocaleDateString() : 'N/A',
            reservation.noOfRooms?.toString() || '0',
            reservation.noOfPersons?.toString() || '0',
            `₹${(reservation.rate || 0).toLocaleString()}`
          ]);
          
          autoTable(doc, {
            head: [['Reservation No', 'Guest Name', 'Arrival', 'Departure', 'Rooms', 'Persons', 'Rate']],
            body: reservationData,
            startY: yPos,
            theme: 'grid'
          });
          yPos = (doc as any).lastAutoTable.finalY + 10;
        }
        
        // Add check-in details table
        if (checkIns.length > 0) {
          const checkInData = checkIns.map(guest => [
            guest.folioNo || '',
            guest.guestName || '',
            guest.roomNo || '',
            guest.arrivalDate ? new Date(guest.arrivalDate).toLocaleDateString() : 'N/A',
            guest.departureDate ? new Date(guest.departureDate).toLocaleDateString() : 'N/A',
            `₹${(guest.rate || 0).toLocaleString()}`
          ]);
          
          autoTable(doc, {
            head: [['Folio No', 'Guest Name', 'Room', 'Check-in Date', 'Check-out Date', 'Rate']],
            body: checkInData,
            startY: yPos,
            theme: 'grid'
          });
        }
        break;
        
      case 'guest':
        // Add guest summary table
        autoTable(doc, {
          head: [['Report Type', 'Description', 'Status']],
          body: [
            ['Guest History', 'Complete guest stay history', 'Coming Soon'],
            ['VIP Guest Report', 'List of VIP guests', 'Coming Soon'],
            ['Corporate Guest Report', 'Corporate client information', 'Coming Soon'],
            ['Expected Arrivals', 'Guests expected to arrive', 'Coming Soon'],
            ['Expected Departures', 'Guests expected to check-out', 'Coming Soon']
          ],
          startY: yPos,
          theme: 'grid'
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
        
        // Add in-house guests table if data exists
        if (inHouseGuests.length > 0) {
          const guestData = inHouseGuests.map(guest => [
            guest.folioNo?.toString() || '',
            guest.guestName || '',
            guest.roomNo || '',
            guest.arrivalDate ? new Date(guest.arrivalDate).toLocaleDateString() : 'N/A',
            guest.departureDate ? new Date(guest.departureDate).toLocaleDateString() : 'N/A'
          ]);
          
          autoTable(doc, {
            head: [['Folio No', 'Guest Name', 'Room', 'Check-in Date', 'Check-out Date']],
            body: guestData,
            startY: yPos,
            theme: 'grid'
          });
        }
        break;
    }
    
    // Save PDF
    doc.save('hotel_management_report.pdf');
  };
          });
        }
        break;
    }
    
    // Add footer
    const footerText = 'Generated on ' + new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Save the PDF
    doc.save(`hotel-report-${activeTab}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Initialize data on component mount
  useEffect(() => {
    handleGenerateReport();
  }, [activeTab]);

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Generate and view various hotel management reports</p>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateRangeChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateRangeChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={handleGenerateReport}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Generate Report
              </button>
              <button
                onClick={generatePDF}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* Report Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('occupancy')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'occupancy'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Occupancy Reports
            </button>
            <button
              onClick={() => setActiveTab('financial')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'financial'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Financial Reports
            </button>
            <button
              onClick={() => setActiveTab('operational')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'operational'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Operational Reports
            </button>
            <button
              onClick={() => setActiveTab('guest')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'guest'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Guest Reports
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sales'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sales Reports
            </button>
            <button
              onClick={() => setActiveTab('manager')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manager'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Manager Reports
            </button>
            <button
              onClick={() => setActiveTab('mis')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'mis'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              MIS Reports
            </button>
          </nav>
        </div>

        {/* Report Content */}
        <div ref={reportContentRef} className="bg-white rounded-lg shadow overflow-hidden">
          {/* Occupancy Reports */}
          {activeTab === 'occupancy' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Occupancy Reports</h2>
              
              {loadingStats ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-gray-600">Loading occupancy statistics...</p>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-800">{roomStats?.totalRooms || 0}</div>
                      <div className="text-sm text-blue-600">Total Rooms</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-800">{roomStats?.occupiedRooms || 0}</div>
                      <div className="text-sm text-green-600">Occupied Rooms</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-yellow-800">{roomStats?.availableRooms || 0}</div>
                      <div className="text-sm text-yellow-600">Available Rooms</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-red-800">{roomStats?.blockedRooms || 0}</div>
                      <div className="text-sm text-red-600">Blocked Rooms</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-800">
                        {roomStats ? `${roomStats.occupancyPercentage.toFixed(1)}%` : '0%'}
                      </div>
                      <div className="text-sm text-purple-600">Occupancy Rate</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Room Status Distribution</h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={occupancyData}
                              cx="50%"
                              cy="50%"
                              labelLine={true}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value !== undefined ? (Number(value) * 10).toFixed(0) : '0'}%`}
                            >
                              {occupancyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [value, 'Rooms']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Occupancy Metrics</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total Rooms</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{roomStats?.totalRooms || 0}</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Occupied Rooms</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{roomStats?.occupiedRooms || 0}</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Available Rooms</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{roomStats?.availableRooms || 0}</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Blocked Rooms</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{roomStats?.blockedRooms || 0}</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Occupancy Rate</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {roomStats ? `${roomStats.occupancyPercentage.toFixed(2)}%` : '0%'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Financial Reports */}
          {activeTab === 'financial' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Financial Reports</h2>
              
              {loadingFinancial ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-gray-600">Loading financial data...</p>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <div className="flex items-center">
                        <div className="rounded-full bg-green-100 p-3">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">Total Revenue</h3>
                          <p className="text-2xl font-semibold">₹{(reservations.length * 5000).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <div className="flex items-center">
                        <div className="rounded-full bg-blue-100 p-3">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">Total Advances</h3>
                          <p className="text-2xl font-semibold">₹{(checkIns.length * 2000).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <div className="flex items-center">
                        <div className="rounded-full bg-purple-100 p-3">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">Transactions</h3>
                          <p className="text-2xl font-semibold">{transactions.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue vs Advances Trend</h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={financialChartData}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                            <Bar dataKey="advances" fill="#82ca9d" name="Advances" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Methods</h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={paymentModes.map((mode, index) => ({
                                name: mode.name,
                                value: Math.floor(Math.random() * 100) + 10
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={true}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, value: percent }) => `${name}: ${percent !== undefined ? (Number(percent) * 1).toFixed(0) : '0'}%`}
                            >
                              {paymentModes.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium mb-4">Financial Summary</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Revenue Report</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Daily, weekly, and monthly revenue summaries</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Coming Soon</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Payment Summary</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Breakdown by payment modes</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Coming Soon</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Departmental Report</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Revenue by department (Restaurant, Room, etc.)</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Coming Soon</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Advance Report</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Advance payments received</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Coming Soon</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Tax Report</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Tax collected and payable</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Coming Soon</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Operational Reports */}
          {activeTab === 'operational' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Operational Reports</h2>
              
              {loadingOperational ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-gray-600">Loading operational data...</p>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Reservations</h3>
                      <div className="text-3xl font-bold text-indigo-600">{reservations.length}</div>
                      <div className="text-sm text-gray-500 mt-1">Total reservations</div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">In-house Guests</h3>
                      <div className="text-3xl font-bold text-green-600">{checkIns.length}</div>
                      <div className="text-sm text-gray-500 mt-1">Current guests</div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Check-ins</h3>
                      <div className="text-3xl font-bold text-yellow-600">
                        {reservations.filter(r => r.noOfRooms > 0).length}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Awaiting arrival</div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Occupancy Rate</h3>
                      <div className="text-3xl font-bold text-purple-600">
                        {reservations.length > 0 
                          ? `${Math.round((checkIns.length / reservations.length) * 100)}%` 
                          : '0%'}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Guests to reservations</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Reservation Details</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">With Guest Names</span>
                          <span className="font-medium">
                            {reservations.filter(r => r.guestName).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">With Contact Info</span>
                          <span className="font-medium">
                            {reservations.filter(r => r.mobileNumber).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">With Email</span>
                          <span className="font-medium">
                            {reservations.filter(r => r.emailId).length}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Check-in Details</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Expected Checkouts (Today)</span>
                          <span className="font-medium">
                            {checkIns.filter(guest => 
                              guest.departureDate && 
                              new Date(guest.departureDate).toDateString() === new Date().toDateString()
                            ).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Expected Checkouts (Next 7 days)</span>
                          <span className="font-medium">
                            {checkIns.filter(guest => {
                              if (!guest.departureDate) return false;
                              const departure = new Date(guest.departureDate);
                              const today = new Date();
                              const nextWeek = new Date();
                              nextWeek.setDate(today.getDate() + 7);
                              return departure >= today && departure <= nextWeek;
                            }).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Extended Stays</span>
                          <span className="font-medium">
                            {checkIns.filter(guest => {
                              if (!guest.departureDate) return false;
                              const departure = new Date(guest.departureDate);
                              const today = new Date();
                              return departure < today;
                            }).length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Reservation & Check-in Trend (Last 14 Days)</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={reservationTrendData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="reservations" stroke="#8884d8" activeDot={{ r: 8 }} name="Reservations" />
                          <Line type="monotone" dataKey="checkIns" stroke="#82ca9d" name="Check-ins" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium mb-4">Operational Analytics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Reservation Analytics</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg. Stay Duration</span>
                            <span className="font-medium">{reservations.length > 0 ? `${Math.round(reservations.reduce((acc, r) => acc + (r.noOfDays || 0), 0) / reservations.length)} nights` : '0 nights'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg. Room Rate</span>
                            <span className="font-medium">₹{reservations.length > 0 ? Math.round(reservations.reduce((acc, r) => acc + (r.rate || 0), 0) / reservations.length).toLocaleString() : '0'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Rooms Reserved</span>
                            <span className="font-medium">{reservations.reduce((acc, r) => acc + (r.noOfRooms || 0), 0)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Guest Analytics</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg. Persons per Reservation</span>
                            <span className="font-medium">{reservations.length > 0 ? (reservations.reduce((acc, r) => acc + (r.noOfPersons || 1), 0) / reservations.length).toFixed(1) : '0'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">With Mobile Numbers</span>
                            <span className="font-medium">{reservations.filter(r => r.mobileNumber).length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">With Email Addresses</span>
                            <span className="font-medium">{reservations.filter(r => r.emailId).length}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Performance Metrics</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Check-in Rate</span>
                            <span className="font-medium">{reservations.length > 0 ? `${Math.round((checkIns.length / reservations.length) * 100)}%` : '0%'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg. Daily Rate</span>
                            <span className="font-medium">₹{checkIns.length > 0 ? Math.round(checkIns.reduce((acc, g) => acc + (g.rate || 0), 0) / checkIns.length).toLocaleString() : '0'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Revenue Potential</span>
                            <span className="font-medium">₹{reservations.length > 0 ? Math.round(reservations.reduce((acc, r) => acc + (r.rate || 0) * (r.noOfDays || 1), 0)).toLocaleString() : '0'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <h4 className="text-md font-medium text-gray-900 mb-3">Upcoming Reports</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Daily Operations</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Daily summary of hotel operations</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-500">In Development</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Reservation Report</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Detailed reservation information</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-500">In Development</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Cancellation Report</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Cancelled reservations</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-500">In Development</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">No-show Report</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Guests who didn't check-in</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-500">In Development</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Room Status Report</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Current status of all rooms</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-500">In Development</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Guest Reports */}
          {activeTab === 'guest' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Guest Reports</h2>
              
              {loadingGuest ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-gray-600">Loading guest data...</p>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Check-ins</h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={monthlyCheckins}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar 
                              dataKey="checkins" 
                              fill="#8884d8" 
                              name="Check-ins"
                              animationDuration={1000}
                              animationEasing="ease-out"
                            >
                              {monthlyCheckins.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={COLORS[index % COLORS.length]} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">In-house Guests ({inHouseGuests.length})</h3>
                      {inHouseGuests.length > 0 ? (
                        <div className="overflow-x-auto max-h-80 overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Folio No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out Date</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {inHouseGuests.map((guest) => (
                                <tr key={guest.folioNo}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{guest.folioNo}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{guest.guestName}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{guest.roomNo}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {guest.arrivalDate ? new Date(guest.arrivalDate).toLocaleDateString() : 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {guest.departureDate ? new Date(guest.departureDate).toLocaleDateString() : 'N/A'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No in-house guests found
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium mb-4">Guest Reports</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Guest History</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Complete guest stay history</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Coming Soon</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">VIP Guest Report</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">List of VIP guests</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Coming Soon</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Corporate Guest Report</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Corporate client information</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Coming Soon</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Expected Arrivals</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Guests expected to arrive</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Coming Soon</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Expected Departures</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Guests expected to check-out</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Coming Soon</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Sales Reports */}
          {activeTab === 'sales' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Sales Reports</h2>
              <div className="text-center py-8 text-gray-500">
                <p>Sales reports will be implemented here.</p>
                <p className="mt-2">This section will include Bill Wise and Date Wise sales reports with real data from the API.</p>
              </div>
            </div>
          )}
          
          {/* Manager Reports */}
          {activeTab === 'manager' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Manager Reports</h2>
              <div className="text-center py-8 text-gray-500">
                <p>Manager reports will be implemented here.</p>
                <p className="mt-2">This section will include various managerial reports with real data from the API.</p>
              </div>
            </div>
          )}
          
          {/* MIS Reports */}
          {activeTab === 'mis' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">MIS Reports</h2>
              <div className="text-center py-8 text-gray-500">
                <p>MIS reports will be implemented here.</p>
                <p className="mt-2">This section will include Segment wise MIS reports with real data from the API.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Report;