import { useState, useRef, useEffect } from 'react';
import { MonitorUp, MonitorOff, UserPlus, MousePointerClick, ShieldCheck, ChevronDown, CheckCircle2, Repeat, ExternalLink } from 'lucide-react';
import useStore from '../../store/useStore';

export default function ScreenShareViewer({ projectId }) {
    const { 
        user, 
        isScreenSharing, 
        activeStreams,
        currentStreamIndex,
        screenShareProjectId, 
        addScreenStream,
        removeScreenStream,
        stopGlobalScreenShare,
        grantedUser,
        setGrantedUser,
        switchStream
    } = useStore();
    
    const [error, setError] = useState('');
    const videoRef = useRef(null);
    const [showAccessMenu, setShowAccessMenu] = useState(false);
    const [members, setMembers] = useState([]);
    const menuRef = useRef(null);

    // Sync company members for access control
    useEffect(() => {
        if (!activeCompany?.id) return;
        const membersRef = collection(db, 'companies', activeCompany.id, 'members');
        const unsub = onSnapshot(membersRef, (snap) => {
            setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, [activeCompany?.id]);

    const activeStream = activeStreams[currentStreamIndex] || activeStreams[0];
    const isMyStreamSharing = activeStreams.some(s => s.id === user?.id);

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

    const startScreenShare = async () => {
        try {
            setError('');
            const mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" },
                audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
            });

            mediaStream.getVideoTracks()[0].onended = () => {
                removeScreenStream(user.id);
            };

            addScreenStream(user.id, mediaStream, user.name || 'You', projectId);
            setGrantedUser(null);
        } catch (err) {
            console.error("Error accessing display media.", err);
            setError("Could not start screen share. Please check your browser permissions.");
        }
    };

    const togglePiP = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (videoRef.current) {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (error) {
            console.error('PiP failed', error);
        }
    };

    return (
        <div className="h-full flex flex-col bg-dark-950 rounded-2xl overflow-hidden border border-dark-700 relative shadow-2xl min-h-[600px]">
            {/* Top Toolbar */}
            <div className="w-full h-16 bg-dark-900 border-b border-dark-700 flex items-center justify-between px-6 shrink-0 z-20 shadow-md">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-900/30 rounded-lg border border-primary-500/30">
                            <MonitorUp size={18} className="text-primary-400" />
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm tracking-tight">Collaboration Hub</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                                {activeStreams.length} {activeStreams.length === 1 ? 'ACTIVE STREAM' : 'ACTIVE STREAMS'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isMyStreamSharing ? (
                        <button 
                            onClick={startScreenShare}
                            className="h-10 px-5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary-500/20 text-xs uppercase"
                        >
                            <MonitorUp size={16} /> Share My Screen
                        </button>
                    ) : (
                        <button 
                            onClick={() => removeScreenStream(user.id)}
                            className="h-10 px-5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-500/20 text-xs uppercase"
                        >
                            <MonitorOff size={16} /> Stop Sharing
                        </button>
                    )}

                    {isMyStreamSharing && (
                        <div className="relative" ref={menuRef}>
                            <button 
                                onClick={() => setShowAccessMenu(!showAccessMenu)}
                                className={`h-10 px-4 rounded-xl border flex items-center gap-2 transition-all font-bold text-xs uppercase
                                    ${grantedUser ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-dark-800 border-dark-600 text-slate-300 hover:text-white hover:bg-dark-700'}`}
                            >
                                <ShieldCheck size={16} />
                                {grantedUser ? 'Control Active' : 'Grant Access'}
                                <ChevronDown size={14} className={`transition-transform duration-300 ${showAccessMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {showAccessMenu && (
                                <div className="absolute right-0 mt-2 w-64 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="p-3 border-b border-dark-700 bg-dark-900/50">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grant Remote Control</p>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        <button 
                                            onClick={() => { setGrantedUser(null); setShowAccessMenu(false); }}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-dark-700 text-slate-300 transition-colors group"
                                        >
                                            <span className="text-xs font-semibold group-hover:text-white transition-colors">Revoke All Access</span>
                                            {!grantedUser && <CheckCircle2 size={14} className="text-emerald-500" />}
                                        </button>
                                        {members.length > 0 ? members.map((m) => (
                                            <button
                                                key={m.id}
                                                onClick={() => {
                                                    setGrantedUser(m.id === grantedUser ? null : m.id);
                                                    setShowAccessMenu(false);
                                                }}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                                                    grantedUser === m.id 
                                                    ? 'bg-primary-500/20 border-primary-500 text-primary-400' 
                                                    : 'bg-dark-800 border-white/5 text-slate-400 hover:text-white hover:bg-dark-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-dark-900 border border-white/5 flex items-center justify-center text-[10px] font-black uppercase overflow-hidden">
                                                        {m.photoURL ? <img src={m.photoURL} alt="" /> : m.name?.charAt(0)}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-xs font-black uppercase tracking-tight">{m.name || 'Anonymous'}</p>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{m.role || 'Member'}</p>
                                                    </div>
                                                </div>
                                                {grantedUser === m.id && <Check size={14} />}
                                            </button>
                                        )) : (
                                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center py-4">No active nodes detected</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <button 
                        onClick={togglePiP}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-dark-800 border border-dark-600 text-slate-400 hover:text-white hover:bg-dark-700 transition-all shadow-md"
                        title="Picture in Picture"
                    >
                        <ExternalLink size={18} />
                    </button>
                </div>
            </div>

            {/* Main Viewing Area */}
            <div className={`flex-1 w-full flex relative bg-dark-900 overflow-hidden`}>
                {/* Side Stream List (only if multiple) */}
                {activeStreams.length > 1 && (
                    <div className="w-16 h-full bg-dark-950 border-r border-dark-800 flex flex-col items-center py-4 gap-4 scrollbar-hide overflow-y-auto">
                        {activeStreams.map((s, idx) => (
                            <button 
                                key={s.id}
                                onClick={() => useStore.setState({ currentStreamIndex: idx })}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border transition-all
                                    ${currentStreamIndex === idx 
                                        ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-500/20' 
                                        : 'bg-dark-800 border-dark-700 text-slate-500 hover:text-white hover:bg-dark-700'
                                    }`}
                                title={s.userName}
                            >
                                {s.userName.charAt(0)}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex-1 relative flex flex-col bg-black overflow-hidden">
                    {activeStream ? (
                        <>
                            <video 
                                ref={videoRef}
                                autoPlay 
                                muted={activeStream.id === user?.id}
                                playsInline
                                className="w-full h-full object-contain"
                            />
                            
                            {/* Overlay Info */}
                            <div className="absolute top-6 left-6 flex items-center gap-3 bg-dark-900/90 backdrop-blur px-4 py-2 rounded-xl border border-dark-600 shadow-2xl pulse-border z-10 pointer-events-none">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                </span>
                                <span className="text-xs font-bold text-white tracking-widest uppercase">
                                    {activeStream.id === user?.id ? "YOU ARE BROADCASTING" : `VIEWING: ${activeStream.userName}`}
                                </span>
                            </div>

                            {grantedUser && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center animate-bounce z-20">
                                    <div className="bg-emerald-500 text-dark-900 text-[10px] font-black px-3 py-1 rounded-full shadow-2xl mb-2 uppercase tracking-tighter">
                                        {grantedUser.name} CONTROLLING
                                    </div>
                                    <MousePointerClick className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" size={32} />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-center p-8 bg-gradient-to-b from-dark-900 to-black">
                            <div className="max-w-md">
                                <div className="w-24 h-24 bg-dark-800 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-dark-700 shadow-2xl relative">
                                    <MonitorUp size={48} className="text-primary-500" />
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center border-4 border-dark-900">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                    </div>
                                </div>
                                <h3 className="text-3xl font-black text-white mb-4 tracking-tight uppercase">Ready for Transmission</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-10 font-medium">
                                    Broadcasting is currently inactive. Share your workspace to collaborate in real-time with your team.
                                </p>
                                <button 
                                    onClick={startScreenShare}
                                    className="px-8 py-4 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-bold transition-all active:scale-95 shadow-2xl shadow-primary-500/30 flex items-center gap-3 mx-auto uppercase text-xs tracking-widest"
                                >
                                    <MonitorUp size={18} /> Initialize Screen Share
                                </button>
                                {error && <p className="mt-6 text-red-500 text-xs font-bold bg-symbols-900/20 py-2 px-4 rounded-lg border border-red-900/50">{error}</p>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <style jsx="true">{`
                .pulse-border {
                    animation: pulseBorder 3s infinite;
                }
                @keyframes pulseBorder {
                    0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
                }
            `}</style>
        </div>
    );
}

