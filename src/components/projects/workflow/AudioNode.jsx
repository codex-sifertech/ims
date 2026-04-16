import { useState, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react';

export default function AudioNode({ data, isConnectable }) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(data.audioBlob || null);
    const [isPlaying, setIsPlaying] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioPlayerRef = useRef(new Audio());

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                
                // Keep the tracks stopped to stop mic icon in browser tab
                stream.getTracks().forEach(track => track.stop());
                
                // Update parent node data
                if (data.onAudioRecorded) data.onAudioRecorded(blob);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Microphone access is required to record workflow steps.");
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

    const clearAudio = () => {
        setAudioBlob(null);
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
        setIsPlaying(false);
    };

    return (
        <div className="bg-dark-800 border-2 border-primary-500 rounded-xl shadow-xl w-[280px] p-4 text-white font-sans relative group">
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-3 h-3 bg-primary-400 border-dark-900" />
            
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-600/30 text-primary-400 flex items-center justify-center font-bold text-xs">
                        {data.stepNumber || '●'}
                    </div>
                    <h3 className="text-sm font-semibold tracking-wide text-slate-100">{data.title || 'Voice Step'}</h3>
                </div>
            </div>

            <p className="text-xs text-slate-400 mb-4">{data.description || 'Record instructions for this workflow step.'}</p>

            <div className="bg-dark-900 border border-dark-700 p-3 rounded-lg flex flex-col gap-3">
                {!audioBlob ? (
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">{isRecording ? 'Recording in progress...' : 'No voice note attached'}</span>
                        <button 
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`p-2 rounded-full transition-all flex items-center justify-center
                                ${isRecording 
                                    ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse' 
                                    : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md shadow-indigo-500/20'}`}
                            title={isRecording ? 'Stop Recording' : 'Start Recording'}
                        >
                            {isRecording ? <Square size={14} fill="currentColor" /> : <Mic size={14} />}
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={togglePlayback}
                                className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
                            >
                                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                            </button>
                            <span className="text-xs font-medium text-emerald-400">Voice Note saved</span>
                        </div>
                        <button 
                            onClick={clearAudio}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                            title="Delete Voice Note"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-3 h-3 bg-primary-400 border-dark-900" />
        </div>
    );
}
