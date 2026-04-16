import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import useStore from '../../store/useStore';
import { Loader2, Save } from 'lucide-react';

export default function NotesSection() {
    const { user, activeCompany } = useStore();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user?.uid || !activeCompany?.id) return;

        const docRef = doc(db, 'companies', activeCompany.id, 'work', 'notes');

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setContent(docSnap.data().content || '');
            } else {
                setDoc(docRef, { content: '' });
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, activeCompany]);

    const handleSave = async () => {
        if (!user?.uid || !activeCompany?.id) return;
        setSaving(true);
        try {
            const docRef = doc(db, 'companies', activeCompany.id, 'work', 'notes');
            await setDoc(docRef, { content }, { merge: true });
        } catch (error) {
            console.error("Error saving notes:", error);
        } finally {
            setTimeout(() => setSaving(false), 500); // UI feedback
        }
    };

    if (loading) return <div className="h-full flex items-center justify-center text-slate-500"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="h-full flex flex-col p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Daily Journal & Notes</h2>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving...' : 'Save Notes'}
                </button>
            </div>

            <div className="flex-1 bg-dark-800 rounded-xl border border-dark-700 p-4 relative group">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-full bg-transparent text-slate-300 resize-none focus:outline-none focus:text-white custom-scrollbar text-base leading-relaxed"
                    placeholder="Start writing your notes here..."
                />
            </div>
        </div>
    );
}
