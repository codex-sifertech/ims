import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import useStore from './store/useStore';
import { USER_ROLES, accessList } from './config/accessControl';
import { createWorkspaceCalendar } from './utils/workspaceCalendar';

// Components
import DashboardLayout from './components/layout/DashboardLayout';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import MyBoard from './pages/MyBoard';
import ProjectsBoard from './pages/ProjectsBoard';
import ProjectDetails from './pages/ProjectDetails';
import WorkBoard from './pages/WorkBoard';
import Inbox from './pages/Inbox';
import AIEcosystem from './pages/AIEcosystem';
import Meetings from './pages/Meetings';
import CompanySelection from './pages/CompanySelection';
import CompanySettings from './pages/CompanySettings';
import AdminPanel from './pages/AdminPanel';
import MasterAdmin from './pages/MasterAdmin';
import PeopleHR from './pages/PeopleHR';
import MemberDetails from './pages/MemberDetails';
import GlobalFloatingStream from './components/shared/GlobalFloatingStream';
import LoadingScreen from './components/shared/LoadingScreen';

import Login from './components/auth/Login';
import Signup from './components/auth/Signup';

function ProtectedRoute({ children }) {
  const { user, isLoading } = useStore();

  if (isLoading) return <LoadingScreen />;

  // Without auth, redirect to login
  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}

function MasterAdminRoute({ children }) {
  const { user, isLoading } = useStore();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;
  if (user.email !== 'sifertech.co@gmail.com' && user.role !== 'master_admin') {
    return <Navigate to="/dashboard" />;
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
  const { setLoading, setCompanies, setUser, setActiveCompany, activeCompany, user, theme } = useStore();
  
  useEffect(() => {
    // Initialize Theme on Mount
    if (theme === 'light') {
        document.body.classList.add('theme-light');
    } else {
        document.body.classList.remove('theme-light');
    }
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
            const email = firebaseUser.email?.toLowerCase().trim();
            const staticAccess = accessList[email];
            const userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: staticAccess?.role ?? USER_ROLES.MEMBER,
              name: firebaseUser.displayName || email?.split('@')[0] || 'User'
            };
            
            setUser(userData);

            // Update user document with master role if applicable
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            await setDoc(userDocRef, userData, { merge: true });
            
            // Fetch real companies from Firestore
            const companiesRef = collection(db, 'companies');
            // Query with the exact email token (Firebase rules match on request.auth.token.email)
            const q = query(companiesRef, where('accessList', 'array-contains', firebaseUser.email));
            // Also query lowercase variant to catch workspaces created with normalized email
            const qLower = email !== firebaseUser.email
                ? query(companiesRef, where('accessList', 'array-contains', email))
                : null;
            const companySnaps = await getDocs(q);
            const seenIds = new Set();
            let fetchedCompanies = [];
            companySnaps.docs.forEach(d => {
                seenIds.add(d.id);
                fetchedCompanies.push({ id: d.id, ...d.data() });
            });
            if (qLower) {
                const lowerSnaps = await getDocs(qLower);
                lowerSnaps.docs.forEach(d => {
                    if (!seenIds.has(d.id)) fetchedCompanies.push({ id: d.id, ...d.data() });
                });
            }

            // Auto-create a Main Workspace if none exist (specifically for the admin)
            if (fetchedCompanies.length === 0 && userData.role === USER_ROLES.MASTER_ADMIN) {
            const newCompanyRef = doc(companiesRef); // Auto ID
            const newCompanyId = newCompanyRef.id;
            const newCompanyData = {
                name: 'Main Workspace',
                createdAt: new Date().toISOString(),
                accessList: [...new Set([firebaseUser.email, email])],
                owner: firebaseUser.uid
            };
            await setDoc(newCompanyRef, newCompanyData);
            
            // Also set the member document (CRITICAL for security rules)
            const memberRef = doc(db, 'companies', newCompanyId, 'members', firebaseUser.uid);
            await setDoc(memberRef, {
                email: firebaseUser.email,
                name: firebaseUser.displayName || 'Admin',
                role: 'admin',
                joinedAt: new Date().toISOString()
            });
            
            fetchedCompanies = [{ id: newCompanyId, ...newCompanyData }];

            // Auto-create workspace calendar (non-blocking)
            createWorkspaceCalendar(firebaseUser.uid, 'Main Workspace', newCompanyId).catch(() => {});
            }

            // Repair logic: Ensure user has a membership doc for all fetched companies
            for (const company of fetchedCompanies) {
            try {
                const memberRef = doc(db, 'companies', company.id, 'members', firebaseUser.uid);
                const memberSnap = await getDoc(memberRef);
                if (!memberSnap.exists()) {
                    await setDoc(memberRef, {
                        email: firebaseUser.email,
                        name: firebaseUser.displayName || email?.split('@')[0] || 'User',
                        role: userData.role === 'master_admin' ? 'admin' : 'member',
                        joinedAt: new Date().toISOString()
                    });
                }
            } catch (memberErr) {
                console.error("Non-fatal member assignment error:", memberErr);
            }
            }

            setCompanies(fetchedCompanies);

            // Restore last active company from localStorage so links and refreshes
            // don't kick the user back to workspace selection every time.
            // Falls back to selection screen if the saved company is no longer accessible.
            try {
                const saved = localStorage.getItem('activeCompany');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    const found = fetchedCompanies.find(c => c.id === parsed?.id);
                    if (found) {
                        setActiveCompany(found);
                    } else {
                        setActiveCompany(null); // Company no longer accessible
                    }
                } else {
                    setActiveCompany(null); // No saved company — show selection
                }
            } catch {
                setActiveCompany(null);
            }
        } catch (error) {
            console.error("FATAL APPLOADS ERROR:", error);
            // Fallback gracefully so UI doesn't indefinitely hang
            setCompanies([]);
            setActiveCompany(null);
        }
      } else {
        setUser(null);
        setActiveCompany(null);
        setCompanies([]);
        localStorage.removeItem('activeCompany');
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
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />

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
          <Route path="chat" element={<Inbox />} />
          <Route path="ai" element={<AIEcosystem />} />
          <Route path="meetings" element={<Meetings />} />
          <Route path="people" element={<PeopleHR />} />
          <Route path="people/:memberId" element={<MemberDetails />} />
          <Route path="settings" element={<CompanySettings />} />
          <Route path="admin" element={<AdminPanel />} />
        </Route>

        {/* Master Admin Route — /domain/admin */}
        <Route path="/domain/admin" element={
          <MasterAdminRoute>
            <MasterAdmin />
          </MasterAdminRoute>
        } />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <GlobalFloatingStream />
    </Router>
  );
}

export default App;
