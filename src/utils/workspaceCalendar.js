import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

async function getAccessToken(userId) {
    const ref = doc(db, 'users', userId, 'integrations', 'google_calendar');
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const { accessToken, expiresAt } = snap.data();
    if (!accessToken || (expiresAt && Date.now() > expiresAt)) return null;
    return accessToken;
}

export async function createWorkspaceCalendar(userId, workspaceName, companyId) {
    const token = await getAccessToken(userId);
    if (!token) return null;

    try {
        const res = await fetch(`${CALENDAR_API}/calendars`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                summary: `${workspaceName} — IMS`,
                description: `Shared calendar for ${workspaceName} workspace. Auto-managed by IMS.`,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }),
        });

        if (!res.ok) return null;
        const calendar = await res.json();

        // Make the calendar publicly readable so the embed works for all members
        await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendar.id)}/acl`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                role: 'reader',
                scope: { type: 'default' },
            }),
        }).catch(() => {});

        // Persist the calendar ID on the company document
        await setDoc(doc(db, 'companies', companyId), {
            calendarId: calendar.id,
            calendarName: calendar.summary,
        }, { merge: true });

        return calendar.id;
    } catch (err) {
        console.error('Failed to create workspace calendar:', err);
        return null;
    }
}

export async function addEventToWorkspaceCalendar(userId, companyId, eventData) {
    const token = await getAccessToken(userId);
    if (!token) return null;

    const companySnap = await getDoc(doc(db, 'companies', companyId));
    const calendarId = companySnap.data()?.calendarId;
    if (!calendarId) return null;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const event = {
        summary: eventData.title,
        description: eventData.description || '',
        start: {
            dateTime: eventData.startTime,
            timeZone: tz,
        },
        end: {
            dateTime: eventData.endTime,
            timeZone: tz,
        },
        attendees: eventData.attendees?.map(a => ({ email: a.email })) || [],
        extendedProperties: {
            private: { imsSource: eventData.sourceType || 'meeting', imsId: eventData.id || '' },
        },
    };

    if (eventData.meetLink) {
        event.conferenceData = {
            entryPoints: [{ entryPointType: 'video', uri: eventData.meetLink }],
        };
    }

    try {
        const res = await fetch(
            `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
            }
        );
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        console.error('Failed to add event to workspace calendar:', err);
        return null;
    }
}

export async function shareCalendarWithMember(userId, companyId, memberEmail) {
    const token = await getAccessToken(userId);
    if (!token) return;

    const companySnap = await getDoc(doc(db, 'companies', companyId));
    const calendarId = companySnap.data()?.calendarId;
    if (!calendarId) return;

    try {
        await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/acl`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                role: 'writer',
                scope: { type: 'user', value: memberEmail },
            }),
        });
    } catch (err) {
        console.error('Failed to share calendar:', err);
    }
}
