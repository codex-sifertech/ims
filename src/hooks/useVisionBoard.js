import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

export function useVisionBoard() {
    const { user, activeCompany } = useStore();
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid || !activeCompany?.id) return;

        const docRef = doc(db, 'companies', activeCompany.id, 'dashboard', 'visionBoard');

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setBlocks(docSnap.data().blocks || []);
            } else {
                // Initialize default empty blocks
                setDoc(docRef, { blocks: [] });
                setBlocks([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, activeCompany]);

    const updateBlocks = async (newBlocks) => {
        // Optimistic UI update
        setBlocks(newBlocks);
        if (!user?.uid || !activeCompany?.id) return;

        try {
            const docRef = doc(db, 'companies', activeCompany.id, 'dashboard', 'visionBoard');
            await updateDoc(docRef, { blocks: newBlocks });
        } catch (error) {
            console.error("Error updating vision board:", error);
        }
    };

    return { blocks, loading, updateBlocks };
}
