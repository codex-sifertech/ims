import { Video } from 'lucide-react';

export default function Meetings() {
    return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-dark-800 rounded-full flex items-center justify-center mb-6 border border-dark-700">
                <Video size={48} className="text-slate-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Meetings Integration</h1>
            <p className="text-slate-400 max-w-md">
                This space is reserved for a future integration with video conferencing tools (like Google Meet or Zoom) and calendar syncing.
            </p>
        </div>
    );
}
