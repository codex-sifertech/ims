import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import useStore from './store/useStore';
import { validateUserAccess } from './config/accessControl';

// Components
import DashboardLayout from './components/layout/DashboardLayout';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import MyBoard from './pages/MyBoard';
import ProjectsBoard from './pages/ProjectsBoard';
import ProjectDetails from './pages/ProjectDetails';
import WorkBoard from './pages/WorkBoard';
import GroupChat from './pages/GroupChat';
import AIEcosystem from './pages/AIEcosystem';
import Meetings from './pages/Meetings';
import CompanySelection from './pages/CompanySelection';
import CompanySettings from './pages/CompanySettings';

import Login from './components/auth/Login';

function ProtectedRoute({ children }) {
  const { user, isLoading } = useStore();

  if (isLoading) {
    return <div className="h-screen w-screen flex flex-col items-center justify-center bg-dark-900 text-white">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      Loading IMS...
    </div>;
  }

  // Without auth, redirect to login
  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}

function MainRoute() {
  const { user, activeCompany } = useStore();
  
  if (!user) return <Navigate to="/login" />;
  if (!activeCompany) return <CompanySelection />;
  return <Navigate to="/dashboard" />;
}

function App() {
  const { setLoading, setCompanies, setUser, setActiveCompany } = useStore();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Find existing authorized role if any
        const accessCheck = validateUserAccess(firebaseUser.email);
        
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          role: accessCheck?.role || 'member',
          name: firebaseUser.displayName || accessCheck?.name || 'User'
        };
        
        setUser(userData);
        
        // Mock companies for now, but in reality these should come from Firestore
        const mockCompanies = [
          { id: 'personal', name: 'Personal Workspace' },
          { id: 'alpha-corp', name: 'Alpha Corp' }
        ];
        setCompanies(mockCompanies);

        // Try to keep selection if it was there
        const savedCompany = localStorage.getItem('activeCompany');
        if (savedCompany) {
          setActiveCompany(JSON.parse(savedCompany));
        } else {
          setActiveCompany(mockCompanies[0]);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setLoading, setCompanies, setUser, setActiveCompany]);

  return (
    <Router>
      <Routes>
        {/* Landing/Selection Route */}
        <Route path="/" element={<MainRoute />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            {activeCompany ? <DashboardLayout /> : <Navigate to="/" />}
          </ProtectedRoute>
        }>
          <Route index element={<AnalyticsDashboard />} />
          <Route path="my-board" element={<MyBoard />} />
          <Route path="projects" element={<ProjectsBoard />} />
          <Route path="projects/:projectId" element={<ProjectDetails />} />
          <Route path="chat" element={<GroupChat />} />
          <Route path="ai" element={<AIEcosystem />} />
          <Route path="meetings" element={<Meetings />} />
          <Route path="settings" element={<CompanySettings />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
