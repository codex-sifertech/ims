const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { google } = require('googleapis');

admin.initializeApp();

const CALENDAR_SA_KEY = defineSecret('CALENDAR_SA_KEY');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCalendarClient(saKeyBase64) {
    const credentials = JSON.parse(Buffer.from(saKeyBase64, 'base64').toString('utf8'));
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    return google.calendar({ version: 'v3', auth });
}

function requireAuth(request) {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be signed in to call this function.');
    }
}

// ---------------------------------------------------------------------------
// createWorkspaceCalendar
// Creates a Google Calendar via service account, makes it publicly readable,
// shares it with all current company members, and stores the calendarId on the
// company Firestore document.
//
// Params: { workspaceName: string, companyId: string, memberEmails?: string[] }
// ---------------------------------------------------------------------------
exports.createWorkspaceCalendar = onCall(
    { secrets: [CALENDAR_SA_KEY] },
    async (request) => {
        requireAuth(request);

        const { workspaceName, companyId, memberEmails: providedEmails } = request.data;

        if (!workspaceName || !companyId) {
            throw new HttpsError('invalid-argument', 'workspaceName and companyId are required.');
        }

        const saKeyBase64 = CALENDAR_SA_KEY.value();
        const calendar = getCalendarClient(saKeyBase64);

        // Fetch member emails from Firestore if not provided
        let memberEmails = providedEmails || [];
        if (!memberEmails.length) {
            try {
                const membersSnap = await admin
                    .firestore()
                    .collection('companies')
                    .doc(companyId)
                    .collection('members')
                    .get();
                memberEmails = membersSnap.docs
                    .map(d => d.data().email)
                    .filter(Boolean);
            } catch (err) {
                console.error('Failed to fetch members:', err);
            }
        }

        // Create the calendar
        let newCalendar;
        try {
            const res = await calendar.calendars.insert({
                requestBody: {
                    summary: `${workspaceName} — IMS`,
                    description: `Shared calendar for ${workspaceName} workspace. Auto-managed by IMS.`,
                    timeZone: 'UTC',
                },
            });
            newCalendar = res.data;
        } catch (err) {
            console.error('Failed to create calendar:', err);
            throw new HttpsError('internal', 'Failed to create Google Calendar.');
        }

        const calendarId = newCalendar.id;

        // Make the calendar publicly readable so the embed works for all members
        try {
            await calendar.acl.insert({
                calendarId,
                requestBody: {
                    role: 'reader',
                    scope: { type: 'default' },
                },
            });
        } catch (err) {
            console.error('Failed to make calendar public:', err);
        }

        // Share the calendar with each member as writer
        for (const email of memberEmails) {
            try {
                await calendar.acl.insert({
                    calendarId,
                    requestBody: {
                        role: 'writer',
                        scope: { type: 'user', value: email },
                    },
                });
            } catch (err) {
                console.error(`Failed to share calendar with ${email}:`, err);
            }
        }

        // Persist calendarId on the company document
        try {
            await admin
                .firestore()
                .collection('companies')
                .doc(companyId)
                .set(
                    {
                        calendarId,
                        calendarName: newCalendar.summary,
                    },
                    { merge: true }
                );
        } catch (err) {
            console.error('Failed to save calendarId to Firestore:', err);
            throw new HttpsError('internal', 'Calendar created but failed to save ID.');
        }

        return { calendarId, calendarName: newCalendar.summary };
    }
);

// ---------------------------------------------------------------------------
// addMemberToCalendar
// Shares the existing workspace calendar with a new member email.
//
// Params: { companyId: string, memberEmail: string }
// ---------------------------------------------------------------------------
exports.addMemberToCalendar = onCall(
    { secrets: [CALENDAR_SA_KEY] },
    async (request) => {
        requireAuth(request);

        const { companyId, memberEmail } = request.data;

        if (!companyId || !memberEmail) {
            throw new HttpsError('invalid-argument', 'companyId and memberEmail are required.');
        }

        const companySnap = await admin.firestore().collection('companies').doc(companyId).get();
        const calendarId = companySnap.data()?.calendarId;
        if (!calendarId) {
            throw new HttpsError('not-found', 'No workspace calendar found for this company.');
        }

        const calendar = getCalendarClient(CALENDAR_SA_KEY.value());

        try {
            await calendar.acl.insert({
                calendarId,
                requestBody: {
                    role: 'writer',
                    scope: { type: 'user', value: memberEmail },
                },
            });
        } catch (err) {
            console.error(`Failed to share calendar with ${memberEmail}:`, err);
            throw new HttpsError('internal', 'Failed to share calendar with member.');
        }

        return { success: true };
    }
);

