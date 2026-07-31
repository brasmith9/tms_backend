export const NOTIFICATION_CREATED = 'notification.created';

export interface NotificationCreatedEvent {
  userId: string;
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
