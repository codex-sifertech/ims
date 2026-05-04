import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Send a notification to a specific user.
 * @param {string} toUserId - The UID of the user to receive the notification
 * @param {Object} actor - The user object of the person who triggered this { uid, name }
 * @param {string} type - 'mention' | 'assignment' | 'completed' | 'deadline'
 * @param {string} message - The notification text
 * @param {string} [taskId] - Optional ID of the task associated with the notification
 */
export const sendNotification = async (toUserId, actor, type, message, taskId = null) => {
    if (!toUserId || !actor?.uid || toUserId === actor.uid) return; // Don't notify self

    try {
        await addDoc(collection(db, 'users', toUserId, 'notifications'), {
            type,
            message,
            actorId: actor.uid,
            actorName: actor.name || actor.email || 'Someone',
            taskId,
            read: false,
            createdAt: serverTimestamp()
        });
    } catch (err) {
        console.error('Failed to send notification:', err);
    }
};
