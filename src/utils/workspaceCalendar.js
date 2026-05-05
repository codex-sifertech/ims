import { httpsCallable } from 'firebase/functions';
import { collection, getDocs } from 'firebase/firestore';
import { db, functions } from '../firebase';

// ---------------------------------------------------------------------------
// createWorkspaceCalendar
// Fetches current company members then delegates to the cloud function which
// creates the Google Calendar via the service account bot.
// Signature kept identical to the old implementation so callers don't change.
// ---------------------------------------------------------------------------
export async function createWorkspaceCalendar(userId, workspaceName, companyId) {
    try {
        // Fetch member emails from Firestore so the function can share the calendar
        let memberEmails = [];
        try {
            const membersSnap = await getDocs(
                collection(db, 'companies', companyId, 'members')
            );
            memberEmails = membersSnap.docs
                .map(d => d.data().email)
                .filter(Boolean);
        } catch (err) {
            console.warn('Could not fetch members for calendar sharing:', err);
        }

        const fn = httpsCallable(functions, 'createWorkspaceCalendar');
        const result = await fn({ workspaceName, companyId, memberEmails });
        return result.data?.calendarId || null;
    } catch (err) {
        console.error('Failed to create workspace calendar:', err);
        return null;
    }
}

// ---------------------------------------------------------------------------
// addEventToWorkspaceCalendar
// Delegates event creation to the cloud function.
// Signature kept identical to the old implementation.
// ---------------------------------------------------------------------------
export async function addEventToWorkspaceCalendar(userId, companyId, eventData) {
    try {
        const fn = httpsCallable(functions, 'syncEventToCalendar');
        const result = await fn({ companyId, event: eventData });
        return result.data || null;
    } catch (err) {
        console.error('Failed to add event to workspace calendar:', err);
        return null;
    }
}

// ---------------------------------------------------------------------------
// shareCalendarWithMember
// Delegates ACL sharing to the cloud function.
// Signature kept identical to the old implementation.
// ---------------------------------------------------------------------------
export async function shareCalendarWithMember(userId, companyId, memberEmail) {
    try {
        const fn = httpsCallable(functions, 'addMemberToCalendar');
        await fn({ companyId, memberEmail });
    } catch (err) {
        console.error('Failed to share calendar with member:', err);
    }
}
