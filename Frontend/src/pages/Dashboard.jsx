import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FiUsers, FiFileText, FiFolder, FiClipboard, FiTrendingUp, FiEye, FiEdit, 
  FiUserPlus, FiActivity, FiAlertCircle, FiCheckCircle, FiXCircle, FiCalendar, 
  FiMapPin, FiHeart, FiShield, FiPackage, FiUpload, FiBarChart2, FiPieChart,
  FiArrowRight, FiClock, FiBell, FiSettings, FiRefreshCw, FiDownload,
  FiUser, FiBriefcase, FiHome, FiDollarSign, FiGlobe, FiLayers
} from 'react-icons/fi';
import PatientRegistrationCalendar from '../components/PatientRegistrationCalendar';
import RoomPatientsModal from '../components/RoomPatientsModal';
import { selectCurrentUser, selectIsAuthenticated } from '../features/auth/authSlice';
import { 
  useGetAllPatientsQuery, 
  useGetPatientsStatsQuery, 
  useGetPatientStatsQuery,
  useGetAgeDistributionQuery
} from '../features/patients/patientsApiSlice';
import { 
  useGetClinicalStatsQuery, 
  useGetCasesByDecisionQuery, 
  useGetMyProformasQuery, 
  useGetComplexCasesQuery,
  useGetAllClinicalProformasQuery,
  useGetVisitTrendsQuery
} from '../features/clinical/clinicalApiSlice';
import { 
  useGetADLStatsQuery, 
  useGetFilesByStatusQuery, 
  useGetActiveFilesQuery,
  useGetAllADLFilesQuery
} from '../features/adl/adlApiSlice';
import { useGetAllPrescriptionQuery } from '../features/prescriptions/prescriptionApiSlice';
import { useGetPatientFilesQuery, useGetFileStatsQuery } from '../features/patients/patientFilesApiSlice';
import { useGetDoctorsQuery, useGetUserStatsQuery } from '../features/users/usersApiSlice';
import { useGetAllRoomsQuery, useGetAvailableRoomsQuery } from '../features/rooms/roomsApiSlice';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { isAdmin, isMWO, isJrSr, isSR, isJR } from '../utils/constants';
import { formatDate, formatDateTime } from '../utils/formatters';

