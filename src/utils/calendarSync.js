import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Syncs a task to the user's connected Google Calendar.
 * 
 * @param {string} userId - The UID of the current user
 * @param {Object} task - The task object { id, title, description, dueDate, assignedTo (array of users with email) }
 */
export const syncTaskToGoogleCalendar = async (userId, task) => {
    if (!task.dueDate) return;

    try {
        // Fetch the user's Google Calendar access token
        const integrationRef = doc(db, 'users', userId, 'integrations', 'google_calendar');
        const integrationSnap = await getDoc(integrationRef);
        
        if (!integrationSnap.exists()) return; // Not connected

        const { accessToken, expiresAt } = integrationSnap.data();

        if (!accessToken || (expiresAt && Date.now() > expiresAt)) {
            console.log('Google Calendar token missing or expired.');
            return;
        }

        // Format attendees
        const attendees = [];
        if (Array.isArray(task.assignedTo)) {
            task.assignedTo.forEach(member => {
                if (member.email) {
                    attendees.push({ email: member.email });
                }
            });
        }

        // Create the event payload
        // If dueDate is a string (YYYY-MM-DD), we'll create an all-day event
        const startDate = new Date(task.dueDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1); // All day events need end date to be the next day

        const event = {
            summary: `Task: ${task.title || 'Untitled Task'}`,
            description: task.description || 'View task in IMS.',
            start: {
                date: startDate.toISOString().split('T')[0],
            },
            end: {
                date: endDate.toISOString().split('T')[0],
            },
            attendees: attendees.length > 0 ? attendees : undefined,
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, // 1 day before
                    { method: 'popup', minutes: 60 }       // 1 hour before
                ],
            },
        };

        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'Failed to sync to Google Calendar');
        }

        console.log('Successfully synced task to Google Calendar');

    } catch (error) {
        console.error('Calendar Sync Error:', error);
    }
};
