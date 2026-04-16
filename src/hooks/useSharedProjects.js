import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

// Projects are currently stored globally. In a real multi-company setup, 
// they would be nested under a company ID.
export function useSharedProjects() {
    const { user, activeCompany } = useStore();
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid || !activeCompany?.id) return;

        const docRef = doc(db, 'companies', activeCompany.id, 'projects', 'sharedKanban');

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setColumns(docSnap.data().columns || []);
            } else {
                const defaultCols = [
                    { id: 'ongoing', title: 'Ongoing', cards: [] },
                    { id: 'upcoming', title: 'Upcoming', cards: [] },
                    { id: 'completed', title: 'Completed', cards: [] }
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
            const docRef = doc(db, 'companies', activeCompany.id, 'projects', 'sharedKanban');
            await updateDoc(docRef, { columns: newColumns });
        } catch (error) {
            console.error("Error updating shared projects:", error);
        }
    };

    return { columns, loading, updateColumns };
}