// Chart components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Enhanced Stat Card Component with animations
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  colorClasses, 
  gradientFrom, 
  gradientTo, 
  to,
  subtitle,
  trend,
  isLoading = false
}) => {
  const content = (
    <div className={`group relative backdrop-blur-xl bg-white/70 border border-white/40 rounded-2xl p-6 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 ${isLoading ? 'animate-pulse' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">{title}</p>
          <p className="text-4xl font-extrabold text-gray-900 mb-1">{isLoading ? '...' : (value || 0)}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <FiTrendingUp className={`w-4 h-4 ${trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-400'}`} />
              <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 backdrop-blur-md bg-gradient-to-br ${colorClasses} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 border border-white/30`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  );

  if (to) {
    return <Link to={to} className="block">{content}</Link>;
  }
  return content;
};

// Quick Action Card Component
const QuickActionCard = ({ icon: Icon, title, description, to, colorClasses, onClick }) => {
  const content = (
    <div 
      className={`p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-opacity-100 hover:bg-gradient-to-br ${colorClasses} transition-all duration-200 text-center group shadow-sm hover:shadow-md cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex flex-col items-center">
        <div className={`p-3 rounded-full bg-gradient-to-br ${colorClasses.replace('hover:from-', 'from-').replace('hover:to-', 'to-').replace('50', '500').replace('50', '600')} group-hover:scale-110 transition-transform duration-200 mb-3 shadow-lg`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }
  return content;
};

// Activity Item Component
const ActivityItem = ({ icon: Icon, title, description, time, status, color }) => (
  <div className="flex items-start gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/40 hover:bg-white/70 transition-all duration-200">
    <div className={`p-2 rounded-lg bg-gradient-to-br ${color} shadow-md`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
      <div className="flex items-center gap-2 mt-2">
        <FiClock className="w-3 h-3 text-gray-400" />
        <span className="text-xs text-gray-500">{time}</span>
        {status && (
          <Badge 
            variant={status === 'completed' ? 'success' : status === 'pending' ? 'warning' : 'info'}
            className="ml-auto"
          >
            {status}
          </Badge>
        )}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // day, week, month
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedRoomForPatients, setSelectedRoomForPatients] = useState(null);
  
  // Role detection
  const isAdminUser = isAdmin(user?.role);
  const isMwo = isMWO(user?.role);
  const isResident = isJR(user?.role);
  const isFaculty = isSR(user?.role);
  const isJrSrUser = isJrSr(user?.role);
  
  // Don't make any queries if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Admin Stats - Full System Analytics
  const { data: patientStats, isLoading: patientsLoading } = useGetPatientStatsQuery(undefined, {
    skip: !isAdminUser,
    pollingInterval: isAdminUser ? 60000 : 0, // Increased from 30s to 60s
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false, // Disable auto-refetch on focus
  });

  const { data: clinicalStats, isLoading: clinicalLoading } = useGetClinicalStatsQuery(undefined, {
    skip: !isAdminUser,
    pollingInterval: isAdminUser ? 60000 : 0, // Increased from 30s to 60s
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
  });

  const { data: adlStats, isLoading: adlLoading } = useGetADLStatsQuery(undefined, {
    skip: !isAdminUser,
    pollingInterval: isAdminUser ? 60000 : 0, // Increased from 30s to 60s
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
  });

  const { data: userStats } = useGetUserStatsQuery(undefined, {
    skip: !isAdminUser,
    refetchOnMountOrArgChange: true,
  });

  // File stats - skip for MWO (Psychiatric Welfare Officer)
  const { data: fileStats } = useGetFileStatsQuery(undefined, {
    skip: !isAuthenticated || isMwo,
    refetchOnMountOrArgChange: true,
  });

  // Role-specific stats for Faculty/Resident
  const { data: decisionStats } = useGetCasesByDecisionQuery(
    isJrSrUser ? { user_id: user?.id } : undefined, 
    { 
      skip: !isAuthenticated || !isJrSrUser, 
      refetchOnMountOrArgChange: true 
    }
  );

  // Visit trends for all roles
  const { data: visitTrends } = useGetVisitTrendsQuery(
    { period: selectedPeriod, ...(isJrSrUser ? { user_id: user?.id } : {}) },
    { 
      skip: !isAuthenticated,
      refetchOnMountOrArgChange: true 
    }
  );

  // Get all assigned patients for Faculty/Resident dashboard
  // Note: Backend caps limit at 100, so we get up to 100 assigned patients
  const { data: allAssignedPatients } = useGetAllPatientsQuery(
    { page: 1, limit: 100 }, // Backend caps at 100
    { 
      skip: !isAuthenticated || !isJrSrUser,
      refetchOnMountOrArgChange: true 
    }
  );

  // Age distribution for admin
  const { data: ageDistribution } = useGetAgeDistributionQuery(undefined, {
    skip: !isAdminUser,
    refetchOnMountOrArgChange: true,
  });

  const { data: myProformas } = useGetMyProformasQuery({ page: 1, limit: 10 }, { 
    skip: !isJrSrUser, 
    refetchOnMountOrArgChange: true 
  });

  const { data: complexCases } = useGetComplexCasesQuery({ page: 1, limit: 5 }, { 
    skip: !isJrSrUser, 
    refetchOnMountOrArgChange: true 
  });

  const { data: activeADLFiles } = useGetActiveFilesQuery(undefined, { 
    skip: !isJrSrUser, 
    refetchOnMountOrArgChange: true 
  });

  // Role-specific stats for MWO (aggregated patient statistics)
  const { data: outpatientStats, isLoading: outpatientLoading } = useGetPatientsStatsQuery(undefined, { 
    skip: !isMwo, 
    refetchOnMountOrArgChange: true 
  });

  const { data: adlByStatus } = useGetFilesByStatusQuery(undefined, { 
    skip: !isMwo, 
    refetchOnMountOrArgChange: true 
  });

  const { data: myRecords } = useGetAllPatientsQuery({ page: 1, limit: 10 }, { 
    skip: !isMwo, 
    refetchOnMountOrArgChange: true 
  });

  // Get all patients for MWO to calculate state-wise distribution
  const { data: allPatientsForMWO } = useGetAllPatientsQuery({ page: 1, limit: 100 }, { 
    skip: !isMwo, 
    refetchOnMountOrArgChange: true 
  });

  // Get all rooms for MWO to calculate total rooms count
  const { data: allRoomsForMWO } = useGetAllRoomsQuery({ page: 1, limit: 1000 }, { 
    skip: !isMwo, 
    refetchOnMountOrArgChange: true 
  });

  // Get all patients for Admin to calculate state distribution and weekly patients
  const { data: allPatientsForAdmin } = useGetAllPatientsQuery({ page: 1, limit: 100 }, { 
    skip: !isAdminUser, 
    refetchOnMountOrArgChange: true 
  });

  // Get all rooms for Admin to calculate total rooms count
  const { data: allRoomsForAdmin } = useGetAllRoomsQuery({ page: 1, limit: 1000 }, { 
    skip: !isAdminUser, 
    refetchOnMountOrArgChange: true 
  });

  // Get room distribution with patient counts for today
  const { data: roomDistributionData } = useGetAvailableRoomsQuery(undefined, {
    skip: !isAdminUser,
    pollingInterval: isAdminUser ? 60000 : 0,
    refetchOnMountOrArgChange: true,
  });

  // Get recent prescriptions - skip for MWO (Psychiatric Welfare Officer)
  const { data: recentPrescriptions } = useGetAllPrescriptionQuery({ 
    page: 1, 
    limit: 5 
  }, { 
    skip: isMwo,
    refetchOnMountOrArgChange: true 
  });

  // Get recent ADL files - skip for MWO (Psychiatric Welfare Officer)
  const { data: recentADLFiles } = useGetAllADLFilesQuery({ 
    page: 1, 
    limit: 5 
  }, { 
    skip: isMwo,
    refetchOnMountOrArgChange: true 
  });

  // Get recent clinical proformas - skip for MWO (Psychiatric Welfare Officer)
  const { data: recentClinicalProformas } = useGetAllClinicalProformasQuery({ 
    page: 1, 
    limit: 5 
  }, { 
    skip: isMwo,
    refetchOnMountOrArgChange: true 
  });

  // Calculate total staff from user stats
  const totalStaff = useMemo(() => {
    if (!userStats?.data?.stats || !Array.isArray(userStats.data.stats)) return 0;
    return userStats.data.stats.reduce((sum, item) => {
      // Count Faculty, Residents, and Psychiatric Welfare Officer as staff
      const role = item.role || '';
      if (role === 'Faculty' || role === 'Resident' || role === 'Psychiatric Welfare Officer') {
        return sum + (parseInt(item.count, 10) || 0);
      }
      return sum;
    }, 0);
  }, [userStats]);

  // Calculate state-wise distribution from all patients for Admin (moved outside conditional)
  const adminStateDistribution = useMemo(() => {
    if (!isAdminUser || !allPatientsForAdmin?.data?.patients) return [];
    const patients = allPatientsForAdmin.data.patients;
    const stateMap = {};
    
    patients.forEach(p => {
      const state = p.state || 'Unknown';
      stateMap[state] = (stateMap[state] || 0) + 1;
    });
    
    return Object.entries(stateMap)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);
  }, [allPatientsForAdmin, isAdminUser]);

  // Calculate weekly patients (last 7 days) for Admin (moved outside conditional)
  const weeklyPatients = useMemo(() => {
    if (!isAdminUser || !allPatientsForAdmin?.data?.patients) return [];
    const patients = allPatientsForAdmin.data.patients;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    return patients
      .filter(p => {
        const createdDate = p.created_at ? new Date(p.created_at) : null;
        if (!createdDate) return false;
        const patientDate = new Date(createdDate);
        patientDate.setHours(0, 0, 0, 0);
        return patientDate >= sevenDaysAgo && patientDate <= today;
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB - dateA;
      });
  }, [allPatientsForAdmin, isAdminUser]);

  // Calculate state-wise distribution from all patients for MWO (moved outside conditional)
  const stateDistribution = useMemo(() => {
    if (!isMwo || !allPatientsForMWO?.data?.patients) return [];
    const patients = allPatientsForMWO.data.patients;
    const stateMap = {};
    
    patients.forEach(p => {
      const state = p.state || 'Unknown';
      stateMap[state] = (stateMap[state] || 0) + 1;
    });
    
    return Object.entries(stateMap)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);
  }, [allPatientsForMWO, isMwo]);

  // Calculate urban and rural counts from patient records for MWO (moved outside conditional)
  const localityStats = useMemo(() => {
    if (!isMwo || !allPatientsForMWO?.data?.patients) {
      return { urban: 0, rural: 0, total: 0 };
    }
    const patients = allPatientsForMWO.data.patients;
    let urban = 0;
    let rural = 0;
    
    patients.forEach(p => {
      const locality = (p.locality || '').toLowerCase().trim();
      if (locality === 'urban') {
        urban++;
      } else if (locality === 'rural') {
        rural++;
      }
    });
    
    return {
      urban,
      rural,
      total: urban + rural
    };
  }, [allPatientsForMWO, isMwo]);

  // Calculate marital status distribution from all patients for MWO (moved outside conditional)
  const maritalStatusDistribution = useMemo(() => {
    if (!isMwo || !allPatientsForMWO?.data?.patients) {
      return {
        married: 0,
        unmarried: 0,
        widow_widower: 0,
        divorced: 0,
        other: 0
      };
    }
    const patients = allPatientsForMWO.data.patients;
    const maritalMap = {
      married: 0,
      unmarried: 0,
      widow_widower: 0,
      divorced: 0,
      other: 0
    };
    
    patients.forEach(p => {
      const maritalStatus = (p.marital_status || '').toLowerCase().trim();
      if (maritalStatus === 'married') {
        maritalMap.married++;
      } else if (maritalStatus === 'unmarried' || maritalStatus === 'single') {
        maritalMap.unmarried++;
      } else if (maritalStatus === 'widow' || maritalStatus === 'widower' || maritalStatus === 'widow/widower') {
        maritalMap.widow_widower++;
      } else if (maritalStatus === 'divorced') {
        maritalMap.divorced++;
      } else if (maritalStatus) {
        maritalMap.other++;
      }
    });
    
    return maritalMap;
  }, [allPatientsForMWO, isMwo]);

  const isLoading = isAdminUser ? (patientsLoading || clinicalLoading || adlLoading) : false;

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    }
  };

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      },
      x: {
        ticks: {
          autoSkip: true,
          maxRotation: 0,
          minRotation: 0
        }
      }
    }
  };

  // Chart data preparation
  const genderChartData = {
    labels: ['Male', 'Female', 'Other'],
    datasets: [{
      data: [
        patientStats?.data?.stats?.male_patients || 0,
        patientStats?.data?.stats?.female_patients || 0,
        patientStats?.data?.stats?.other_patients || 0
      ],
      backgroundColor: ['#3B82F6', '#EC4899', '#8B5CF6'],
      borderColor: ['#1D4ED8', '#BE185D', '#7C3AED'],
      borderWidth: 2,
    }],
  };

  const visitTypeChartData = {
    labels: ['First Visit', 'Follow-up'],
    datasets: [{
      label: 'Visits',
      data: [
        clinicalStats?.data?.stats?.first_visits || 0,
        clinicalStats?.data?.stats?.follow_ups || 0
      ],
      backgroundColor: ['#10B981', '#F59E0B'],
      borderColor: ['#059669', '#D97706'],
      borderWidth: 2,
    }],
  };

  const adlStatusArray = adlByStatus?.data?.statusStats || [];
  const adlStatusMap = adlStatusArray.reduce((acc, item) => {
    acc[item.file_status] = parseInt(item.count, 10) || 0;
    return acc;
  }, {});

  const adlStatusChartData = {
    labels: ['Active', 'Stored', 'Retrieved', 'Archived'],
    datasets: [{
      data: [
        isAdminUser ? (adlStats?.data?.stats?.created_files || 0) : (adlStatusMap.active || 0),
        isAdminUser ? (adlStats?.data?.stats?.stored_files || 0) : (adlStatusMap.stored || 0),
        isAdminUser ? (adlStats?.data?.stats?.retrieved_files || 0) : (adlStatusMap.retrieved || 0),
        isAdminUser ? (adlStats?.data?.stats?.archived_files || 0) : (adlStatusMap.archived || 0)
      ],
      backgroundColor: ['#EF4444', '#10B981', '#F59E0B', '#6B7280'],
      borderColor: ['#DC2626', '#059669', '#D97706', '#4B5563'],
      borderWidth: 2,
    }],
  };

  // Patient visit trend data from API
  const visitTrendData = useMemo(() => {
    if (!visitTrends?.data?.trends || visitTrends.data.trends.length === 0) {
      return {
        labels: selectedPeriod === 'day' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] :
                selectedPeriod === 'week' ? ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'] :
                ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Patient Visits',
          data: [],
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
        }],
      };
    }

    const trends = visitTrends.data.trends;
    let labels = [];
    let data = [];

    if (selectedPeriod === 'day') {
      // Format dates for last 7 days
      labels = trends.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      });
      data = trends.map(item => parseInt(item.count, 10) || 0);
    } else if (selectedPeriod === 'week') {
      // Format weeks
      labels = trends.map((item, idx) => {
        const weekStart = new Date(item.week_start);
        return `Week ${idx + 1}`;
      });
      data = trends.map(item => parseInt(item.count, 10) || 0);
    } else {
      // Format months
      labels = trends.map(item => {
        const monthStart = new Date(item.month_start);
        return monthStart.toLocaleDateString('en-US', { month: 'short' });
      });
      data = trends.map(item => parseInt(item.count, 10) || 0);
    }

    return {
      labels,
      datasets: [{
        label: 'Patient Visits',
        data,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      }],
    };
  }, [visitTrends, selectedPeriod]);

  // Age distribution chart data
  const ageChartData = useMemo(() => {
    if (!ageDistribution?.data?.distribution || ageDistribution.data.distribution.length === 0) {
      return {
        labels: ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'],
        datasets: [{
          label: 'Number of Patients',
          data: [0, 0, 0, 0, 0, 0],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(29, 78, 216, 1)',
          borderWidth: 1,
        }],
      };
    }

    const distribution = ageDistribution.data.distribution;
    const labels = distribution.map(item => item.age_group);
    const data = distribution.map(item => parseInt(item.count, 10) || 0);

    return {
      labels,
      datasets: [{
        label: 'Number of Patients',
        data,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(29, 78, 216, 1)',
        borderWidth: 1,
      }],
    };
  }, [ageDistribution]);

  // State-wise chart data for admin (moved before early return)
  const adminStateChartData = useMemo(() => {
    if (!isAdminUser || !adminStateDistribution || adminStateDistribution.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'Number of Patients',
          data: [0],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(29, 78, 216, 1)',
          borderWidth: 2,
        }],
      };
    }
    return {
      labels: adminStateDistribution.map(item => item.state),
      datasets: [{
        label: 'Number of Patients',
        data: adminStateDistribution.map(item => item.count),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(29, 78, 216, 1)',
        borderWidth: 2,
      }],
    };
  }, [adminStateDistribution, isAdminUser]);

  // State-wise chart data for MWO (moved before early return)
  const stateChartData = useMemo(() => {
    if (!isMwo || !stateDistribution || stateDistribution.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'Number of Patients',
          data: [0],
          backgroundColor: 'rgba(139, 92, 246, 0.8)',
          borderColor: 'rgba(124, 58, 237, 1)',
          borderWidth: 2,
        }],
      };
    }
    return {
      labels: stateDistribution.map(item => item.state),
      datasets: [{
        label: 'Number of Patients',
        data: stateDistribution.map(item => item.count),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgba(124, 58, 237, 1)',
        borderWidth: 2,
      }],
    };
  }, [stateDistribution, isMwo]);

  // Marital status chart data for MWO (moved before early return)
  const maritalStatusChartData = useMemo(() => {
    if (!isMwo || !maritalStatusDistribution) {
      return {
        labels: ['Married', 'Unmarried', 'Widow/Widower', 'Divorced', 'Other'],
        datasets: [{
          data: [0, 0, 0, 0, 0],
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
        borderColor: ['#1D4ED8', '#059669', '#D97706', '#DC2626', '#7C3AED'],
          borderWidth: 2,
        }],
      };
    }
    return {
      labels: ['Married', 'Unmarried', 'Widow/Widower', 'Divorced', 'Other'],
      datasets: [{
        data: [
          maritalStatusDistribution.married,
          maritalStatusDistribution.unmarried,
          maritalStatusDistribution.widow_widower,
          maritalStatusDistribution.divorced,
          maritalStatusDistribution.other,
        ],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
        borderColor: ['#1D4ED8', '#059669', '#D97706', '#DC2626', '#7C3AED'],
        borderWidth: 2,
      }],
    };
  }, [maritalStatusDistribution, isMwo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ==================== ADMIN DASHBOARD ====================
  if (isAdminUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Welcome Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.name || 'Admin'}! 👑
              </h1>
              <p className="text-gray-600 mt-1">System Administrator Dashboard - Full System Analytics</p>
            </div>
            <Button
              onClick={() => setIsCalendarOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 flex items-center gap-2"
            >
              <FiCalendar className="w-5 h-5" />
              View Registration Calendar
            </Button>
          </div>

          {/* Admin KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Patients"
              value={patientStats?.data?.stats?.total_patients || 0}
              icon={FiUsers}
              colorClasses="from-blue-500 to-blue-600"
              to="/patients"
              subtitle="Registered patients"
            />
            <StatCard
              title="Total ADL Files"
              value={adlStats?.data?.stats?.total_files || 0}
              icon={FiFolder}
              colorClasses="from-purple-500 to-purple-600"
              subtitle="Outpatient intake records"
            />
            <StatCard
              title="Total Staff"
              value={totalStaff}
              icon={FiBriefcase}
              colorClasses="from-orange-500 to-orange-600"
              to="/users"
              subtitle="Faculty + Residents"
            />
            <StatCard
              title="Total Rooms"
              value={allRoomsForAdmin?.data?.pagination?.total || allRoomsForAdmin?.data?.rooms?.length || 0}
              icon={FiHome}
              colorClasses="from-green-500 to-green-600"
              to="/rooms"
              subtitle="All available rooms"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Total Patient Gender Distribution */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <FiPieChart className="w-5 h-5 text-primary-600" />
                  <span>Total Patient Gender Distribution</span>
                </div>
              }
              className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
            >
              <div className="h-80">
                <Doughnut 
                  data={genderChartData} 
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        ...chartOptions.plugins.title,
                        text: 'Total Patient Gender Distribution'
                      }
                    }
                  }} 
                />
              </div>
            </Card>

            {/* Total Distribution by State-wise */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <FiBarChart2 className="w-5 h-5 text-primary-600" />
                  <span>Total Distribution by State-wise</span>
                </div>
              }
              className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
            >
              <div className="h-80">
                <Bar 
                  data={adminStateChartData} 
                  options={{
                    ...barChartOptions,
                    plugins: {
                      ...barChartOptions.plugins,
                      title: {
                        ...barChartOptions.plugins.title,
                        text: 'Total Distribution by State-wise'
                      }
                    },
                    scales: {
                      y: {
                        ...(barChartOptions.scales?.y || {}),
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1
                        }
                      },
                      x: {
                        ...(barChartOptions.scales?.x || {}),
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45,
                          autoSkip: true
                        }
                      }
                    }
                  }} 
                />
              </div>
            </Card>
          </div>

          {/* Rooms with Patient Counts Section */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <FiHome className="w-5 h-5 text-primary-600" />
                <span>Rooms & Patient Assignments (Today)</span>
              </div>
            }
            className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
          >
            {(() => {
              const rooms = allRoomsForAdmin?.data?.rooms || [];
              const distributionToday = roomDistributionData?.data?.distribution_today || {};
              
              // Combine rooms with patient counts
              const roomsWithCounts = rooms
                .filter(room => room.is_active)
                .map(room => ({
                  ...room,
                  patientCount: distributionToday[room.room_number] || 0
                }))
                .sort((a, b) => {
                  // Sort by patient count (descending), then by room number
                  if (b.patientCount !== a.patientCount) {
                    return b.patientCount - a.patientCount;
                  }
                  return a.room_number.localeCompare(b.room_number);
                });

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {roomsWithCounts.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      No active rooms found
                    </div>
                  ) : (
                    roomsWithCounts.map((room) => (
                      <div
                        key={room.id}
                        onClick={() => setSelectedRoomForPatients(room.room_number)}
                        className={`
                          p-4 rounded-lg border-2 cursor-pointer transition-all transform hover:scale-105
                          ${room.patientCount > 0
                            ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg'
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:shadow-md'
                          }
                        `}
                      >
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className={`
                            w-12 h-12 rounded-full flex items-center justify-center
                            ${room.patientCount > 0
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-400'
                            }
                          `}>
                            <FiHome className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{room.room_number}</p>
                            <p className="text-xs text-gray-600 mt-1">Room</p>
                          </div>
                          <div className={`
                            px-3 py-1 rounded-full text-sm font-bold
                            ${room.patientCount > 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                            }
                          `}>
                            {room.patientCount} {room.patientCount === 1 ? 'Patient' : 'Patients'}
                          </div>
                          {room.assigned_doctor && (
                            <div className="pt-1 border-t border-gray-200 w-full">
                              <p className="text-xs text-gray-500 truncate" title={room.assigned_doctor.name}>
                                <FiUser className="w-3 h-3 inline mr-1" />
                                {room.assigned_doctor.name}
                              </p>
                              <p className="text-xs text-gray-400">{room.assigned_doctor.role}</p>
                            </div>
                          )}
                          <p className="text-xs text-primary-600 font-medium mt-2">
                            Click to view patients
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })()}
          </Card>

          {/* Recent Activity & Quick Actions Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity - Weekly Patients */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <FiActivity className="w-5 h-5 text-primary-600" />
                  <span>Recent Activity</span>
                </div>
              }
              className="lg:col-span-2 bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
            >
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {weeklyPatients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <FiActivity className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">No patients registered in the last 7 days</p>
                  </div>
                ) : (
                  weeklyPatients.map((patient, idx) => (
                    <ActivityItem
                      key={patient.id || idx}
                      icon={FiUsers}
                      title={`Patient Registered: ${patient.name || 'N/A'}`}
                      description={`CR No: ${patient.cr_no || 'N/A'}${patient.locality ? ` - ${patient.locality}` : ''}`}
                      time={patient.created_at ? formatDateTime(patient.created_at) : 'N/A'}
                      color="from-blue-500 to-blue-600"
                    />
                  ))
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <FiSettings className="w-5 h-5 text-primary-600" />
                  <span>Quick Actions</span>
                </div>
              }
              className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
            >
              <div className="space-y-3">
                <QuickActionCard
                  icon={FiUsers}
                  title="Total Patients"
                  description="View all patients"
                  to="/patients"
                  colorClasses="hover:from-blue-50 hover:to-indigo-50"
                />
                <QuickActionCard
                  icon={FiUserPlus}
                  title="Create User"
                  description="Register new user"
                  to="/users/new"
                  colorClasses="hover:from-green-50 hover:to-emerald-50"
                />
              </div>
            </Card>
          </div>
        </div>
        
        {/* Patient Registration Calendar Modal */}
        <PatientRegistrationCalendar 
          isOpen={isCalendarOpen} 
          onClose={() => setIsCalendarOpen(false)} 
        />
        
        {/* Room Patients Modal */}
        <RoomPatientsModal
          isOpen={!!selectedRoomForPatients}
          onClose={() => setSelectedRoomForPatients(null)}
          roomNumber={selectedRoomForPatients}
        />
      </div>
    );
  }

  // ==================== FACULTY DASHBOARD ====================
  if (isFaculty) {
    // Calculate statistics from assigned patients
    const assignedPatients = useMemo(() => {
      if (!allAssignedPatients?.data?.patients) return [];
      const patients = allAssignedPatients.data.patients;
      const userCreatedAt = user?.created_at ? new Date(user.created_at) : null;
      
      return patients.filter(p => {
        // Only include patients assigned to this doctor
        const patientDoctorId = p.assigned_doctor_id ? parseInt(p.assigned_doctor_id, 10) : null;
        const currentUserId = user?.id ? parseInt(user.id, 10) : null;
        return patientDoctorId === currentUserId;
      });
    }, [allAssignedPatients, user]);

    // Calculate summary statistics
    const stats = useMemo(() => {
      const userCreatedAt = user?.created_at ? new Date(user.created_at) : null;

      const allPatientsCount = assignedPatients.length;
      const adlFileCount = assignedPatients.filter(p => p.has_adl_file === true).length;
      const assignedAfterCreation = userCreatedAt 
        ? assignedPatients.filter(p => {
            const assignedDate = p.last_assigned_date ? new Date(p.last_assigned_date) : (p.created_at ? new Date(p.created_at) : null);
            return assignedDate && assignedDate >= userCreatedAt;
          }).length
        : allPatientsCount;
      // Only show patients registered today (from 12:00 AM IST)
      // Use only created_at, not last_assigned_date, to strictly show only patients registered today
      const todayPatients = assignedPatients.filter(p => {
        if (!p.created_at) return false;
        // Get today's date in IST (YYYY-MM-DD format)
        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        // Get patient's registration date in IST
        const patientCreatedDate = new Date(p.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        return patientCreatedDate === todayIST;
      });

      // Gender distribution
      const maleCount = assignedPatients.filter(p => p.sex === 'M' || p.sex === 'Male').length;
      const femaleCount = assignedPatients.filter(p => p.sex === 'F' || p.sex === 'Female').length;

      // Age group distribution
      const ageGroupMap = {
        '0-18': 0,
        '19-30': 0,
        '31-45': 0,
        '46-60': 0,
        '61-75': 0,
        '75+': 0
      };
      
      assignedPatients.forEach(p => {
        let age = null;
        // Try to get age from numeric age field first
        if (p.age) {
          age = typeof p.age === 'number' ? p.age : parseInt(p.age, 10);
        }
        // If age is not available or invalid, try to parse from age_group
        if (!age || isNaN(age)) {
          if (p.age_group) {
            // Try to extract age from age_group string (e.g., "25-30" -> use first number)
            const ageMatch = p.age_group.match(/(\d+)/);
            if (ageMatch) {
              age = parseInt(ageMatch[1], 10);
            }
          }
        }
        
        if (age && !isNaN(age)) {
          if (age <= 18) ageGroupMap['0-18']++;
          else if (age <= 30) ageGroupMap['19-30']++;
          else if (age <= 45) ageGroupMap['31-45']++;
          else if (age <= 60) ageGroupMap['46-60']++;
          else if (age <= 75) ageGroupMap['61-75']++;
          else ageGroupMap['75+']++;
        }
      });
      
      const ageGroupData = Object.entries(ageGroupMap)
        .map(([group, count]) => ({ group, count }));

      // State-wise distribution
      const stateMap = {};
      assignedPatients.forEach(p => {
        const state = p.state || 'Unknown';
        stateMap[state] = (stateMap[state] || 0) + 1;
      });
      const stateData = Object.entries(stateMap)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count);

      // Recent patients (last 7 days - today to previous 7 days, where doctor accepted room)
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      const recentPatients = [...assignedPatients]
        .filter(p => {
          // Only include patients assigned in the last 7 days
          const assignedDate = p.last_assigned_date ? new Date(p.last_assigned_date) : (p.created_at ? new Date(p.created_at) : null);
          if (!assignedDate) return false;
          const patientDate = new Date(assignedDate);
          patientDate.setHours(0, 0, 0, 0);
          // Include patients from today to 7 days ago
          return patientDate >= sevenDaysAgo && patientDate <= today;
        })
        .sort((a, b) => {
          const dateA = a.last_assigned_date ? new Date(a.last_assigned_date) : new Date(a.created_at);
          const dateB = b.last_assigned_date ? new Date(b.last_assigned_date) : new Date(b.created_at);
          return dateB - dateA;
        });

      return {
        allPatientsCount,
        adlFileCount,
        assignedAfterCreation,
        todayPatients,
        maleCount,
        femaleCount,
        ageGroupData,
        stateData,
        recentPatients
      };
    }, [assignedPatients, user]);

    // Gender chart data
    const genderChartData = {
      labels: ['Male', 'Female'],
      datasets: [{
        data: [stats.maleCount, stats.femaleCount],
        backgroundColor: ['#3B82F6', '#EC4899'],
        borderColor: ['#1D4ED8', '#BE185D'],
        borderWidth: 2,
      }],
    };

    // State chart data
    const stateChartData = {
      labels: stats.stateData.map(item => item.state),
      datasets: [{
        label: 'Number of Patients',
        data: stats.stateData.map(item => item.count),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(29, 78, 216, 1)',
        borderWidth: 1,
      }],
    };

    // Age group chart data
    const ageGroupChartData = {
      labels: stats.ageGroupData.map(item => item.group),
      datasets: [{
        label: 'Number of Patients',
        data: stats.ageGroupData.map(item => item.count),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',   // Red for 0-18
          'rgba(251, 191, 36, 0.8)',  // Yellow for 19-30
          'rgba(34, 197, 94, 0.8)',   // Green for 31-45
          'rgba(59, 130, 246, 0.8)',  // Blue for 46-60
          'rgba(139, 92, 246, 0.8)',  // Purple for 61-75
          'rgba(168, 85, 247, 0.8)',  // Violet for 75+
        ],
        borderColor: [
          'rgba(220, 38, 38, 1)',
          'rgba(217, 119, 6, 1)',
          'rgba(22, 163, 74, 1)',
          'rgba(37, 99, 235, 1)',
          'rgba(124, 58, 237, 1)',
          'rgba(147, 51, 234, 1)',
        ],
        borderWidth: 2,
      }],
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Welcome Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name || 'Faculty'}! 🎓
            </h1>
            <p className="text-gray-600 mt-1">Faculty Dashboard - Patient Management & Analytics</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard 
              title="All Patients Count" 
              value={stats.allPatientsCount} 
              icon={FiUsers} 
              colorClasses="from-blue-500 to-blue-600"
              to="/patients"
              subtitle="Total assigned patients"
            />
            <StatCard 
              title="Total Out Patient Intake Record" 
              value={stats.adlFileCount} 
              icon={FiFolder} 
              colorClasses="from-purple-500 to-purple-600"
              subtitle="Patients with ADL files"
            />
            <StatCard 
              title="Assigned Patients Count" 
              value={stats.assignedAfterCreation} 
              icon={FiUserPlus} 
              colorClasses="from-green-500 to-green-600"
              subtitle="Assigned after account creation"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gender Distribution */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <FiPieChart className="w-5 h-5 text-primary-600" />
                  <span>Patient Gender Distribution</span>
                </div>
              }
              className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
            >
              <div className="h-80">
                <Doughnut
                  data={genderChartData}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        ...chartOptions.plugins.title,
                        text: 'Patient Gender Distribution'
                      }
                    }
                  }}
                />
              </div>
            </Card>

            {/* Age Group Distribution */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <FiBarChart2 className="w-5 h-5 text-primary-600" />
                  <span>Age Group Distribution</span>
                </div>
              }
              className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
            >
              <div className="h-80">
                <Bar
                  data={ageGroupChartData}
                  options={{
                    ...barChartOptions,
                    plugins: {
                      ...barChartOptions.plugins,
                      title: {
                        ...barChartOptions.plugins.title,
                        text: 'Age Group Distribution'
                      }
                    },
                    scales: {
                      ...barChartOptions.scales,
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card>
          </div>

          {/* State-wise Distribution - Full Width */}
          <Card 
            title={
              <div className="flex items-center gap-2">
                <FiBarChart2 className="w-5 h-5 text-primary-600" />
                <span>State-wise Patient Distribution</span>
              </div>
            }
            className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
          >
            <div className="h-80">
              <Bar
                data={stateChartData}
                options={{
                  ...barChartOptions,
                  plugins: {
                    ...barChartOptions.plugins,
                    title: {
                      ...barChartOptions.plugins.title,
                      text: 'State-wise Patient Distribution'
                    }
                  },
                  scales: {
                    ...barChartOptions.scales,
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45
                      }
                    }
                  }
                }}
              />
            </div>
          </Card>

          {/* Recent Patients & Today's Patients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Patients List */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <FiActivity className="w-5 h-5 text-primary-600" />
                  <span>Weekly Patients (Last 7 Days)</span>
                </div>
              }
              actions={
                <Link to="/patients">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              }
              className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
            >
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stats.recentPatients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <FiUsers className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">No recent patients</p>
                  </div>
                ) : (
                  stats.recentPatients.map((patient, idx) => (
                    <div 
                      key={patient.id || idx}
                      className="flex items-start gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/40 hover:bg-white/70 transition-all duration-200"
                    >
                      <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-md">
                        <FiUser className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{patient.name || 'N/A'}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {patient.cr_no ? `CR No: ${patient.cr_no}` : 'N/A'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <FiClock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {patient.last_assigned_date 
                              ? formatDateTime(patient.last_assigned_date) 
                              : (patient.created_at ? formatDateTime(patient.created_at) : 'N/A')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/patients/${patient.id}?edit=false`}>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="View Details">
                            <FiEye className="w-4 h-4 text-blue-600" />
                          </Button>
                        </Link>
                        <Link to={`/patients/${patient.id}?edit=true`}>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Edit Patient">
                            <FiEdit className="w-4 h-4 text-green-600" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Today's Patients */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <FiCalendar className="w-5 h-5 text-primary-600" />
                  <span>Today's Patients</span>
                </div>
              }
              className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
            >
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stats.todayPatients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <FiCalendar className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">No patients assigned today</p>
                  </div>
                ) : (
                  stats.todayPatients.map((patient, idx) => (
                    <div 
                      key={patient.id || idx}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200/50 hover:from-green-100 hover:to-emerald-100 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-md">
                          <FiUser className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{patient.name || 'N/A'}</p>
                          <p className="text-sm text-gray-600 truncate">
                            {patient.cr_no ? `CR No: ${patient.cr_no}` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/patients/${patient.id}?edit=true&mode=create`}>
                          <Button variant="outline" size="sm" className="text-xs bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100">
                            <FiEdit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                        <Link to={`/patients/${patient.id}?edit=false`}>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="View Details">
                            <FiEye className="w-4 h-4 text-blue-600" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ==================== RESIDENT DASHBOARD ====================
  if (isResident) {
    // Calculate statistics from assigned patients
    const assignedPatients = useMemo(() => {
      if (!allAssignedPatients?.data?.patients) return [];
      const patients = allAssignedPatients.data.patients;
      const userCreatedAt = user?.created_at ? new Date(user.created_at) : null;
      
      return patients.filter(p => {
        // Only include patients assigned to this doctor
        const patientDoctorId = p.assigned_doctor_id ? parseInt(p.assigned_doctor_id, 10) : null;
        const currentUserId = user?.id ? parseInt(user.id, 10) : null;
        return patientDoctorId === currentUserId;
      });
    }, [allAssignedPatients, user]);

    // Calculate summary statistics
    const stats = useMemo(() => {
      const userCreatedAt = user?.created_at ? new Date(user.created_at) : null;

      const allPatientsCount = assignedPatients.length;
      const adlFileCount = assignedPatients.filter(p => p.has_adl_file === true).length;
      const assignedAfterCreation = userCreatedAt 
        ? assignedPatients.filter(p => {
            const assignedDate = p.last_assigned_date ? new Date(p.last_assigned_date) : (p.created_at ? new Date(p.created_at) : null);
            return assignedDate && assignedDate >= userCreatedAt;
          }).length
        : allPatientsCount;
      // Only show patients registered today (from 12:00 AM IST)
      // Use only created_at, not last_assigned_date, to strictly show only patients registered today
      const todayPatients = assignedPatients.filter(p => {
        if (!p.created_at) return false;
        // Get today's date in IST (YYYY-MM-DD format)
        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        // Get patient's registration date in IST
        const patientCreatedDate = new Date(p.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        return patientCreatedDate === todayIST;
      });

      // Gender distribution
      const maleCount = assignedPatients.filter(p => p.sex === 'M' || p.sex === 'Male').length;
      const femaleCount = assignedPatients.filter(p => p.sex === 'F' || p.sex === 'Female').length;

      // Age group distribution
      const ageGroupMap = {
        '0-18': 0,
        '19-30': 0,
        '31-45': 0,
        '46-60': 0,
        '61-75': 0,
        '75+': 0
      };
      
      assignedPatients.forEach(p => {
        let age = null;
        // Try to get age from numeric age field first
        if (p.age) {
          age = typeof p.age === 'number' ? p.age : parseInt(p.age, 10);
        }
        // If age is not available or invalid, try to parse from age_group
        if (!age || isNaN(age)) {
          if (p.age_group) {
            // Try to extract age from age_group string (e.g., "25-30" -> use first number)
            const ageMatch = p.age_group.match(/(\d+)/);
            if (ageMatch) {
              age = parseInt(ageMatch[1], 10);
            }
          }
        }
        
        if (age && !isNaN(age)) {
          if (age <= 18) ageGroupMap['0-18']++;
          else if (age <= 30) ageGroupMap['19-30']++;
          else if (age <= 45) ageGroupMap['31-45']++;
          else if (age <= 60) ageGroupMap['46-60']++;
          else if (age <= 75) ageGroupMap['61-75']++;
          else ageGroupMap['75+']++;
        }
      });
      
      const ageGroupData = Object.entries(ageGroupMap)
        .map(([group, count]) => ({ group, count }));

      // State-wise distribution
      const stateMap = {};
      assignedPatients.forEach(p => {
        const state = p.state || 'Unknown';
        stateMap[state] = (stateMap[state] || 0) + 1;
      });
      const stateData = Object.entries(stateMap)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count);

      // Recent patients (last 7 days - today to previous 7 days, where doctor accepted room)
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      const recentPatients = [...assignedPatients]
        .filter(p => {
          // Only include patients assigned in the last 7 days
          const assignedDate = p.last_assigned_date ? new Date(p.last_assigned_date) : (p.created_at ? new Date(p.created_at) : null);
          if (!assignedDate) return false;
          const patientDate = new Date(assignedDate);
          patientDate.setHours(0, 0, 0, 0);
          // Include patients from today to 7 days ago
          return patientDate >= sevenDaysAgo && patientDate <= today;
        })
        .sort((a, b) => {
          const dateA = a.last_assigned_date ? new Date(a.last_assigned_date) : new Date(a.created_at);
          const dateB = b.last_assigned_date ? new Date(b.last_assigned_date) : new Date(b.created_at);
          return dateB - dateA;
        });

      return {
        allPatientsCount,
        adlFileCount,
        assignedAfterCreation,
        todayPatients,
        maleCount,
        femaleCount,
        ageGroupData,
        stateData,
        recentPatients
      };
    }, [assignedPatients, user]);

    // Gender chart data
    const genderChartData = {
      labels: ['Male', 'Female'],
      datasets: [{
        data: [stats.maleCount, stats.femaleCount],
        backgroundColor: ['#3B82F6', '#EC4899'],
        borderColor: ['#1D4ED8', '#BE185D'],
        borderWidth: 2,
      }],
    };

    // State chart data
    const stateChartData = {
      labels: stats.stateData.map(item => item.state),
      datasets: [{
        label: 'Number of Patients',
        data: stats.stateData.map(item => item.count),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(29, 78, 216, 1)',
        borderWidth: 1,
      }],
    };

    // Age group chart data
    const ageGroupChartData = {
      labels: stats.ageGroupData.map(item => item.group),
      datasets: [{
        label: 'Number of Patients',
        data: stats.ageGroupData.map(item => item.count),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',   // Red for 0-18
          'rgba(251, 191, 36, 0.8)',  // Yellow for 19-30
          'rgba(34, 197, 94, 0.8)',   // Green for 31-45
          'rgba(59, 130, 246, 0.8)',  // Blue for 46-60
          'rgba(139, 92, 246, 0.8)',  // Purple for 61-75
          'rgba(168, 85, 247, 0.8)',  // Violet for 75+
        ],
        borderColor: [
          'rgba(220, 38, 38, 1)',
          'rgba(217, 119, 6, 1)',
          'rgba(22, 163, 74, 1)',
          'rgba(37, 99, 235, 1)',
          'rgba(124, 58, 237, 1)',
          'rgba(147, 51, 234, 1)',
        ],
        borderWidth: 2,
      }],
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Welcome Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name || 'Resident'}! 🏠
            </h1>
            <p className="text-gray-600 mt-1">Resident Dashboard - Patient Management & Analytics</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard 
              title="All Patients Count" 
              value={stats.allPatientsCount} 
              icon={FiUsers} 
              colorClasses="from-blue-500 to-blue-600"
              to="/patients"
              subtitle="Total assigned patients"
            />
            <StatCard 
              title="Total Out Patient Intake Record" 
              value={stats.adlFileCount} 
              icon={FiFolder} 
              colorClasses="from-purple-500 to-purple-600"
              subtitle="Patients with ADL files"
            />
            <StatCard 
              title="Assigned Patients Count" 
              value={stats.assignedAfterCreation} 
              icon={FiUserPlus} 
              colorClasses="from-green-500 to-green-600"
              subtitle="Assigned after account creation"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gender Distribution */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <FiPieChart className="w-5 h-5 text-primary-600" />
                  <span>Patient Gender Distribution</span>
                </div>
              }
              className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
            >
              <div className="h-80">
                <Doughnut
                  data={genderChartData}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        ...chartOptions.plugins.title,
                        text: 'Patient Gender Distribution'
                      }
                    }
                  }}
                />
              </div>
            </Card>

            {/* Age Group Distribution */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <FiBarChart2 className="w-5 h-5 text-primary-600" />
                  <span>Age Group Distribution</span>
                </div>
              }
              className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
            >
              <div className="h-80">
                <Bar
                  data={ageGroupChartData}
                  options={{
                    ...barChartOptions,
                    plugins: {
                      ...barChartOptions.plugins,
                      title: {
                        ...barChartOptions.plugins.title,
                        text: 'Age Group Distribution'
                      }
                    },
                    scales: {
                      ...barChartOptions.scales,
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card>
          </div>

          {/* State-wise Distribution - Full Width */}
          <Card 
            title={
              <div className="flex items-center gap-2">
                <FiBarChart2 className="w-5 h-5 text-primary-600" />
                <span>State-wise Patient Distribution</span>
              </div>
            }
            className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
          >
            <div className="h-80">
              <Bar
                data={stateChartData}
                options={{
                  ...barChartOptions,
                  plugins: {
                    ...barChartOptions.plugins,
                    title: {
                      ...barChartOptions.plugins.title,
                      text: 'State-wise Patient Distribution'
                    }
                  },
                  scales: {
                    ...barChartOptions.scales,
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45
                      }
                    }
                  }
                }}
              />
            </div>
          </Card>

          {/* Recent Patients & Today's Patients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Patients List */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <FiActivity className="w-5 h-5 text-primary-600" />
                  <span>Weekly Patients (Last 7 Days)</span>
                </div>
              }
              actions={
                <Link to="/patients">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              }
              className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
            >
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stats.recentPatients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <FiUsers className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">No recent patients</p>
                  </div>
                ) : (
                  stats.recentPatients.map((patient, idx) => (
                    <div 
                      key={patient.id || idx}
                      className="flex items-start gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/40 hover:bg-white/70 transition-all duration-200"
                    >
                      <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                        <FiUser className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{patient.name || 'N/A'}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {patient.cr_no ? `CR No: ${patient.cr_no}` : 'N/A'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <FiClock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {patient.last_assigned_date 
                              ? formatDateTime(patient.last_assigned_date) 
                              : (patient.created_at ? formatDateTime(patient.created_at) : 'N/A')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/patients/${patient.id}?edit=false`}>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="View Details">
                            <FiEye className="w-4 h-4 text-blue-600" />
                          </Button>
                        </Link>
                        <Link to={`/patients/${patient.id}?edit=true`}>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Edit Patient">
                            <FiEdit className="w-4 h-4 text-green-600" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Today's Patients */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <FiCalendar className="w-5 h-5 text-primary-600" />
                  <span>Today's Patients</span>
                </div>
              }
              className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
            >
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stats.todayPatients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <FiCalendar className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">No patients assigned today</p>
                  </div>
                ) : (
                  stats.todayPatients.map((patient, idx) => (
                    <div 
                      key={patient.id || idx}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                          <FiUser className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{patient.name || 'N/A'}</p>
                          <p className="text-sm text-gray-600 truncate">
                            {patient.cr_no ? `CR No: ${patient.cr_no}` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/patients/${patient.id}?edit=true&mode=create`}>
                          <Button variant="outline" size="sm" className="text-xs bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100">
                            <FiEdit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                        <Link to={`/patients/${patient.id}?edit=false`}>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="View Details">
                            <FiEye className="w-4 h-4 text-blue-600" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ==================== PSYCHIATRIC WELFARE OFFICER DASHBOARD ====================
  if (isMwo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Welcome Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name || 'Officer'}! 🧠
            </h1>
            <p className="text-gray-600 mt-1">Psychiatric Welfare Officer Dashboard - Patient Registration & Welfare Management</p>
          </div>

          {/* MWO KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Registered Patients" 
              value={outpatientStats?.data?.stats?.total_patients || 0} 
              icon={FiUsers} 
              colorClasses="from-blue-500 to-blue-600"
              to="/patients"
              subtitle="All registered patients"
            />
            <StatCard 
              title="Urban Patients" 
              value={localityStats.urban} 
              icon={FiMapPin} 
              colorClasses="from-green-500 to-green-600"
              to="/patients?locality=urban"
              subtitle="Urban locality"
            />
            <StatCard 
              title="Rural Patients" 
              value={localityStats.rural} 
              icon={FiMapPin} 
              colorClasses="from-orange-500 to-orange-600"
              to="/patients?locality=rural"
              subtitle="Rural locality"
            />
            <StatCard 
              title="Total Rooms" 
              value={allRoomsForMWO?.data?.pagination?.total || allRoomsForMWO?.data?.rooms?.length || 0} 
              icon={FiHome} 
              colorClasses="from-purple-500 to-purple-600"
              to="/rooms"
              subtitle="All available rooms"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* State-wise Patient Distribution */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <FiBarChart2 className="w-5 h-5 text-primary-600" />
                  <span>State-wise Patient Distribution</span>
                </div>
              }
              className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
            >
              <div className="h-80">
                <Bar
                  data={stateChartData}
                  options={{
                    ...barChartOptions,
                    plugins: {
                      ...barChartOptions.plugins,
                      title: {
                        ...barChartOptions.plugins.title,
                        text: 'State-wise Patient Distribution'
                      }
                    },
                    scales: {
                      y: {
                        ...(barChartOptions.scales?.y || {}),
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1
                        }
                      },
                      x: {
                        ...(barChartOptions.scales?.x || {}),
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45,
                          autoSkip: true
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card>

            {/* Patient Records by Marital Status */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <FiPieChart className="w-5 h-5 text-primary-600" />
                  <span>Patient Records by Marital Status</span>
                </div>
              }
              className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
            >
              <div className="h-80">
                <Doughnut
                  data={maritalStatusChartData}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        ...chartOptions.plugins.title,
                        text: 'Patient Records by Marital Status'
                      }
                    }
                  }}
                />
              </div>
            </Card>
          </div>

          {/* Recent Records Table */}
          {myRecords?.data?.records && (myRecords.data.records || myRecords.data.patients || []).length > 0 && (
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <FiFileText className="w-5 h-5 text-primary-600" />
                  <span>Recent Patient Records</span>
                </div>
              }
              actions={
                <Link to="/patients">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              }
              className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CR No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marital Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Locality</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(myRecords.data.records || myRecords.data.patients || []).slice(0, 5).map((record) => (
                      <tr key={record.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.name || record.patient_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.cr_no || record.mr_no || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.marital_status || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Badge variant={record.locality === 'Urban' ? 'info' : 'success'}>
                            {record.locality || 'N/A'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.created_at ? formatDate(record.created_at) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <Link to={`/patients/${record.id}?edit=false`}>
                              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="View Details">
                                <FiEye className="w-4 h-4 text-blue-600" />
                              </Button>
                            </Link>
                            <Link to={`/patients/${record.id}?edit=true`}>
                              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Edit Patient">
                                <FiEdit className="w-4 h-4 text-green-600" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <Card 
            title={
              <div className="flex items-center gap-2">
                <FiActivity className="w-5 h-5 text-primary-600" />
                <span>Quick Actions</span>
              </div>
            }
            className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/50"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickActionCard
                icon={FiUserPlus}
                title="Register New Patient"
                description="Create new patient record"
                to="/patients/new"
                colorClasses="hover:from-blue-50 hover:to-indigo-50"
              />
              <QuickActionCard
                icon={FiClipboard}
                title="Browse Patients"
                description="View all patient records"
                to="/patients"
                colorClasses="hover:from-green-50 hover:to-emerald-50"
              />
              <QuickActionCard
                icon={FiUsers}
                title="Patient Management"
                description="Manage patient information"
                to="/patients"
                colorClasses="hover:from-purple-50 hover:to-pink-50"
              />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
          <p className="text-gray-600">Dashboard content is being loaded...</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
