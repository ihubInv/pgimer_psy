import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { selectIsAuthenticated } from './features/auth/authSlice';
import { SessionProvider } from './contexts/SessionContext';
import SessionExpiredModal from './components/SessionExpiredModal';
import ProtectedRoute from './utils/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOTP from './pages/VerifyOTP';
import ResetPassword from './pages/ResetPassword';
import SetupPassword from './pages/SetupPassword';
import NotFound from './pages/NotFound';

const Dashboard = lazy(() => import('./pages/Dashboard'));

const PatientsPage = lazy(() => import('./pages/patients/PatientsPage'));
const CreatePatient = lazy(() => import('./pages/patients/CreatePatient'));
const PatientDetails = lazy(() => import('./pages/patients/PatientDetails'));
const CreateChildPatient = lazy(() => import('./pages/patients/CreateChildPatient'));

const ClinicalProformaPage = lazy(() => import('./pages/clinical/ClinicalProformaPage'));
const EditClinicalProforma = lazy(() => import('./pages/clinical/EditClinicalProforma'));
const ClinicalProformaDetails = lazy(() => import('./pages/clinical/ClinicalProformaDetails'));
const FollowUpForm = lazy(() => import('./pages/clinical/FollowUpForm'));
const EditChildClinicalProforma = lazy(() => import('./pages/clinical/EditChildClinicalProforma'));
const ChildFollowUpForm = lazy(() => import('./pages/clinical/ChildFollowUpForm'));
const ClinicalTodayPatients = lazy(() => import('./pages/clinical/ClinincalTodayPatients'));

const PrescriptionEdit = lazy(() => import('./pages/PrescribeMedication/PrescriptionEdit'));
const PrescriptionView = lazy(() => import('./pages/PrescribeMedication/PrescriptionView'));

const ADLFilesPage = lazy(() => import('./pages/adl/ADLFilesPage'));
const EditADL = lazy(() => import('./pages/adl/EditADL'));
const ViewADL = lazy(() => import('./pages/adl/ViewADL'));

const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const CreateUser = lazy(() => import('./pages/users/CreateUser'));
const EditUser = lazy(() => import('./pages/users/EditUser'));

const RoomManagementPage = lazy(() => import('./pages/rooms/RoomManagementPage'));
const Profile = lazy(() => import('./pages/Profile'));
const ApiTest = lazy(() => import('./pages/ApiTest'));

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
    </div>
  );
}

function App() {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  return (
    <BrowserRouter>
      <SessionProvider>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/forgot-password"
            element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPassword />}
          />
          <Route
            path="/verify-otp"
            element={isAuthenticated ? <Navigate to="/" replace /> : <VerifyOTP />}
          />
          <Route
            path="/reset-password"
            element={isAuthenticated ? <Navigate to="/" replace /> : <ResetPassword />}
          />
          <Route
            path="/setup-password"
            element={isAuthenticated ? <Navigate to="/" replace /> : <SetupPassword />}
          />

          {/* Protected routes */}
          <Route element={<ProtectedRoute allowedRoles={[]} />}>
            <Route element={<MainLayout />}>
              {/* Dashboard */}
              <Route path="/" element={<Dashboard />} />
              
              {/* Patient Routes - All authenticated users */}
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/patients/new" element={<CreatePatient />} />
              <Route path="/patients/:id" element={<PatientDetails />} />
              {/* Child Patient Routes */}
              <Route path="/child-patient/new" element={<CreateChildPatient />} />
              <Route path="/child-patient/:id" element={<CreateChildPatient />} />


              {/* Walk-in Clinical Proforma - Faculty, Resident and Admin */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Faculty', 'Resident']} />}>
                <Route path="/clinical" element={<ClinicalProformaPage />} />
                <Route path="/clinical-today-patients" element={<ClinicalTodayPatients />} />
                <Route path="/clinical/new" element={<EditClinicalProforma />} />
                <Route path="/clinical/:id" element={<ClinicalProformaDetails />} />
                <Route path="/clinical/:id/edit" element={<EditClinicalProforma />} />
                <Route path="/follow-up/:id" element={<FollowUpForm />} />
                {/* Child Clinical Proforma Routes */}
                <Route path="/child-clinical-proformas/new" element={<EditChildClinicalProforma />} />
                <Route path="/child-clinical-proformas/:id" element={<EditChildClinicalProforma />} />
                <Route path="/child-clinical-proformas/:id/edit" element={<EditChildClinicalProforma />} />
                <Route path="/child-follow-up/:id" element={<ChildFollowUpForm />} />
              </Route>

              {/* Prescription Routes - Faculty, Resident and Admin */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Faculty', 'Resident']} />}>
                <Route path="/prescriptions/create" element={<PrescriptionEdit />} />
                <Route path="/prescriptions/edit/:id" element={<PrescriptionEdit />} />
                <Route path="/prescriptions/view" element={<PrescriptionView />} />
              </Route>

              {/* Out Patient Intake Record - Faculty, Resident and Admin */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Faculty', 'Resident']} />}>
                <Route path="/adl-files" element={<ADLFilesPage />} />
                <Route path="/adl/new" element={<EditADL />} />
                <Route path="/adl/patient/:id" element={<EditADL />} />
                <Route path="/adl-files/:id/edit" element={<EditADL />} />
                <Route path="/adl-files/:id/view" element={<ViewADL />} />
              </Route>

              {/* Users - Admin only */}
              <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                <Route path="/users" element={<UsersPage />} />
                <Route path="/users/new" element={<CreateUser />} />
                <Route path="/users/:id/edit" element={<EditUser />} />
              </Route>

              {/* Room Management - Admin and Psychiatric Welfare Officer */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Psychiatric Welfare Officer']} />}>
                <Route path="/rooms" element={<RoomManagementPage />} />
              </Route>

              {/* Profile - All authenticated users */}
              <Route path="/profile" element={<Profile />} />

              {/* API Test - Development only */}
              <Route path="/api-test" element={<ApiTest />} />
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        <SessionExpiredModal />
      </SessionProvider>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </BrowserRouter>
  );
}

export default App;

