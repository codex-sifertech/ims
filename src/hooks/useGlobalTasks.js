import { useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, collectionGroup, where } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

export function useGlobalTasks() {
    const { activeCompany, setGlobalTasks, globalTasks } = useStore();

    useEffect(() => {
        if (!activeCompany?.id) {
            setGlobalTasks([]); // Will set loading false
            return;
        }

        const unsubscribes = [];
        let allTasks = new Map(); // Store tasks by their unique _path

        // Helper to merge and update global state
        const updateState = () => {
            setGlobalTasks(Array.from(allTasks.values()));
        };

        // 1. Listen to Company-level tasks
        const companyTasksRef = collection(db, 'companies', activeCompany.id, 'tasks');
        const unsubCompanyTasks = onSnapshot(companyTasksRef, (snap) => {
            snap.docs.forEach(doc => {
                allTasks.set(doc.ref.path, { id: doc.id, ...doc.data(), _path: doc.ref.path });
            });
            // Handle deletions
            snap.docChanges().forEach(change => {
                if (change.type === 'removed') allTasks.delete(change.doc.ref.path);
            });
            updateState();
        }, (err) => console.error("Error fetching company tasks:", err));
        unsubscribes.push(unsubCompanyTasks);

        // 2. Listen to Projects to dynamically attach task listeners for EACH project
        // This entirely bypasses the need for a strict collectionGroup index!
        const projectsRef = collection(db, 'companies', activeCompany.id, 'projects');
        const projectTaskUnsubs = new Map();

        const unsubProjects = onSnapshot(projectsRef, (snap) => {
            snap.docChanges().forEach(change => {
                const projectId = change.doc.id;
                
                if (change.type === 'added' || change.type === 'modified') {
                    // Extract the project title so the UI can show human-readable names
                    const projectTitle = change.doc.data().title || change.doc.data().name || `Project ${projectId.substring(0,4)}`;

                    // Only sub if we haven't already
                    if (!projectTaskUnsubs.has(projectId)) {
                        const pTasksRef = collection(db, 'companies', activeCompany.id, 'projects', projectId, 'tasks');
                        const unsubP = onSnapshot(pTasksRef, (pSnap) => {
                            pSnap.docs.forEach(doc => {
                                allTasks.set(doc.ref.path, { 
                                    id: doc.id, 
                                    ...doc.data(), 
                                    _path: doc.ref.path, 
                                    projectId,
                                    projectTitle // Embedded dynamically!
                                });
                            });
                            pSnap.docChanges().forEach(c => {
                                if (c.type === 'removed') allTasks.delete(c.doc.ref.path);
                            });
                            updateState();
                        }, (err) => console.error(`Error fetching tasks for project ${projectId}:`, err));
                        
                        projectTaskUnsubs.set(projectId, unsubP);
                        unsubscribes.push(unsubP);
                    } else {
                        // If project title changed, update existing tasks in memory mapped to this project
                        for (const [path, task] of allTasks.entries()) {
                            if (task.projectId === projectId) {
                                allTasks.set(path, { ...task, projectTitle });
                            }
                        }
                        updateState();
                    }
                }
                
                if (change.type === 'removed') {
                    // Cleanup removed project listener
                    const unsubP = projectTaskUnsubs.get(projectId);
                    if (unsubP) unsubP();
                    projectTaskUnsubs.delete(projectId);
                    // Remove its tasks from memory
                    for (const [path, task] of allTasks.entries()) {
                        if (task.projectId === projectId) allTasks.delete(path);
                    }
                    updateState();
                }
            });
        }, (err) => console.error("Error fetching projects for tasks:", err));
        
        unsubscribes.push(unsubProjects);

        return () => {
            unsubscribes.forEach(unsub => unsub());
            projectTaskUnsubs.forEach(unsub => unsub());
        };
    }, [activeCompany?.id, setGlobalTasks]);

    const addTask = async (taskData) => {
        if (!activeCompany?.id) return;
        try {
            const tasksRef = collection(db, 'companies', activeCompany.id, 'tasks');
            await addDoc(tasksRef, {
                ...taskData,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error adding task:", error);
        }
    };

    const updateTask = async (taskId, updates) => {
        if (!activeCompany?.id) return;
        try {
            // Find the task in the current globalTasks state to get its path
            const task = globalTasks.find(t => t.id === taskId);
            const path = task?._path || `companies/${activeCompany.id}/tasks/${taskId}`;
            const taskRef = doc(db, path);
            await updateDoc(taskRef, updates);
        } catch (error) {
            console.error("Error updating task:", error);
        }
    };

    const deleteTask = async (taskId) => {
        if (!activeCompany?.id) return;
        try {
            const task = globalTasks.find(t => t.id === taskId);
            const path = task?._path || `companies/${activeCompany.id}/tasks/${taskId}`;
            const taskRef = doc(db, path);
            await deleteDoc(taskRef);
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    const addTaskToGlobal = async (taskData) => {
        if (!activeCompany?.id) return;
        try {
            const tasksRef = collection(db, 'companies', activeCompany.id, 'tasks');
            await addDoc(tasksRef, {
                ...taskData,
                companyId: activeCompany.id,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error adding task:", error);
        }
    };

    return { addTask: addTaskToGlobal, updateTask, deleteTask };
}
