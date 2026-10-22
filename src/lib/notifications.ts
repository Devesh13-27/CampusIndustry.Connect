export type NotificationType = "opening" | "camp" | "reminder";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  date: string;
}
