import { useState, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Mic, Square, Play, Pause, Trash2, CheckCircle, Clock, User, Paperclip } from 'lucide-react';

export default function AdvancedStepNode({ data, isConnectable }) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(data.audioBlob || null);
    const [isPlaying, setIsPlaying] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioPlayerRef = useRef(new Audio());

    const isCompleted = data.status === 'completed';

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
                if (data.onAudioRecorded) data.onAudioRecorded(blob);
            };
            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            alert("Microphone access is required.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const togglePlayback = () => {
        if (!audioBlob) return;
        if (isPlaying) {
            audioPlayerRef.current.pause();
            setIsPlaying(false);
        } else {
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPlayerRef.current.src = audioUrl;
            audioPlayerRef.current.onended = () => setIsPlaying(false);
            audioPlayerRef.current.play();
            setIsPlaying(true);
        }
    };

    const updateStatus = () => {
        if (data.onChange) {
            data.onChange({ ...data, status: isCompleted ? 'pending' : 'completed' });
        }
    };

    return (
        <div className={`bg-dark-800 border-2 rounded-2xl shadow-2xl w-[320px] overflow-hidden transition-all duration-300 ${isCompleted ? 'border-emerald-500 shadow-emerald-500/10' : 'border-primary-500/50 hover:border-primary-500'}`}>
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-primary-500 border-dark-900" />
            
            {/* Header */}
            <div className={`px-4 py-3 flex items-center justify-between ${isCompleted ? 'bg-emerald-500/10' : 'bg-primary-500/10'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-primary-600 text-white'}`}>
                        {data.stepNumber}
                    </div>
                    <input 
                        className="bg-transparent text-sm font-bold text-white outline-none w-[180px] placeholder-slate-500"
                        value={data.title || ''}
                        onChange={(e) => data.onChange && data.onChange({ ...data, title: e.target.value })}
                        placeholder="Step Title"
                    />
                </div>
                <button 
                    onClick={updateStatus}
                    className={`p-1.5 rounded-lg transition-colors ${isCompleted ? 'text-emerald-500 bg-emerald-500/20' : 'text-slate-500 bg-dark-700 hover:text-emerald-500'}`}
                >
                    <CheckCircle size={18} fill={isCompleted ? 'currentColor' : 'none'} />
                </button>
            </div>

            <div className="p-4 space-y-4">
                {/* Description */}
                <textarea 
                    className="w-full bg-dark-900/50 border border-dark-700 rounded-xl p-3 text-xs text-slate-300 outline-none focus:border-primary-500/50 resize-none h-[80px]"
                    placeholder="Describe this step in detail..."
                    value={data.description || ''}
                    onChange={(e) => data.onChange && data.onChange({ ...data, description: e.target.value })}
                />

                {/* Meta Row */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 bg-dark-900/50 border border-dark-700 rounded-lg px-2 py-1.5 flex items-center gap-2">
                        <User size={12} className="text-slate-500" />
                        <input 
                            className="bg-transparent text-[10px] text-white outline-none w-full"
                            placeholder="Assign to..."
                            value={data.assignee || ''}
                            onChange={(e) => data.onChange && data.onChange({ ...data, assignee: e.target.value })}
                        />
                    </div>
                    <div className="flex-1 bg-dark-900/50 border border-dark-700 rounded-lg px-2 py-1.5 flex items-center gap-2">
                        <Clock size={12} className="text-slate-500" />
                        <input 
                            className="bg-transparent text-[10px] text-white outline-none w-full"
                            placeholder="Duration"
                            value={data.duration || ''}
                            onChange={(e) => data.onChange && data.onChange({ ...data, duration: e.target.value })}
                        />
                    </div>
                </div>

                {/* Audio/Files Section */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-dark-900 border border-dark-700 p-2 rounded-xl flex items-center justify-between">
                        {!audioBlob ? (
                            <>
                                <span className="text-[10px] text-slate-500">{isRecording ? 'Recording...' : 'Voice Note'}</span>
                                <button 
                                    onClick={isRecording ? stopRecording : startRecording}
                                    className={`p-1.5 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-primary-600 text-white hover:bg-primary-500'}`}
                                >
                                    {isRecording ? <Square size={10} fill="currentColor" /> : <Mic size={10} />}
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={togglePlayback} className="text-emerald-400 hover:text-emerald-300">
                                    {isPlaying ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
                                </button>
                                <span className="text-[9px] font-bold text-emerald-500">READY</span>
                                <button onClick={() => setAudioBlob(null)} className="text-slate-600 hover:text-red-400">
                                    <Trash2 size={10} />
                                </button>
                            </>
                        )}
                    </div>
                    <button className="bg-dark-900 border border-dark-700 rounded-xl flex items-center justify-center gap-2 text-[10px] text-slate-500 hover:text-white transition-colors">
                        <Paperclip size={12} /> Attach
                    </button>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary-500 border-dark-900" />
        </div>
    );
}