// ---------------------------------------------------------------------------
// syncEventToCalendar
// Creates a Google Calendar event on the workspace calendar with attendees.
// Sends email invites via sendUpdates: 'all'.
//
// Params: {
//   companyId: string,
//   event: {
//     id?: string, title: string, description?: string,
//     startTime: string (ISO), endTime: string (ISO),
//     attendees?: { email: string }[], meetLink?: string, sourceType?: string
//   }
// }
// ---------------------------------------------------------------------------
exports.syncEventToCalendar = onCall(
    { secrets: [CALENDAR_SA_KEY] },
    async (request) => {
        requireAuth(request);

        const { companyId, event: eventData } = request.data;

        if (!companyId || !eventData?.title || !eventData?.startTime || !eventData?.endTime) {
            throw new HttpsError(
                'invalid-argument',
                'companyId and event (title, startTime, endTime) are required.'
            );
        }

        const companySnap = await admin.firestore().collection('companies').doc(companyId).get();
        const calendarId = companySnap.data()?.calendarId;
        if (!calendarId) {
            throw new HttpsError('not-found', 'No workspace calendar found for this company.');
        }

        const calendar = getCalendarClient(CALENDAR_SA_KEY.value());

        const eventBody = {
            summary: eventData.title,
            description: eventData.description || '',
            start: { dateTime: eventData.startTime, timeZone: 'UTC' },
            end: { dateTime: eventData.endTime, timeZone: 'UTC' },
            attendees: (eventData.attendees || []).map(a => ({ email: a.email })),
            extendedProperties: {
                private: {
                    imsSource: eventData.sourceType || 'meeting',
                    imsId: eventData.id || '',
                },
            },
        };

        if (eventData.meetLink) {
            eventBody.conferenceData = {
                entryPoints: [{ entryPointType: 'video', uri: eventData.meetLink }],
            };
        }

        try {
            const res = await calendar.events.insert({
                calendarId,
                sendUpdates: 'all',
                requestBody: eventBody,
            });
            return { eventId: res.data.id, htmlLink: res.data.htmlLink };
        } catch (err) {
            console.error('Failed to create calendar event:', err);
            throw new HttpsError('internal', 'Failed to create calendar event.');
        }
    }
);

// ---------------------------------------------------------------------------
// onMeetingCreated — Firestore trigger
// Auto-syncs a new meeting document to the workspace calendar.
// ---------------------------------------------------------------------------
exports.onMeetingCreated = onDocumentCreated(
    {
        document: 'companies/{companyId}/meetings/{meetingId}',
        secrets: [CALENDAR_SA_KEY],
    },
    async (event) => {
        const { companyId } = event.params;
        const meeting = event.data?.data();
        if (!meeting) return;

        try {
            const companySnap = await admin
                .firestore()
                .collection('companies')
                .doc(companyId)
                .get();
            const calendarId = companySnap.data()?.calendarId;
            if (!calendarId) return;

            const attendees = (meeting.participants || [])
                .filter(p => p?.email)
                .map(p => ({ email: p.email }));

            const calendar = getCalendarClient(CALENDAR_SA_KEY.value());

            const eventBody = {
                summary: meeting.title || 'Meeting',
                description: meeting.description || meeting.agenda || '',
                // Meetings page stores times as scheduledAt / endsAt
                start: { dateTime: meeting.scheduledAt || meeting.startTime, timeZone: 'UTC' },
                end:   { dateTime: meeting.endsAt     || meeting.endTime,   timeZone: 'UTC' },
                attendees,
                extendedProperties: {
                    private: {
                        imsSource: 'meeting',
                        imsId: event.params.meetingId,
                    },
                },
            };

            if (meeting.meetLink) {
                eventBody.conferenceData = {
                    entryPoints: [{ entryPointType: 'video', uri: meeting.meetLink }],
                };
            }

            await calendar.events.insert({
                calendarId,
                sendUpdates: 'all',
                requestBody: eventBody,
            });
        } catch (err) {
            // Log only — never throw in Firestore triggers (would cause infinite retries)
            console.error('onMeetingCreated: failed to sync meeting to calendar:', err);
        }
    }
);

// ---------------------------------------------------------------------------
// onMemberAdded — Firestore trigger
// Auto-shares the workspace calendar with a new member when they are added.
// ---------------------------------------------------------------------------
exports.onMemberAdded = onDocumentCreated(
    {
        document: 'companies/{companyId}/members/{memberId}',
        secrets: [CALENDAR_SA_KEY],
    },
    async (event) => {
        const { companyId } = event.params;
        const member = event.data?.data();
        if (!member?.email) return;

        try {
            const companySnap = await admin
                .firestore()
                .collection('companies')
                .doc(companyId)
                .get();
            const calendarId = companySnap.data()?.calendarId;
            if (!calendarId) return;

            const calendar = getCalendarClient(CALENDAR_SA_KEY.value());

            await calendar.acl.insert({
                calendarId,
                requestBody: {
                    role: 'writer',
                    scope: { type: 'user', value: member.email },
                },
            });
        } catch (err) {
            // Log only — never throw in Firestore triggers
            console.error('onMemberAdded: failed to share calendar with new member:', err);
        }
    }
);
