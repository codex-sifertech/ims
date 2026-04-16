import { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MonitorOff, ShieldCheck, UserPlus, MousePointerClick, ChevronDown, CheckCircle2, Maximize2, Repeat, ExternalLink } from 'lucide-react';
import useStore from '../../store/useStore';

export default function GlobalScreenShare() {
    const { 
        isScreenSharing, 
        activeStreams, 
        currentStreamIndex,
        screenShareProjectId, 
        grantedUser, 
        stopGlobalScreenShare, 
        setGrantedUser, 
        user,
        switchStream,
        removeScreenStream
    } = useStore();
    
    const location = useLocation();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const menuRef = useRef(null);

    const [isHovered, setIsHovered] = useState(false);
    const [showAccessMenu, setShowAccessMenu] = useState(false);

    const activeStream = activeStreams[currentStreamIndex] || activeStreams[0];

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowAccessMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (videoRef.current && activeStream?.stream) {
            videoRef.current.srcObject = activeStream.stream;
        }
    }, [activeStream, isScreenSharing]);

    if (!isScreenSharing || activeStreams.length === 0) return null;

    const isOnProjectPage = location.pathname === `/dashboard/projects/${screenShareProjectId}`;
    if (isOnProjectPage) return null;

    const isMyStream = activeStream?.id === user?.id;

    const handleStopSharing = (e) => {
        e.stopPropagation();
        if (isMyStream) {
            removeScreenStream(user.id);
        } else {
            stopGlobalScreenShare();
        }
    };

    const togglePiP = async (e) => {
        e.stopPropagation();
        try {
            if (videoRef.current !== document.pictureInPictureElement) {
                await videoRef.current.requestPictureInPicture();
            } else {
                await document.exitPictureInPicture();
            }
        } catch (error) {
            console.error('PiP failed', error);
        }
    };

    const handleSwitch = (e) => {
        e.stopPropagation();
        switchStream();
    };

    return (
        <div 
            className={`fixed top-20 right-8 z-[100] transition-all duration-300 ease-in-out bg-dark-900 border border-dark-600 rounded-xl shadow-2xl overflow-hidden cursor-pointer group
                ${isHovered ? 'w-[480px] h-[320px]' : 'w-64 h-36'}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setShowAccessMenu(false);
            }}
            onClick={() => navigate(`/dashboard/projects/${screenShareProjectId}`)}
        >
            <video 
                ref={videoRef}
                autoPlay 
                muted={isMyStream}
                playsInline
                className={`w-full h-full object-cover pointer-events-none transition-opacity ${isHovered ? 'opacity-100' : 'opacity-70'}`}
            />

            {!isHovered && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end p-3 pointer-events-none">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                            <span className="text-[11px] font-bold text-white drop-shadow-md">
                                {isMyStream ? "Your Stream" : `${activeStream?.userName}'s Stream`}
                            </span>
                        </div>
                        {activeStreams.length > 1 && (
                            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide pointer-events-auto">
                                {activeStreams.map((s, idx) => (
                                    <button
                                        key={s.id}
                                        onClick={(e) => { e.stopPropagation(); useStore.setState({ currentStreamIndex: idx }); }}
                                        className={`shrink-0 w-7 h-7 rounded-lg border font-black text-[9px] transition-all
                                            ${currentStreamIndex === idx 
                                                ? 'bg-primary-600 border-primary-500 text-white shadow-lg' 
                                                : 'bg-dark-800/80 border-dark-700 text-slate-500 hover:text-white'}`}
                                    >
                                        {s.userName.charAt(0)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className={`absolute inset-0 bg-black/60 transition-opacity duration-300 flex flex-col justify-between p-4 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 bg-dark-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-dark-600 shadow-xl">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-white uppercase tracking-tight">{isMyStream ? "Viewing Self" : `Viewing: ${activeStream?.userName}`}</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        {isMyStreamSharing && (
                            <div className="relative">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowAccessMenu(!showAccessMenu); }}
                                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all shadow-xl
                                        ${grantedUser ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-dark-800/90 border-dark-600 text-slate-400 hover:text-white'}`}
                                    title="Grant Access"
                                >
                                    <ShieldCheck size={16} />
                                </button>

                                {showAccessMenu && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        <div className="p-2 border-b border-dark-700 bg-dark-900/50">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Share Control</p>
                                        </div>
                                        <div className="p-1">
                                            <button 
                                                onClick={() => { setGrantedUser(null); setShowAccessMenu(false); }}
                                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-dark-700 text-[10px] text-slate-300 font-bold transition-colors group"
                                            >
                                                <span>None</span>
                                                {!grantedUser && <CheckCircle2 size={12} className="text-emerald-500" />}
                                            </button>
                                            {['Team Alpha', 'Project Manager'].map(name => (
                                                <button 
                                                    key={name}
                                                    onClick={() => { setGrantedUser({ name }); setShowAccessMenu(false); }}
                                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-dark-700 text-[10px] text-slate-300 font-bold transition-colors group"
                                                >
                                                    <span>{name}</span>
                                                    {grantedUser?.name === name && <CheckCircle2 size={12} className="text-emerald-500" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <button 
                            onClick={togglePiP}
                            className="w-9 h-9 rounded-lg bg-dark-800/90 hover:bg-primary-600 text-white border border-dark-600 flex items-center justify-center transition-all shadow-xl"
                            title="Picture in Picture"
                        >
                            <ExternalLink size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex justify-center gap-3 w-full" onClick={e => e.stopPropagation()}>
                    <button 
                        onClick={handleStopSharing}
                        className="h-10 px-5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-red-500/20 text-xs uppercase tracking-wider"
                    >
                        <MonitorOff size={16} /> {isMyStream ? 'Stop My Share' : 'Close Multi-View'}
                    </button>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/projects/${screenShareProjectId}`); }}
                        className="h-10 px-5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-primary-500/20 text-xs uppercase tracking-wider"
                    >
                        <Maximize2 size={16} /> Full View
                    </button>
                </div>
            </div>
        </div>
    );
}

