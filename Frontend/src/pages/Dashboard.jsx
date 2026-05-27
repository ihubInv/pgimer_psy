import { useSelector } from 'react-redux';
import {
  FiUsers,
  FiUserPlus,
  FiClipboard,
  FiBriefcase,
  FiHome,
  FiHeart,
  FiArrowRight,
  FiAlertCircle,
  FiLayers,
  FiPieChart,
  FiBarChart2,
  FiMapPin,
  FiRefreshCw,
} from 'react-icons/fi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { selectCurrentUser, selectIsAuthenticated } from '../features/auth/authSlice';
import { useGetDashboardQuery } from '../features/dashboard/dashboardApiSlice';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const v2ChartBaseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

const v2BarChartOptions = {
  ...v2ChartBaseOptions,
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1 } },
    x: { ticks: { autoSkip: true, maxRotation: 45, minRotation: 0 } },
  },
};

const CARD_META = {
  adult_patients: { title: 'Adult Patients', icon: FiUsers, color: 'from-blue-500 to-indigo-600' },
  child_patients: { title: 'Child Patients', icon: FiHeart, color: 'from-rose-500 to-pink-600' },
  referred_patients: { title: 'Referred Patients', icon: FiArrowRight, color: 'from-amber-500 to-orange-600' },
  unassigned_patients: { title: 'Unassigned Patients', icon: FiAlertCircle, color: 'from-slate-600 to-gray-800' },
  total_patients: { title: 'Total Patients', icon: FiLayers, color: 'from-emerald-500 to-teal-600' },
  registered_patients: { title: 'Registered Patients', icon: FiUserPlus, color: 'from-emerald-500 to-teal-600' },
  total_intake_records: { title: 'Total Intake Records', icon: FiClipboard, color: 'from-purple-500 to-pink-600' },
  total_staff: { title: 'Total Staff', icon: FiBriefcase, color: 'from-amber-500 to-orange-600' },
  total_rooms: { title: 'Total Rooms', icon: FiHome, color: 'from-green-500 to-emerald-600' },
};

const StatCard = ({ title, value, icon: Icon, colorClasses, isLoading }) => (
  <div
    className={`relative backdrop-blur-xl bg-white/70 border border-white/40 rounded-2xl p-6 shadow-xl ${isLoading ? 'animate-pulse' : ''}`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">{title}</p>
        <p className="text-4xl font-extrabold text-gray-900">{isLoading ? '…' : value ?? 0}</p>
      </div>
      <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses} shadow-lg`}>
        <Icon className="h-7 w-7 text-white" />
      </div>
    </div>
  </div>
);

function dashboardTitle(role, subRole) {
  if (role === 'Admin') return 'Admin Dashboard';
  if (role === 'Faculty') return 'Faculty Dashboard';
  if (role === 'Resident' && subRole === 'Senior Resident') return 'Senior Resident Dashboard';
  if (role === 'Resident' && subRole === 'Junior Resident') return 'Junior Resident Dashboard';
  if (role === 'Psychiatric Welfare Officer') return 'PWO Dashboard';
  return 'Dashboard';
}

const Dashboard = () => {
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const { data: response, isLoading, isFetching, refetch } = useGetDashboardQuery(undefined, {
    skip: !isAuthenticated || !user,
    refetchOnMountOrArgChange: true,
  });

  const dash = response?.data;
  const cards = dash?.cards || {};
  const charts = dash?.charts || {};
  const loading = isLoading || isFetching;

  const cardKeys = Object.keys(cards);
  const genderRows = charts.gender_distribution || [];
  const ageRows = charts.age_group_distribution || [];
  const stateRows = (charts.state_distribution || []).slice(0, 10);

  const toCount = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const genderChart = {
    labels: genderRows.map((r) => r.label),
    datasets: [{ data: genderRows.map((r) => toCount(r.count)), backgroundColor: ['#3B82F6', '#EC4899', '#A855F7', '#10B981'], borderWidth: 0 }],
  };
  const ageChart = {
    labels: ageRows.map((r) => r.label),
    datasets: [{ label: 'Patients', data: ageRows.map((r) => toCount(r.count)), backgroundColor: '#60A5FA' }],
  };
  const stateChart = {
    labels: stateRows.map((r) => r.label),
    datasets: [{ label: 'Patients', data: stateRows.map((r) => toCount(r.count)), backgroundColor: '#34D399' }],
  };

  const hasGender = genderChart.labels.length > 0 && genderChart.datasets[0].data.some((n) => n > 0);
  const hasAge = ageChart.labels.length > 0 && ageChart.datasets[0].data.some((n) => n > 0);
  const hasState = stateChart.labels.length > 0 && stateChart.datasets[0].data.some((n) => n > 0);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isLoading && !dash) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p className="text-gray-600 mt-1">
            {dashboardTitle(dash?.role, dash?.sub_role)}
          </p>
        </div>

        <Card className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl">
          <div className="p-6 border-b border-gray-100/70">
            <h2 className="text-lg font-extrabold text-gray-900">Overview</h2>
          </div>
          <div
            className={`p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 ${
              cardKeys.length >= 5 ? 'lg:grid-cols-5' : cardKeys.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
            }`}
          >
            {cardKeys.map((key) => {
              const meta = CARD_META[key] || {
                title: key.replace(/_/g, ' '),
                icon: FiBarChart2,
                color: 'from-blue-500 to-indigo-600',
              };
              return (
                <StatCard
                  key={key}
                  title={meta.title}
                  value={cards[key]}
                  icon={meta.icon}
                  colorClasses={meta.color}
                  isLoading={loading}
                />
              );
            })}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl">
            <div className="p-6 border-b border-gray-100/70 flex items-center gap-2">
              <FiPieChart className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Patient Gender Distribution</h3>
            </div>
            <div className="p-6 h-64">
              {hasGender ? <Doughnut data={genderChart} options={v2ChartBaseOptions} /> : <p className="text-sm text-gray-500">No data</p>}
            </div>
          </Card>

          <Card className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl">
            <div className="p-6 border-b border-gray-100/70 flex items-center gap-2">
              <FiBarChart2 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-900">Age Group Distribution</h3>
            </div>
            <div className="p-6 h-64">
              {hasAge ? <Bar data={ageChart} options={v2BarChartOptions} /> : <p className="text-sm text-gray-500">No data</p>}
            </div>
          </Card>

          <Card className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl">
            <div className="p-6 border-b border-gray-100/70 flex items-center gap-2">
              <FiMapPin className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-gray-900">State-wise Patient Distribution</h3>
            </div>
            <div className="p-6 h-64">
              {hasState ? <Bar data={stateChart} options={v2BarChartOptions} /> : <p className="text-sm text-gray-500">No data</p>}
            </div>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading} className="flex items-center gap-2">
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
