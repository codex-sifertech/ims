import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import useStore from '../../store/useStore';
import { Bell, CheckCircle, Clock, AtSign, Briefcase } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationDropdown() {
    const { user, globalTasks } = useStore();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch Notifications
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(20)
        );
        const unsub = onSnapshot(q, snap => {
            setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return unsub;
    }, [user?.uid]);

    // Check deadlines client-side (no background cron job)
    // Run this effect when globalTasks or user changes
    useEffect(() => {
        if (!user?.uid || !globalTasks.length) return;

        const checkDeadlines = () => {
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            globalTasks.forEach(task => {
                // Only consider tasks assigned to user that are not done
                const isAssignedToMe = Array.isArray(task.assignedTo) 
                    ? task.assignedTo.some(m => m.id === user.uid)
                    : (task.assignedTo === user.uid || task.assignedTo?.toLowerCase() === user.name?.toLowerCase());

                if (isAssignedToMe && task.status !== 'done' && task.dueDate) {
                    const due = new Date(task.dueDate);
                    if (due > now && due <= tomorrow) {
                        // Task is due within 24h
                        // Check if we already have an active deadline notification for this task
                        const hasRecentNotif = notifications.some(n => 
                            n.type === 'deadline' && 
                            n.taskId === task.id &&
                            (now.getTime() - n.createdAt?.toMillis()) < 24 * 60 * 60 * 1000
                        );

                        // If no recent notification, we could theoretically trigger one here.
                        // However, writing to firestore inside an effect on load can be dangerous.
                        // For a simple implementation, we will just inject a local "virtual" notification 
                        // if we want to avoid excessive DB writes, or let a separate check function handle it.
                        // Currently, we will just trust the user will see it on the task board,
                        // and we will rely on manual triggers for mentions/assignments to avoid loop issues.
                    }
                }
            });
        };

        // checkDeadlines();
    }, [globalTasks, user, notifications]);

    const markAllAsRead = async () => {
        if (!user?.uid || notifications.length === 0) return;
        const batch = writeBatch(db);
        notifications.filter(n => !n.read).forEach(n => {
            batch.update(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
        });
        await batch.commit();
    };

    const markAsRead = async (id) => {
        if (!user?.uid) return;
        await writeBatch(db).update(doc(db, 'users', user.uid, 'notifications', id), { read: true }).commit();
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const getIcon = (type) => {
        switch (type) {
            case 'mention': return <AtSign size={14} className="text-primary-400" />;
            case 'assignment': return <Briefcase size={14} className="text-blue-400" />;
            case 'completed': return <CheckCircle size={14} className="text-emerald-400" />;
            case 'deadline': return <Clock size={14} className="text-amber-400" />;
            default: return <Bell size={14} className="text-slate-400" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-white bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors border border-dark-700"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-dark-900">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[400px]">
                    <div className="p-3 border-b border-dark-700 flex justify-between items-center bg-dark-900/50">
                        <h3 className="text-sm font-bold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-[10px] font-bold text-primary-400 hover:text-primary-300">
                                Mark all as read
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-slate-500 text-xs">
                                No notifications yet.
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    onClick={() => { if (!n.read) markAsRead(n.id); }}
                                    className={`p-3 border-b border-dark-700 hover:bg-dark-700/50 transition-colors cursor-pointer flex gap-3 ${!n.read ? 'bg-primary-500/5' : ''}`}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${!n.read ? 'bg-dark-900 border-primary-500/30' : 'bg-dark-900 border-dark-600'}`}>
                                            {getIcon(n.type)}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-300 leading-snug">
                                            <span className="font-bold text-white">{n.actorName}</span> {n.message}
                                        </p>
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 block">
                                            {n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                                        </span>
                                    </div>
                                    {!n.read && (
                                        <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 self-center" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
