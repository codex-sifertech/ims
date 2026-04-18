import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

export function useProjects() {
    const { user, activeCompany } = useStore();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid || !activeCompany?.id) {
            setLoading(false);
            return;
        }

        const projectsRef = collection(db, 'companies', activeCompany.id, 'projects');
        const q = query(projectsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const projectsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProjects(projectsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching projects:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, activeCompany]);

    const createProject = async (projectData) => {
        if (!user?.uid) {
            console.error("Project creation failed: No user found");
            return null;
        }
        if (!activeCompany?.id) {
            console.error("Project creation failed: No active company found");
            return null;
        }

        try {
            console.log("Creating project under company:", activeCompany.id);
            const projectsRef = collection(db, 'companies', activeCompany.id, 'projects');
            const docRef = await addDoc(projectsRef, {
                ...projectData,
                createdBy: user.uid,
                createdByName: user.name || user.email,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                status: projectData.status || 'ongoing',
                timeLogged: 0
            });
            return docRef.id;
        } catch (error) {
            console.error("Error creating project:", error);
            throw error;
        }
    };

    return { projects, loading, createProject };
}
