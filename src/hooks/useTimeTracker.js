import { useEffect, useCallback, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc, addDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

export function useTimeTracker() {
    const { user, activeCompany, isCheckedIn, toggleCheckIn } = useStore();
    const sessionStartRef = useRef(null);
    // Exposed so UI can compute elapsed seconds accurately after a page refresh
    const [sessionStart, setSessionStart] = useState(null);

    // Sync check-in status FROM Firestore → store on mount
    useEffect(() => {
        if (!user?.uid) return;
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'attendance');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const remoteStatus = docSnap.data().isCheckedIn ?? false;
                const remoteStart = docSnap.data().sessionStart ?? null;
                toggleCheckIn(remoteStatus);
                if (remoteStatus && remoteStart) {
                    sessionStartRef.current = remoteStart;
                    setSessionStart(remoteStart);
                } else {
                    sessionStartRef.current = null;
                    setSessionStart(null);
                }
            }
        }, (err) => {
            console.error('Time tracker sync error:', err);
        });
        return () => unsubscribe();
    }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCheckInToggle = useCallback(async () => {
        if (!user?.uid || !activeCompany?.id) return;

        const newStatus = !isCheckedIn;
        const statusString = newStatus ? 'active' : 'checked-out';

        // Optimistic local update
        toggleCheckIn(newStatus);

        const settingsRef = doc(db, 'users', user.uid, 'settings', 'attendance');
        const memberRef = doc(db, 'companies', activeCompany.id, 'members', user.uid);
        const attendanceRef = collection(db, 'companies', activeCompany.id, 'attendance');
        const timeLogsRef = collection(db, 'companies', activeCompany.id, 'timeLogs');

        try {
            if (newStatus) {
                // ── CHECK IN ──
                const now = new Date();
                const isoNow = now.toISOString();
                sessionStartRef.current = isoNow;
                setSessionStart(isoNow);

                // Persist session start
                await setDoc(settingsRef, {
                    isCheckedIn: true,
                    sessionStart: isoNow
                }, { merge: true });

                // Update member presence
                await setDoc(memberRef, {
                    status: 'active',
                    isCheckedIn: true,
                    lastSeen: serverTimestamp()
                }, { merge: true });

                // Log attendance event
                await addDoc(attendanceRef, {
                    userId: user.uid,
                    userName: user.name || user.email,
                    type: 'check-in',
                    timestamp: serverTimestamp(),
                    isoDate: isoNow
                });

                // Write open time log (endTime = null means session still open)
                await addDoc(timeLogsRef, {
                    userId: user.uid,
                    userName: user.name || user.email,
                    startTime: isoNow,
                    endTime: null,
                    durationMinutes: null,
                    date: now.toISOString().split('T')[0], // YYYY-MM-DD
                    companyId: activeCompany.id,
                });

            } else {
                // ── CHECK OUT ──
                const now = new Date();
                const isoNow = now.toISOString();

                // Find the open time log for this user (endTime == null)
                const openLogQuery = query(
                    timeLogsRef,
                    where('userId', '==', user.uid),
                    where('endTime', '==', null),
                    limit(1)
                );
                const openLogSnap = await getDocs(openLogQuery);

                if (!openLogSnap.empty) {
                    const logDoc = openLogSnap.docs[0];
                    const startTime = sessionStartRef.current || logDoc.data().startTime;
                    const durationMinutes = startTime
                        ? Math.round((now - new Date(startTime)) / 60000)
                        : 0;

                    await updateDoc(logDoc.ref, {
                        endTime: isoNow,
                        durationMinutes,
                    });
                }

                sessionStartRef.current = null;
                setSessionStart(null);

                // Persist checkout
                await setDoc(settingsRef, {
                    isCheckedIn: false,
                    sessionStart: null
                }, { merge: true });

                // Update member presence
                await setDoc(memberRef, {
                    status: 'checked-out',
                    isCheckedIn: false,
                    lastSeen: serverTimestamp()
                }, { merge: true });

                // Log attendance event
                await addDoc(attendanceRef, {
                    userId: user.uid,
                    userName: user.name || user.email,
                    type: 'check-out',
                    timestamp: serverTimestamp(),
                    isoDate: isoNow
                });
            }
        } catch (error) {
            console.error('Error toggling check-in:', error);
            toggleCheckIn(!newStatus);
        }
    }, [user, activeCompany, isCheckedIn, toggleCheckIn]);

    return { isCheckedIn, sessionStart, toggleCheckIn: handleCheckInToggle };
}
