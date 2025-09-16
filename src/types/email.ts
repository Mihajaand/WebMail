// types/email.ts
export interface Email {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: Attachment[];
  folder: FolderType;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  threadId?: string;
  sentAt: string;
  user: string; // ID de l'utilisateur
}
export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export type FolderType =
  | "inbox"
  | "sent"
  | "draft"
  | "trash"
  | "spam"
  | "custom";

export interface CustomFolder {
  id: string;
  name: string;
  color: string;
  user: string;
  emailCount: number;
}
