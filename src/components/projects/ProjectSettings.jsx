import React, { useState } from 'react';
import { 
    Save, 
    Trash2, 
    AlertTriangle,
    CheckCircle
} from 'lucide-react';

export default function ProjectSettings({ project, onUpdate }) {
    const [title, setTitle] = useState(project?.title || '');
    const [description, setDescription] = useState(project?.description || '');
    const [status, setStatus] = useState(project?.status || 'ongoing');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onUpdate({
                title,
                description,
                status
            });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error("Failed to update project:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-dark-800 border border-dark-700 rounded-3xl p-8 space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Project Settings</h2>
                    <p className="text-sm text-slate-500">Manage your project core metadata and team visibility.</p>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 pl-1">Project Title</label>
                        <input 
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                            placeholder="Enter project name..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 pl-1">Description</label>
                        <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all resize-none"
                            placeholder="What is this project about?"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 pl-1">Current Status</label>
                        <select 
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                        >
                            <option value="upcoming">Upcoming</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                            <option value="on-hold">On Hold</option>
                        </select>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                        {showSuccess && (
                            <div className="flex items-center gap-2 text-emerald-500 text-sm font-bold animate-in fade-in slide-in-from-left-4">
                                <CheckCircle size={16} />
                                Changes saved successfully!
                            </div>
                        )}
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className="ml-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                        >
                            {isSaving ? "Saving..." : <><Save size={18} /> Update Project</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-500/20 rounded-xl text-red-500">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">Danger Zone</h3>
                        <p className="text-sm text-slate-500 mb-6">Once you delete it, there is no going back. All tasks, mind maps, and workflow data will be permanently erased.</p>
                        <button className="px-6 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 rounded-xl text-xs font-bold transition-all">
                            Delete Project Document
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
