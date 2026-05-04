import { useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';
import { addEventToWorkspaceCalendar } from '../utils/workspaceCalendar';

export function useGoogleCalendar() {
    const { user, activeCompany } = useStore();

    const getToken = useCallback(async () => {
        if (!user?.uid) return null;
        try {
            const ref = doc(db, 'users', user.uid, 'integrations', 'google_calendar');
            const snap = await getDoc(ref);
            if (!snap.exists()) return null;
            return snap.data().accessToken || null;
        } catch { return null; }
    }, [user?.uid]);

    /**
     * Creates or updates a Google Calendar event for a task.
     * @param {object} task - Task object with title, dueDate, description, id
     */
    const createOrUpdateEvent = useCallback(async (task) => {
        if (!task?.dueDate) return;
        const accessToken = await getToken();
        if (!accessToken) return;

        const start = new Date(task.dueDate);
        start.setHours(9, 0, 0, 0);
        const end = new Date(task.dueDate);
        end.setHours(10, 0, 0, 0);

        const event = {
            summary: task.title || 'Task Due',
            description: task.description || `Task ID: ${task.id}`,
            start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            end: { dateTime: end.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            extendedProperties: { private: { imsTaskId: task.id || '' } },
        };

        try {
            // Search for existing event with this task ID
            const searchRes = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=imsTaskId=${task.id}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const searchData = await searchRes.json();
            const existing = searchData.items?.[0];

            if (existing) {
                await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existing.id}`,
                    {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify(event),
                    }
                );
            } else {
                await fetch(
                    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                    {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify(event),
                    }
                );
            }
            // Also sync to the workspace calendar
            if (activeCompany?.id) {
                addEventToWorkspaceCalendar(user.uid, activeCompany.id, {
                    id: task.id,
                    title: task.title || 'Task Due',
                    description: task.description || '',
                    startTime: start.toISOString(),
                    endTime: end.toISOString(),
                    sourceType: 'task',
                }).catch(() => {});
            }
        } catch (err) {
            console.error('Google Calendar sync error:', err);
        }
    }, [getToken, user?.uid, activeCompany?.id]);

    return { createOrUpdateEvent };
}
