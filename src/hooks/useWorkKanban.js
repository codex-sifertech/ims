import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

export function useWorkKanban() {
    const { user, activeCompany } = useStore();
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid || !activeCompany?.id) return;

        const docRef = doc(db, 'companies', activeCompany.id, 'work', 'kanban');

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setColumns(docSnap.data().columns || []);
            } else {
                const defaultCols = [
                    { id: 'todo', title: 'To Do', cards: [] },
                    { id: 'in-progress', title: 'In Progress', cards: [] },
                    { id: 'review', title: 'In Review', cards: [] },
                    { id: 'done', title: 'Done', cards: [] }
                ];
                setDoc(docRef, { columns: defaultCols });
                setColumns(defaultCols);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, activeCompany]);

    const updateColumns = async (newColumns) => {
        setColumns(newColumns);
        if (!user?.uid || !activeCompany?.id) return;

        try {
            const docRef = doc(db, 'companies', activeCompany.id, 'work', 'kanban');
            await updateDoc(docRef, { columns: newColumns });
        } catch (error) {
            console.error("Error updating work kanban:", error);
        }
    };

    return { columns, loading, updateColumns };
}
