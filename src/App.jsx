import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import useStore from './store/useStore';

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
import PeopleHR from './pages/PeopleHR';
import MemberDetails from './pages/MemberDetails';
import GlobalFloatingStream from './components/shared/GlobalFloatingStream';

import Login from './components/auth/Login';
import Signup from './components/auth/Signup';

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
  const { setLoading, setCompanies, setUser, setActiveCompany, activeCompany, user, theme, setTheme } = useStore();
  
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
            const isMaster = firebaseUser.email === 'sifertech.co@gmail.com';
            const userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: isMaster ? 'master_admin' : 'member',
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0] || 'User'
            };
            
            setUser(userData);

            // Update user document with master role if applicable
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            await setDoc(userDocRef, userData, { merge: true });
            
            // Fetch real companies from Firestore
            const companiesRef = collection(db, 'companies');
            // Firebase strictly requires the query to identically match the rule `request.auth.token.email in accessList`!
            const q = query(companiesRef, where('accessList', 'array-contains', firebaseUser.email));
            const companySnaps = await getDocs(q);
            
            let fetchedCompanies = companySnaps.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
            }));

            // Auto-create a Main Workspace if none exist (specifically for the admin)
            if (fetchedCompanies.length === 0 && firebaseUser.email === 'sifertech.co@gmail.com') {
            const newCompanyRef = doc(companiesRef); // Auto ID
            const newCompanyId = newCompanyRef.id;
            const newCompanyData = {
                name: 'Main Workspace',
                createdAt: new Date().toISOString(),
                accessList: [firebaseUser.email],
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
            }

            // Repair logic: Ensure user has a membership doc for all fetched companies
            for (const company of fetchedCompanies) {
            try {
                const memberRef = doc(db, 'companies', company.id, 'members', firebaseUser.uid);
                const memberSnap = await getDoc(memberRef);
                if (!memberSnap.exists()) {
                    await setDoc(memberRef, {
                        email: firebaseUser.email,
                        name: firebaseUser.displayName || 'Admin',
                        role: 'admin',
                        joinedAt: new Date().toISOString()
                    });
                }
            } catch (memberErr) {
                console.error("Non-fatal member assignment error:", memberErr);
            }
            }

            setCompanies(fetchedCompanies);

            // Per user request: Always force Workspace Selection on fresh load
            setActiveCompany(null);
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
  
  // Presence/Active Status Sync
  useEffect(() => {
    if (!user?.uid || !activeCompany?.id) return;

    const syncStatus = async () => {
      try {
        const memberRef = doc(db, 'companies', activeCompany.id, 'members', user.uid);
        await setDoc(memberRef, {
          status: 'online',
          lastActive: new Date().toISOString(),
          name: user.name || user.email,
          photoURL: user.photoURL || null
        }, { merge: true });
      } catch (err) {
        console.error("Presence sync failed:", err);
      }
    };

    syncStatus();
    // Keep alive every 5 minutes
    const interval = setInterval(syncStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.uid, activeCompany?.id]);

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

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <GlobalFloatingStream />
    </Router>
  );
}

export default App;
