import { useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, collectionGroup, where } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

export function useGlobalTasks() {
    const { activeCompany, setGlobalTasks } = useStore();

    useEffect(() => {
        if (!activeCompany?.id) return;

        // Fetch company-level tasks
        const companyTasksRef = collection(db, 'companies', activeCompany.id, 'tasks');
        
        // Fetch ALL tasks in this company ecosystem using collectionGroup
        // NOTE: This requires a Firestore index for collection 'tasks' with field 'companyId'
        const allTasksQuery = query(
            collectionGroup(db, 'tasks'),
            where('companyId', '==', activeCompany.id)
        );

        const unsubscribe = onSnapshot(allTasksQuery, (snapshot) => {
            const tasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Store the full path for easier updates later
                _path: doc.ref.path
            }));
            setGlobalTasks(tasks);
        }, (error) => {
            console.error("Collection Group query failed (may need index):", error);
            
            // Fallback to just company tasks if index isn't ready
            onSnapshot(companyTasksRef, (snap) => {
                const tasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), _path: doc.ref.path }));
                setGlobalTasks(tasks);
            });
        });

        return () => unsubscribe();
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
