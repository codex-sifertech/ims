import { useState, useRef, useEffect, useCallback } from 'react';
import {
    MonitorUp, MonitorOff, ShieldCheck, ChevronDown, CheckCircle2,
    ExternalLink, Users, ToggleLeft, ToggleRight, X, MousePointerClick
} from 'lucide-react';
import {
    doc, setDoc, deleteDoc, collection, onSnapshot,
    serverTimestamp, addDoc, updateDoc, getDocs
} from 'firebase/firestore';
import { db } from '../../firebase';
import useStore from '../../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScreenShareViewer({ projectId }) {
    const {
        user, activeCompany,
        isScreenSharing, activeStreams, currentStreamIndex, screenShareProjectId,
        addScreenStream, removeScreenStream, stopGlobalScreenShare,
        grantedUser, setGrantedUser, switchStream
    } = useStore();

    const [error, setError] = useState('');
    const videoRef = useRef(null);
    const [members, setMembers] = useState([]);
    const [viewers, setViewers] = useState([]);           // screenSessions/{sid}/viewers
    const [controlRequest, setControlRequest] = useState(null); // pending request
    const [myViewerDoc, setMyViewerDoc] = useState(null); // current user's viewer doc
    const [sessionId, setSessionId] = useState(null);

    const activeStream = activeStreams[currentStreamIndex] || activeStreams[0];
    const isMyStreamSharing = activeStreams.some(s => s.id === user?.uid);
    const isHost = isMyStreamSharing;

    // Sync members
    useEffect(() => {
        if (!activeCompany?.id) return;
        const ref = collection(db, 'companies', activeCompany.id, 'members');
        return onSnapshot(ref, snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [activeCompany?.id]);

    // Sync video element
    useEffect(() => {
        if (videoRef.current && activeStream?.stream) {
            videoRef.current.srcObject = activeStream.stream;
        }
    }, [activeStream, isScreenSharing]);

    // Determine sessionId (projectId-based)
    useEffect(() => {
        if (projectId) setSessionId(`${activeCompany?.id}-${projectId}`);
    }, [projectId, activeCompany?.id]);

    // Viewers panel subscription (host only)
    useEffect(() => {
        if (!sessionId || !isHost) return;
        const ref = collection(db, 'screenSessions', sessionId, 'viewers');
        return onSnapshot(ref, snap => setViewers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [sessionId, isHost]);

    // Listen for control requests (host only)
    useEffect(() => {
        if (!sessionId || !isHost) return;
        const ref = collection(db, 'screenSessions', sessionId, 'controlRequests');
        return onSnapshot(ref, snap => {
            const pending = snap.docs.find(d => d.data().status === 'pending');
            setControlRequest(pending ? { id: pending.id, ...pending.data() } : null);
        });
    }, [sessionId, isHost]);

    // Viewer: subscribe to own viewer doc to get canControl badge
    useEffect(() => {
        if (!sessionId || isHost || !user?.uid) return;
        const ref = doc(db, 'screenSessions', sessionId, 'viewers', user.uid);
        return onSnapshot(ref, snap => {
            setMyViewerDoc(snap.exists() ? snap.data() : null);
        });
    }, [sessionId, isHost, user?.uid]);

    const startScreenShare = async () => {
        try {
            setError('');
            const mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
                audio: { echoCancellation: true, noiseSuppression: true }
            });
            mediaStream.getVideoTracks()[0].onended = () => handleStopSharing();
            addScreenStream(user.uid, mediaStream, user.name || 'You', projectId);

            // Create session doc
            if (sessionId) {
                await setDoc(doc(db, 'screenSessions', sessionId), {
                    hostUserId: user.uid,
                    hostName: user.name || 'Host',
                    projectId: projectId || null,
                    startedAt: serverTimestamp(),
                });
            }
        } catch (err) {
            setError('Could not start screen share. Check browser permissions.');
        }
    };

    const handleStopSharing = async () => {
        removeScreenStream(user.uid);
        if (!sessionId) return;
        try {
            // Delete viewer subcollection docs
            const viewersSnap = await getDocs(collection(db, 'screenSessions', sessionId, 'viewers'));
            const reqSnap = await getDocs(collection(db, 'screenSessions', sessionId, 'controlRequests'));
            await Promise.all([
                ...viewersSnap.docs.map(d => deleteDoc(d.ref)),
                ...reqSnap.docs.map(d => deleteDoc(d.ref)),
                deleteDoc(doc(db, 'screenSessions', sessionId))
            ]);
        } catch (e) { console.error('Cleanup error:', e); }
    };

    const revokeViewer = async (viewerId) => {
        if (!sessionId) return;
        await deleteDoc(doc(db, 'screenSessions', sessionId, 'viewers', viewerId));
    };

    const toggleViewerControl = async (viewerId, current) => {
        if (!sessionId) return;
        await setDoc(doc(db, 'screenSessions', sessionId, 'viewers', viewerId),
            { canControl: !current }, { merge: true });
    };

    const handleControlRequest = async (requestId, allow) => {
        if (!sessionId) return;
        const reqRef = doc(db, 'screenSessions', sessionId, 'controlRequests', requestId);
        await updateDoc(reqRef, { status: allow ? 'approved' : 'denied' });
        if (allow) {
            const req = controlRequest;
            await setDoc(doc(db, 'screenSessions', sessionId, 'viewers', req.requesterId),
                { canControl: true }, { merge: true });
        }
        setControlRequest(null);
    };

    const requestControl = async () => {
        if (!sessionId || !user?.uid) return;
        await addDoc(collection(db, 'screenSessions', sessionId, 'controlRequests'), {
            requesterId: user.uid,
            requesterName: user.name || 'Viewer',
            status: 'pending',
            requestedAt: serverTimestamp(),
        });
        // Register as viewer
        await setDoc(doc(db, 'screenSessions', sessionId, 'viewers', user.uid), {
            userId: user.uid, name: user.name || 'Viewer',
            canControl: false, joinedAt: serverTimestamp()
        }, { merge: true });
    };

    const togglePiP = async () => {
        try {
            document.pictureInPictureElement
                ? await document.exitPictureInPicture()
                : videoRef.current && await videoRef.current.requestPictureInPicture();
        } catch {}
    };

    const myCanControl = myViewerDoc?.canControl === true;

    return (
        <div className="h-full flex flex-col bg-dark-950 rounded-2xl overflow-hidden border border-dark-700 shadow-2xl min-h-[600px]">

            {/* Top Toolbar */}
            <div className="w-full h-16 bg-dark-900 border-b border-dark-700 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-900/30 rounded-lg border border-primary-500/30">
                        <MonitorUp size={18} className="text-primary-400" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm">Collaboration Hub</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                            {activeStreams.length} {activeStreams.length === 1 ? 'ACTIVE STREAM' : 'ACTIVE STREAMS'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isMyStreamSharing ? (
                        <button onClick={startScreenShare}
                            className="h-10 px-5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold flex items-center gap-2 transition-all text-xs uppercase shadow-lg shadow-primary-500/20">
                            <MonitorUp size={16} /> Share My Screen
                        </button>
                    ) : (
                        <button onClick={handleStopSharing}
                            className="h-10 px-5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold flex items-center gap-2 transition-all text-xs uppercase shadow-lg shadow-red-500/20">
                            <MonitorOff size={16} /> Stop Sharing
                        </button>
                    )}
                    {/* Viewer: request control */}
                    {!isHost && activeStreams.length > 0 && (
                        <button onClick={requestControl}
                            className="h-10 px-4 rounded-xl bg-dark-800 border border-dark-600 hover:border-primary-500 text-slate-300 hover:text-white text-xs font-bold uppercase transition-all flex items-center gap-2">
                            <MousePointerClick size={15} /> Request Control
                        </button>
                    )}
                    <button onClick={togglePiP}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-dark-800 border border-dark-600 text-slate-400 hover:text-white hover:bg-dark-700 transition-all">
                        <ExternalLink size={18} />
                    </button>
                </div>
            </div>

            {/* Host control request toast */}
            <AnimatePresence>
                {isHost && controlRequest && (
                    <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
                        className="mx-4 mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-3 flex items-center justify-between">
                        <p className="text-sm font-bold text-amber-300">
                            <span className="font-black">{controlRequest.requesterName}</span> is requesting remote control
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => handleControlRequest(controlRequest.id, true)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg uppercase transition-all">Allow</button>
                            <button onClick={() => handleControlRequest(controlRequest.id, false)}
                                className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-slate-300 text-xs font-black rounded-lg uppercase transition-all">Deny</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main area */}
            <div className="flex-1 flex min-h-0">
                {/* Video */}
                <div className="flex-1 relative bg-black overflow-hidden">
                    {activeStream ? (
                        <>
                            <video ref={videoRef} autoPlay muted={activeStream.id === user?.uid}
                                playsInline className="w-full h-full object-contain" />
                            {/* Live badge */}
                            <div className="absolute top-4 left-4 flex items-center gap-2 bg-dark-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-dark-600 pointer-events-none">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                </span>
                                <span className="text-xs font-bold text-white tracking-widest uppercase">
                                    {activeStream.id === user?.uid ? 'Broadcasting' : `Viewing: ${activeStream.userName}`}
                                </span>
                            </div>
                            {/* Viewer control badge */}
                            {!isHost && myViewerDoc && (
                                <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${
                                    myCanControl ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' : 'bg-slate-500/20 border border-slate-500/40 text-slate-400'
                                }`}>
                                    {myCanControl ? '🟢 You have control' : '⚫ View only'}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center h-full text-center p-8">
                            <div className="max-w-sm">
                                <div className="w-20 h-20 bg-dark-800 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-dark-700">
                                    <MonitorUp size={40} className="text-primary-500" />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-3 uppercase">Ready for Transmission</h3>
                                <p className="text-slate-400 text-sm mb-8">No active streams. Start sharing your screen to collaborate.</p>
                                <button onClick={startScreenShare}
                                    className="px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-bold transition-all shadow-2xl shadow-primary-500/30 mx-auto flex items-center gap-2 text-xs uppercase tracking-widest">
                                    <MonitorUp size={16} /> Initialize Screen Share
                                </button>
                                {error && <p className="mt-4 text-red-500 text-xs font-bold">{error}</p>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Viewers panel — host only */}
                {isHost && (
                    <div className="w-56 border-l border-dark-700 bg-dark-900 flex flex-col shrink-0">
                        <div className="p-4 border-b border-dark-700">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Users size={12} /> Viewers ({viewers.length})
                            </h4>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                            {viewers.length === 0 ? (
                                <p className="text-[10px] text-slate-600 text-center pt-4">No viewers yet</p>
                            ) : viewers.map(v => (
                                <div key={v.id} className="bg-dark-800 border border-dark-700 rounded-xl p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-primary-600/20 flex items-center justify-center text-[10px] font-black text-primary-400 uppercase">
                                            {v.name?.charAt(0) || '?'}
                                        </div>
                                        <span className="text-xs font-bold text-white truncate flex-1">{v.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <button onClick={() => toggleViewerControl(v.id, v.canControl)}
                                            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-white transition-colors">
                                            {v.canControl
                                                ? <ToggleRight size={16} className="text-emerald-500" />
                                                : <ToggleLeft size={16} className="text-slate-600" />}
                                            {v.canControl ? 'Control On' : 'View Only'}
                                        </button>
                                        <button onClick={() => revokeViewer(v.id)}
                                            className="p-1 text-slate-600 hover:text-red-400 transition-colors" title="Revoke">
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
