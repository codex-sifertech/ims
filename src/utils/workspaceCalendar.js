import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// ---------------------------------------------------------------------------
// getAccessToken
// Reads the master admin's OAuth token from system/calendar_token.
// Falls back to the current user's own stored token.
// ---------------------------------------------------------------------------
async function getAccessToken(userId) {
    // Primary: system-wide token stored by the Master Admin
    try {
        const systemSnap = await getDoc(doc(db, 'system', 'calendar_token'));
        const data = systemSnap.data();
        if (data?.accessToken && (!data.expiresAt || Date.now() < data.expiresAt)) {
            return data.accessToken;
        }
    } catch { /* ignore — rules may block non-auth reads */ }

    // Fallback: current user's own token
    if (!userId) return null;
    try {
        const ref = doc(db, 'users', userId, 'integrations', 'google_calendar');
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        const { accessToken, expiresAt } = snap.data();
        if (!accessToken || (expiresAt && Date.now() > expiresAt)) return null;
        return accessToken;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// createWorkspaceCalendar
// Creates a Google Calendar using the master admin's stored OAuth token,
// makes it publicly readable so the embed works for all members, then
// persists the calendarId on the company Firestore document.
//
// Signature kept identical so callers don't change.
// ---------------------------------------------------------------------------
export async function createWorkspaceCalendar(userId, workspaceName, companyId) {
    try {
        const accessToken = await getAccessToken(userId);
        if (!accessToken) {
            console.warn('createWorkspaceCalendar: no valid access token available.');
            return null;
        }

        // Create the calendar
        const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                summary: `${workspaceName} — IMS`,
                description: `Shared calendar for ${workspaceName} workspace. Auto-managed by IMS.`,
                timeZone: 'UTC',
            }),
        });

        if (!createRes.ok) {
            const err = await createRes.json().catch(() => ({}));
            console.error('Google Calendar create failed:', err);
            return null;
        }

        const calendarData = await createRes.json();
        const calendarId = calendarData.id;

        // Make publicly readable so the embed iframe works without auth
        try {
            await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/acl`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: 'reader', scope: { type: 'default' } }),
            });
        } catch (aclErr) {
            console.warn('Could not make calendar public:', aclErr);
        }

        // Share with all current members as writers
        try {
            const membersSnap = await getDocs(collection(db, 'companies', companyId, 'members'));
            const emails = membersSnap.docs.map(d => d.data().email).filter(Boolean);
            for (const email of emails) {
                await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/acl`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            role: 'writer',
                            scope: { type: 'user', value: email },
                        }),
                    }
                ).catch(() => {});
            }
        } catch (membErr) {
            console.warn('Could not share calendar with members:', membErr);
        }

        // Persist calendarId on the company document
        await setDoc(
            doc(db, 'companies', companyId),
            { calendarId, calendarName: calendarData.summary },
            { merge: true }
        );

        return calendarId;
    } catch (err) {
        console.error('createWorkspaceCalendar failed:', err);
        return null;
    }
}

// ---------------------------------------------------------------------------
// addEventToWorkspaceCalendar
// Inserts an event into the workspace calendar using the master admin token.
// ---------------------------------------------------------------------------
export async function addEventToWorkspaceCalendar(userId, companyId, eventData) {
    try {
        const accessToken = await getAccessToken(userId);
        if (!accessToken) {
            console.warn('addEventToWorkspaceCalendar: no valid access token available.');
            return null;
        }

        const companySnap = await getDoc(doc(db, 'companies', companyId));
        const calendarId = companySnap.data()?.calendarId;
        if (!calendarId) {
            console.warn('addEventToWorkspaceCalendar: no calendarId on company doc.');
            return null;
        }

        const body = {
            summary: eventData.title,
            description: eventData.description || '',
            start: { dateTime: eventData.startTime, timeZone: 'UTC' },
            end: { dateTime: eventData.endTime, timeZone: 'UTC' },
            attendees: (eventData.attendees || []).map(a => ({ email: a.email })),
        };

        if (eventData.meetLink) {
            body.conferenceData = {
                entryPoints: [{ entryPointType: 'video', uri: eventData.meetLink }],
            };
        }

        const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('Failed to add calendar event:', err);
            return null;
        }

        return await res.json();
    } catch (err) {
        console.error('addEventToWorkspaceCalendar failed:', err);
        return null;
    }
}

// ---------------------------------------------------------------------------
// shareCalendarWithMember
// Adds a writer ACL entry for a new member on the workspace calendar.
// ---------------------------------------------------------------------------
export async function shareCalendarWithMember(userId, companyId, memberEmail) {
    try {
        const accessToken = await getAccessToken(userId);
        if (!accessToken) return;

        const companySnap = await getDoc(doc(db, 'companies', companyId));
        const calendarId = companySnap.data()?.calendarId;
        if (!calendarId) return;

        await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/acl`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    role: 'writer',
                    scope: { type: 'user', value: memberEmail },
                }),
            }
        );
    } catch (err) {
        console.error('shareCalendarWithMember failed:', err);
    }
}
