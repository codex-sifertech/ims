import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, serverTimestamp, doc, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

export function useProjectTasks(projectId) {
    const { user, activeCompany } = useStore();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid || !activeCompany?.id || !projectId) {
            setLoading(false);
            return;
        }

        const tasksRef = collection(db, 'companies', activeCompany.id, 'projects', projectId, 'tasks');
        const q = query(tasksRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTasks(tasksData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching project tasks:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, activeCompany, projectId]);

    const addTask = async (taskData) => {
        if (!user?.uid || !activeCompany?.id || !projectId) return;

        try {
            const tasksRef = collection(db, 'companies', activeCompany.id, 'projects', projectId, 'tasks');
            await addDoc(tasksRef, {
                ...taskData,
                companyId: activeCompany.id,
                projectId,
                createdBy: user.name || 'Unknown',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error adding task:", error);
            throw error;
        }
    };

    const updateTask = async (taskId, updates) => {
        if (!user?.uid || !activeCompany?.id || !projectId || !taskId) return;

        try {
            const taskRef = doc(db, 'companies', activeCompany.id, 'projects', projectId, 'tasks', taskId);
            await updateDoc(taskRef, {
                ...updates,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating task:", error);
            throw error;
        }
    };

    const deleteTask = async (taskId) => {
        if (!user?.uid || !activeCompany?.id || !projectId || !taskId) return;

        try {
            const taskRef = doc(db, 'companies', activeCompany.id, 'projects', projectId, 'tasks', taskId);
            await deleteDoc(taskRef);
        } catch (error) {
            console.error("Error deleting task:", error);
            throw error;
        }
    };

    return { tasks, loading, addTask, updateTask, deleteTask };
}
