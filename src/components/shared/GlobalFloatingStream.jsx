import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Maximize2, X, GripHorizontal, Monitor } from 'lucide-react';
import useStore from '../../store/useStore';

export default function GlobalFloatingStream() {
    const { isScreenSharing, activeStreams, currentStreamIndex, removeScreenStream, user } = useStore();
    const location = useLocation();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const [position, setPosition] = useState({ x: window.innerWidth - 320, y: window.innerHeight - 200 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const activeStream = activeStreams[currentStreamIndex] || activeStreams[0];
    
    // Determining if we should show the floating window
    // Only show if sharing is active and we are NOT on the main project details page
    const shouldShow = isScreenSharing && activeStream && !location.pathname.includes('/projects/');

    useEffect(() => {
        if (shouldShow && videoRef.current && activeStream?.stream) {
            videoRef.current.srcObject = activeStream.stream;
        }
    }, [shouldShow, activeStream]);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        dragStart.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const newX = Math.max(20, Math.min(window.innerWidth - 300, e.clientX - dragStart.current.x));
            const newY = Math.max(20, Math.min(window.innerHeight - 180, e.clientY - dragStart.current.y));
            setPosition({ x: newX, y: newY });
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    if (!shouldShow) return null;

    return (
        <div 
            style={{ left: position.x, top: position.y }}
            className={`fixed w-72 h-44 bg-dark-900 border border-primary-500/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999] overflow-hidden flex flex-col group transition-shadow ${isDragging ? 'shadow-primary-500/20 ring-2 ring-primary-500/50' : ''}`}
        >
            {/* Header / Drag Handle */}
            <div 
                onMouseDown={handleMouseDown}
                className="h-8 bg-dark-950 border-b border-white/5 flex items-center justify-between px-3 cursor-move shrink-0"
            >
                <div className="flex items-center gap-2">
                    <Monitor size={12} className="text-primary-400" />
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest truncate max-w-[120px]">
                        {activeStream.userName}'s Screen
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => navigate(`/dashboard/projects/${useStore.getState().screenShareProjectId || 'active'}`)}
                        className="p-1 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-colors"
                        title="Expand"
                    >
                        <Maximize2 size={12} />
                    </button>
                    <button 
                        onClick={() => removeScreenStream(activeStream.id)}
                        className="p-1 hover:bg-red-500/20 rounded-md text-slate-400 hover:text-red-400 transition-colors"
                        title="Stop"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* Video Content */}
            <div className="flex-1 bg-black relative">
                <video 
                    ref={videoRef}
                    autoPlay 
                    muted={activeStream.id === user?.uid}
                    playsInline
                    className="w-full h-full object-contain pointer-events-none"
                />
                
                {/* Status Indicator */}
                <div className="absolute top-2 right-2 bg-red-500/80 backdrop-blur px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-tighter">
                    LIVE
                </div>
            </div>

            <style jsx="true">{`
                .fixed {
                    position: fixed !important;
                }
            `}</style>
        </div>
    );
}
