import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import { useGlobalTasks } from './useGlobalTasks';

const DEFAULT_COLUMNS = [
    { id: 'todo', title: 'To Do', cards: [] },
    { id: 'in-progress', title: 'In Progress', cards: [] },
    { id: 'done', title: 'Done', cards: [] }
];

export function usePersonalKanban() {
    const { user, globalTasks } = useStore();
    const { updateTask } = useGlobalTasks();
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Aggregate tasks from globalTasks where user is assigned
        const myTasks = globalTasks.filter(t => t.assignedTo === user?.email);

        const newCols = [
            { id: 'todo', title: 'To Do', cards: myTasks.filter(t => t.status === 'todo') },
            { id: 'in-progress', title: 'In Progress', cards: myTasks.filter(t => t.status === 'in-progress') },
            { id: 'review', title: 'In Review', cards: myTasks.filter(t => t.status === 'review') },
            { id: 'done', title: 'Done', cards: myTasks.filter(t => t.status === 'done') }
        ];

        setColumns(newCols);
        setLoading(false);
    }, [user, globalTasks]);

    const updateColumns = async (newColumns) => {
        // Optimistic UI update
        setColumns(newColumns);
        
        // Find what changed and update the global task state via Firestore hook
        for (const col of newColumns) {
            for (const card of col.cards) {
                const globalTask = globalTasks.find(t => t.id === card.id);
                if (globalTask && globalTask.status !== col.id) {
                    await updateTask(card.id, { status: col.id });
                }
            }
        }
    };

    const addTaskToGlobal = async (title, colId) => {
        if (!user?.email) return;
        await addTask({
            title,
            status: colId,
            assignedTo: user.email,
            type: 'company',
            tags: ['Company']
        });
    };

    return { columns, loading, updateColumns, addTask: addTaskToGlobal };
}
