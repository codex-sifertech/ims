import { useEffect, useCallback, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

export function useTimeTracker() {
    const { user, activeCompany, isCheckedIn, toggleCheckIn } = useStore();
    const sessionStartRef = useRef(null);
    const openLogIdRef = useRef(null); // stores the Firestore doc ID of the open timelog
    const [sessionStart, setSessionStart] = useState(null);

    // Sync check-in status FROM Firestore → local state on mount / user change
    useEffect(() => {
        if (!user?.uid) return;
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'attendance');
        const unsubscribe = onSnapshot(settingsRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            const remoteCheckedIn = data.isCheckedIn ?? false;
            const remoteStart     = data.sessionStart ?? null;
            const remoteLogId     = data.openLogId    ?? null;

            toggleCheckIn(remoteCheckedIn);

            if (remoteCheckedIn && remoteStart) {
                sessionStartRef.current = remoteStart;
                openLogIdRef.current    = remoteLogId;
                setSessionStart(remoteStart);
            } else {
                sessionStartRef.current = null;
                openLogIdRef.current    = null;
                setSessionStart(null);
            }
        }, (err) => console.error('Time tracker sync error:', err));

        return () => unsubscribe();
    }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCheckInToggle = useCallback(async () => {
        if (!user?.uid || !activeCompany?.id) return;

        const newStatus = !isCheckedIn;

        // ── CHECK IN ──────────────────────────────────────────────────────────
        if (newStatus) {
            const now    = new Date();
            const isoNow = now.toISOString();
            const dateStr = isoNow.split('T')[0];

            // Optimistic UI
            sessionStartRef.current = isoNow;
            setSessionStart(isoNow);
            toggleCheckIn(true);

            const settingsRef  = doc(db, 'users', user.uid, 'settings', 'attendance');
            const memberRef    = doc(db, 'companies', activeCompany.id, 'members', user.uid);
            const timeLogsRef  = collection(db, 'companies', activeCompany.id, 'timeLogs');
            const attendanceRef = collection(db, 'companies', activeCompany.id, 'attendance');

            try {
                // Write the open timelog first — we need its ID
                const logRef = await addDoc(timeLogsRef, {
                    userId:          user.uid,
                    userName:        user.name || user.email,
                    startTime:       isoNow,
                    endTime:         null,
                    durationMinutes: null,
                    date:            dateStr,
                    companyId:       activeCompany.id,
                });
                openLogIdRef.current = logRef.id;

                // Persist settings — include the logId so checkout can find it without a query
                await setDoc(settingsRef, {
                    isCheckedIn: true,
                    sessionStart: isoNow,
                    openLogId:   logRef.id,
                }, { merge: true });

                // Member presence (non-blocking failures ok)
                setDoc(memberRef, {
                    status:      'active',
                    isCheckedIn: true,
                    lastSeen:    serverTimestamp(),
                }, { merge: true }).catch(e => console.warn('member presence update failed:', e));

                // Attendance event
                addDoc(attendanceRef, {
                    userId:   user.uid,
                    userName: user.name || user.email,
                    type:     'check-in',
                    timestamp: serverTimestamp(),
                    isoDate:  isoNow,
                }).catch(e => console.warn('attendance log failed:', e));

            } catch (err) {
                console.error('Check-in failed:', err);
                // Revert optimistic state
                sessionStartRef.current = null;
                openLogIdRef.current    = null;
                setSessionStart(null);
                toggleCheckIn(false);
            }

        // ── CHECK OUT ─────────────────────────────────────────────────────────
        } else {
            const now    = new Date();
            const isoNow = now.toISOString();

            // Save old values for revert if needed
            const prevStart = sessionStartRef.current;
            const prevLogId = openLogIdRef.current;

            // Optimistic UI — stop the timer immediately
            toggleCheckIn(false);
            setSessionStart(null);
            sessionStartRef.current = null;
            openLogIdRef.current    = null;

            const settingsRef   = doc(db, 'users', user.uid, 'settings', 'attendance');
            const memberRef     = doc(db, 'companies', activeCompany.id, 'members', user.uid);
            const timeLogsRef   = collection(db, 'companies', activeCompany.id, 'timeLogs');
            const attendanceRef = collection(db, 'companies', activeCompany.id, 'attendance');

            try {
                // ── CRITICAL: persist checkout status ──────────────────────────
                await setDoc(settingsRef, {
                    isCheckedIn:  false,
                    sessionStart: null,
                    openLogId:    null,
                }, { merge: true });

                // ── CRITICAL: update member presence ──────────────────────────
                await setDoc(memberRef, {
                    status:      'checked-out',
                    isCheckedIn: false,
                    lastSeen:    serverTimestamp(),
                }, { merge: true });

                // ── NON-CRITICAL: close the open timelog ──────────────────────
                // Use the stored doc ID — no compound query needed, no missing index
                if (prevLogId) {
                    const durationMinutes = prevStart
                        ? Math.round((now - new Date(prevStart)) / 60000)
                        : 0;
                    updateDoc(doc(timeLogsRef, prevLogId), {
                        endTime:         isoNow,
                        durationMinutes: Math.max(0, durationMinutes),
                    }).catch(e => console.warn('timelog close failed:', e));
                }

                // ── NON-CRITICAL: attendance event ────────────────────────────
                addDoc(attendanceRef, {
                    userId:    user.uid,
                    userName:  user.name || user.email,
                    type:      'check-out',
                    timestamp: serverTimestamp(),
                    isoDate:   isoNow,
                }).catch(e => console.warn('attendance log failed:', e));

            } catch (err) {
                console.error('Check-out failed:', err);
                // Only revert if the critical writes failed
                toggleCheckIn(true);
                setSessionStart(prevStart);
                sessionStartRef.current = prevStart;
                openLogIdRef.current    = prevLogId;
            }
        }
    }, [user, activeCompany, isCheckedIn, toggleCheckIn]);

    return { isCheckedIn, sessionStart, toggleCheckIn: handleCheckInToggle };
}
