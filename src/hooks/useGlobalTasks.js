import { useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

export function useGlobalTasks() {
    const { activeCompany, setGlobalTasks } = useStore();

    useEffect(() => {
        if (!activeCompany?.id) return;

        const tasksRef = collection(db, 'companies', activeCompany.id, 'tasks');
        const q = query(tasksRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setGlobalTasks(tasks);
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
            const taskRef = doc(db, 'companies', activeCompany.id, 'tasks', taskId);
            await updateDoc(taskRef, updates);
        } catch (error) {
            console.error("Error updating task:", error);
        }
    };

    const deleteTask = async (taskId) => {
        if (!activeCompany?.id) return;
        try {
            const taskRef = doc(db, 'companies', activeCompany.id, 'tasks', taskId);
            await deleteDoc(taskRef);
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    return { addTask, updateTask, deleteTask };
}
