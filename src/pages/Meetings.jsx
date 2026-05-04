import { useState, useEffect, useMemo } from 'react';
import {
    Video, Plus, Calendar, Clock, Users, ExternalLink, Trash2, Search,
    X, Copy, Check, Link2, ChevronDown, Loader2
} from 'lucide-react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import { format, isToday, isTomorrow, isPast, isFuture, addMinutes } from 'date-fns';

const MEETING_DURATIONS = [
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '1 hour', value: 60 },
    { label: '1.5 hours', value: 90 },
    { label: '2 hours', value: 120 },
];

function generateMeetCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${seg(3)}-${seg(4)}-${seg(3)}`;
}

function CreateMeetingModal({ onClose, onCreateMeeting, members }) {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [time, setTime] = useState(format(addMinutes(new Date(), 30), 'HH:mm'));
    const [duration, setDuration] = useState(30);
    const [description, setDescription] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [searchMember, setSearchMember] = useState('');
    const [creating, setCreating] = useState(false);

    const filteredMembers = members.filter(m =>
        m.name?.toLowerCase().includes(searchMember.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchMember.toLowerCase())
    );

    const toggleMember = (member) => {
        setSelectedMembers(prev =>
            prev.find(m => m.id === member.id)
                ? prev.filter(m => m.id !== member.id)
                : [...prev, { id: member.id, name: member.name, photoURL: member.photoURL }]
        );
    };

    const handleCreate = async () => {
        if (!title.trim() || creating) return;
        setCreating(true);
        const meetCode = generateMeetCode();
        const meetLink = `https://meet.google.com/${meetCode}`;
        const scheduledAt = new Date(`${date}T${time}`).toISOString();
        const endsAt = addMinutes(new Date(`${date}T${time}`), duration).toISOString();

        await onCreateMeeting({
            title: title.trim(),
            description: description.trim(),
            meetLink,
            meetCode,
            scheduledAt,
            endsAt,
            duration,
            participants: selectedMembers,
        });
        setCreating(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-dark-900 border border-dark-700 rounded-3xl w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between p-6 border-b border-dark-700 sticky top-0 bg-dark-900 z-10 rounded-t-3xl">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <Video size={20} className="text-primary-400" /> Schedule Meeting
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-dark-700">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Title */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Meeting Title</label>
                        <input
                            autoFocus
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Sprint Planning, Team Sync..."
                            className="w-full bg-dark-800 border border-dark-600 focus:border-primary-500 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none transition-colors placeholder:text-slate-600"
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                                <Calendar size={10} className="inline mr-1" /> Date
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full bg-dark-800 border border-dark-600 focus:border-primary-500 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                                <Clock size={10} className="inline mr-1" /> Time
                            </label>
                            <input
                                type="time"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="w-full bg-dark-800 border border-dark-600 focus:border-primary-500 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Duration</label>
                        <div className="flex flex-wrap gap-2">
                            {MEETING_DURATIONS.map(d => (
                                <button
                                    key={d.value}
                                    type="button"
                                    onClick={() => setDuration(d.value)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                        duration === d.value
                                            ? 'bg-primary-600 text-white border-primary-500 shadow-lg shadow-primary-500/20'
                                            : 'bg-dark-800 text-slate-500 border-dark-600 hover:border-dark-500'
                                    }`}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={2}
                            placeholder="Meeting agenda, notes..."
                            className="w-full bg-dark-800 border border-dark-600 focus:border-primary-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 resize-none"
                        />
                    </div>

                    {/* Participants */}
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                            <Users size={10} className="inline mr-1" /> Participants ({selectedMembers.length})
                        </label>
                        <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
                            <div className="p-2.5 border-b border-dark-700 flex items-center gap-2">
                                <Search size={12} className="text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search members..."
                                    value={searchMember}
                                    onChange={e => setSearchMember(e.target.value)}
                                    className="bg-transparent border-none text-[11px] text-white font-bold outline-none placeholder:text-slate-600 w-full"
                                />
                            </div>
                            <div className="max-h-28 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                                {filteredMembers.map(member => {
                                    const isSelected = selectedMembers.find(m => m.id === member.id);
                                    return (
                                        <button
                                            key={member.id}
                                            type="button"
                                            onClick={() => toggleMember(member)}
                                            className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${
                                                isSelected ? 'bg-primary-500/10 border border-primary-500/20' : 'hover:bg-dark-700 border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-dark-900 border border-white/5 flex items-center justify-center text-slate-500 overflow-hidden text-[9px] font-black uppercase">
                                                    {member.photoURL ? <img src={member.photoURL} className="w-full h-full object-cover" /> : member.name?.charAt(0)}
                                                </div>
                                                <span className="text-[11px] font-bold text-white">{member.name}</span>
                                            </div>
                                            {isSelected && <Check size={12} className="text-primary-500" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose}
                            className="flex-1 py-3 bg-dark-800 hover:bg-dark-700 text-slate-400 text-xs font-black uppercase tracking-widest rounded-2xl transition-all">
                            Cancel
                        </button>
                        <button onClick={handleCreate}
                            disabled={!title.trim() || creating}
                            className="flex-[2] py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-primary-600/30 flex items-center justify-center gap-2">
                            {creating ? <Loader2 className="animate-spin" size={14} /> : <Video size={14} />}
                            {creating ? 'Creating...' : 'Create Meeting'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MeetingCard({ meeting, onDelete, isAdmin }) {
    const [copied, setCopied] = useState(false);
    const scheduled = new Date(meeting.scheduledAt);
    const now = new Date();
    const isLive = !isPast(new Date(meeting.endsAt)) && isPast(scheduled);
    const isUpcoming = isFuture(scheduled);

    const copyLink = () => {
        navigator.clipboard.writeText(meeting.meetLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getDateLabel = () => {
        if (isToday(scheduled)) return 'Today';
        if (isTomorrow(scheduled)) return 'Tomorrow';
        return format(scheduled, 'MMM dd, yyyy');
    };

    return (
        <div className={`bg-dark-800/60 backdrop-blur-md border rounded-2xl p-5 transition-all hover:shadow-lg group ${
            isLive ? 'border-emerald-500/30 shadow-emerald-500/5' : 'border-white/5 hover:border-white/10'
        }`}>
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        {isLive && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Now
                            </span>
                        )}
                        {!isLive && isUpcoming && (
                            <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                Upcoming
                            </span>
                        )}
                        {!isLive && !isUpcoming && (
                            <span className="text-[9px] font-black text-slate-500 bg-dark-700 border border-dark-600 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                Ended
                            </span>
                        )}
                    </div>
                    <h3 className="text-base font-black text-white">{meeting.title}</h3>
                    {meeting.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{meeting.description}</p>
                    )}
                </div>
                {isAdmin && (
                    <button onClick={() => onDelete(meeting.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all shrink-0">
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            {/* Time info */}
            <div className="flex flex-wrap items-center gap-3 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                    <Calendar size={11} className="text-slate-600" />
                    {getDateLabel()}
                </span>
                <span className="flex items-center gap-1.5">
                    <Clock size={11} className="text-slate-600" />
                    {format(scheduled, 'hh:mm a')} · {meeting.duration}min
                </span>
            </div>

            {/* Participants */}
            {meeting.participants?.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex -space-x-2">
                        {meeting.participants.slice(0, 4).map((p, i) => (
                            <div key={p.id || i} className="w-7 h-7 rounded-lg bg-dark-900 border-2 border-dark-800 flex items-center justify-center text-slate-400 overflow-hidden text-[9px] font-black uppercase">
                                {p.photoURL ? <img src={p.photoURL} className="w-full h-full object-cover" /> : p.name?.charAt(0)}
                            </div>
                        ))}
                        {meeting.participants.length > 4 && (
                            <div className="w-7 h-7 rounded-lg bg-dark-900 border-2 border-dark-800 flex items-center justify-center text-slate-500 text-[9px] font-black">
                                +{meeting.participants.length - 4}
                            </div>
                        )}
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{meeting.participants.length} invited</span>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
                <a href={meeting.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isLive
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30'
                            : isUpcoming
                                ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                                : 'bg-dark-700 hover:bg-dark-600 text-slate-400'
                    }`}
                >
                    <Video size={14} />
                    {isLive ? 'Join Now' : isUpcoming ? 'Join Meeting' : 'Rejoin'}
                </a>
                <button onClick={copyLink}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-dark-700 hover:bg-dark-600 text-slate-400 text-xs font-bold rounded-xl transition-all">
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy Link'}
                </button>
            </div>
        </div>
    );
}

export default function Meetings() {
    const { user, activeCompany } = useStore();
    const [meetings, setMeetings] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [filter, setFilter] = useState('all'); // all | upcoming | past
    const [searchQ, setSearchQ] = useState('');

    const isAdmin = user?.role === 'admin' || user?.role === 'master_admin';

    // Load meetings
    useEffect(() => {
        if (!activeCompany?.id) return;
        const meetingsRef = collection(db, 'companies', activeCompany.id, 'meetings');
        const q = query(meetingsRef, orderBy('scheduledAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (err) => {
            console.error('Meetings listener error:', err);
            setLoading(false);
        });
        return unsub;
    }, [activeCompany?.id]);

    // Load members
    useEffect(() => {
        if (!activeCompany?.id) return;
        const membersRef = collection(db, 'companies', activeCompany.id, 'members');
        const unsub = onSnapshot(membersRef, (snap) => {
            setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return unsub;
    }, [activeCompany?.id]);

    const handleCreateMeeting = async (meetingData) => {
        if (!activeCompany?.id) return;
        await addDoc(collection(db, 'companies', activeCompany.id, 'meetings'), {
            ...meetingData,
            createdBy: user.uid,
            createdByName: user.name || user.email,
            createdAt: new Date().toISOString(),
        });
    };

    const handleDeleteMeeting = async (meetingId) => {
        if (!activeCompany?.id) return;
        await deleteDoc(doc(db, 'companies', activeCompany.id, 'meetings', meetingId));
    };

    const filteredMeetings = useMemo(() => {
        let result = meetings;

        if (filter === 'upcoming') {
            result = result.filter(m => isFuture(new Date(m.scheduledAt)) || !isPast(new Date(m.endsAt)));
        } else if (filter === 'past') {
            result = result.filter(m => isPast(new Date(m.endsAt)));
        }

        if (searchQ.trim()) {
            const q = searchQ.toLowerCase();
            result = result.filter(m =>
                m.title?.toLowerCase().includes(q) ||
                m.description?.toLowerCase().includes(q) ||
                m.createdByName?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [meetings, filter, searchQ]);

    const upcomingCount = meetings.filter(m => isFuture(new Date(m.scheduledAt)) || !isPast(new Date(m.endsAt))).length;
    const liveCount = meetings.filter(m => !isPast(new Date(m.endsAt)) && isPast(new Date(m.scheduledAt))).length;

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto bg-dark-900 custom-scrollbar">
            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
                <div className="relative">
                    <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-primary-500 to-transparent rounded-full" />
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Meetings</h1>
                    <p className="text-slate-500 mt-1 font-medium flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                            <Video size={14} className="text-primary-400" />
                            Google Meet Integration
                        </span>
                        {liveCount > 0 && (
                            <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {liveCount} live now
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Quick Join */}
                    <a href="https://meet.google.com/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-3 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-white text-sm font-bold rounded-2xl transition-colors">
                        <ExternalLink size={16} /> Instant Meet
                    </a>
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-2xl transition-colors shadow-lg shadow-primary-500/20">
                        <Plus size={18} /> Schedule
                    </button>
                </div>
            </header>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4 mb-6 shrink-0">
                <div className="bg-dark-800/50 border border-dark-700/50 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-400">
                        <Video size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</p>
                        <p className="text-xl font-black text-white">{meetings.length}</p>
                    </div>
                </div>
                <div className="bg-dark-800/50 border border-dark-700/50 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Upcoming</p>
                        <p className="text-xl font-black text-white">{upcomingCount}</p>
                    </div>
                </div>
                <div className="bg-dark-800/50 border border-dark-700/50 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                        <div className={`w-3 h-3 rounded-full ${liveCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Now</p>
                        <p className="text-xl font-black text-white">{liveCount}</p>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex items-center justify-between gap-4 mb-6 shrink-0">
                <div className="flex bg-dark-800/80 p-1 rounded-xl border border-dark-700 gap-1">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'upcoming', label: 'Upcoming' },
                        { id: 'past', label: 'Past' },
                    ].map(f => (
                        <button key={f.id} onClick={() => setFilter(f.id)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                filter === f.id
                                    ? 'bg-primary-600 text-white shadow-lg'
                                    : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="bg-dark-800/80 border border-dark-700 focus-within:border-primary-500 rounded-xl px-4 py-2 flex items-center gap-2 w-64 transition-colors">
                    <Search className="text-slate-500" size={14} />
                    <input
                        type="text"
                        placeholder="Search meetings..."
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                        className="bg-transparent border-none text-white text-xs outline-none w-full placeholder:text-slate-600 font-bold"
                    />
                </div>
            </div>

            {/* Meetings Grid */}
            <div className="flex-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="animate-spin text-primary-500" size={32} />
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Loading meetings...</p>
                    </div>
                ) : filteredMeetings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-20 h-20 bg-dark-800 rounded-full flex items-center justify-center border border-dark-700">
                            <Video size={36} className="text-slate-600" />
                        </div>
                        <h3 className="text-lg font-black text-white">No Meetings Found</h3>
                        <p className="text-slate-500 text-sm max-w-sm text-center">
                            {filter !== 'all' ? 'No meetings match this filter.' : 'Schedule your first meeting to get started with Google Meet.'}
                        </p>
                        <button onClick={() => setShowCreate(true)}
                            className="mt-2 flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl transition-colors">
                            <Plus size={16} /> Schedule Meeting
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredMeetings.map(meeting => (
                            <MeetingCard
                                key={meeting.id}
                                meeting={meeting}
                                onDelete={handleDeleteMeeting}
                                isAdmin={isAdmin}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <CreateMeetingModal
                    onClose={() => setShowCreate(false)}
                    onCreateMeeting={handleCreateMeeting}
                    members={members}
                />
            )}
        </div>
    );
}
