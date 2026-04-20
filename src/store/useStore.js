import { create } from 'zustand';

const useStore = create((set) => ({
    user: null, // Initialized via App.jsx listener
    isLoading: true, // App loading state
    activeCompany: null, // Current active company object
    companies: [], // List of user's companies

    // Global Screen Sharing State
    isScreenSharing: false,
    activeStreams: [], // Array of { id, stream, userName, label }
    currentStreamIndex: 0,
    screenShareProjectId: null,
    grantedUser: null, // Who has control
    projectNodes: [], // For mention system: [{ id, label, type: 'mindmap'|'workflow' }]

    // Ecosystem State (Tasks & Time Tracker)
    isCheckedIn: false,
    globalTasks: [], 
    tasksLoading: true,

    // Theme State
    theme: localStorage.getItem('ims_theme') || 'dark',

    // Actions
    setTheme: (theme) => {
        localStorage.setItem('ims_theme', theme);
        if (theme === 'light') {
            document.body.classList.add('theme-light');
        } else {
            document.body.classList.remove('theme-light');
        }
        set({ theme });
    },
    setUser: (user) => set({ user, isLoading: false }),
    setLoading: (isLoading) => set({ isLoading }),
    setActiveCompany: (company) => {
        if (company) {
            localStorage.setItem('activeCompany', JSON.stringify(company));
        } else {
            localStorage.removeItem('activeCompany');
        }
        set({ activeCompany: company });
    },
    setCompanies: (companies) => set({ companies }),
    setProjectNodes: (nodes) => set({ projectNodes: nodes }),
    
    // Ecosystem Actions
    toggleCheckIn: (val) => set((state) => ({ isCheckedIn: val !== undefined ? val : !state.isCheckedIn })),
    setGlobalTasks: (tasks) => set({ globalTasks: tasks, tasksLoading: false }),
    addTask: (task) => set((state) => ({ globalTasks: [...state.globalTasks, task] })),
    updateTask: (taskId, updates) => set((state) => ({
        globalTasks: state.globalTasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
    })),

    // Screen Share Actions
    addScreenStream: (id, stream, userName, projectId) => set((state) => ({
        activeStreams: [...state.activeStreams.filter(s => s.id !== id), { id, stream, userName, label: userName }],
        isScreenSharing: true,
        screenShareProjectId: projectId
    })),
    
    switchStream: () => set((state) => ({
        currentStreamIndex: (state.currentStreamIndex + 1) % state.activeStreams.length
    })),

    removeScreenStream: (id) => set((state) => {
        const streamToRemove = state.activeStreams.find(s => s.id === id);
        if (streamToRemove?.stream) {
            streamToRemove.stream.getTracks().forEach(t => t.stop());
        }
        const filtered = state.activeStreams.filter(s => s.id !== id);
        return {
            activeStreams: filtered,
            isScreenSharing: filtered.length > 0,
            currentStreamIndex: 0
        };
    }),

    setGrantedUser: (user) => set({ grantedUser: user }),
    
    stopGlobalScreenShare: () => set((state) => {
        state.activeStreams.forEach(s => {
            if (s.stream) s.stream.getTracks().forEach(t => t.stop());
        });
        return { 
            isScreenSharing: false, 
            activeStreams: [], 
            currentStreamIndex: 0, 
            screenShareProjectId: null, 
            grantedUser: null 
        };
    }),
}));

export default useStore;
