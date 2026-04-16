import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

export function useProject(projectId) {
    const { user, activeCompany } = useStore();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid || !activeCompany?.id || !projectId) {
            setLoading(false);
            return;
        }

        const docRef = doc(db, 'companies', activeCompany.id, 'projects', projectId);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setProject({ id: docSnap.id, ...docSnap.data() });
            } else {
                setProject(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching project details:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, activeCompany, projectId]);

    const updateProjectData = async (updates) => {
        if (!user?.uid || !activeCompany?.id || !projectId) return;

        try {
            const docRef = doc(db, 'companies', activeCompany.id, 'projects', projectId);
            await updateDoc(docRef, {
                ...updates,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating project data:", error);
            throw error;
        }
    };

    return { project, loading, updateProjectData };
}
