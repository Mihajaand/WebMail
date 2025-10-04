// types/email.ts - Types améliorés
export interface Email {
  id: string;
  from: string;
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  folder: string;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  sentAt: string;

  // Nouveaux champs pour la gestion externe
  hasExternalRecipients?: boolean;
  externalRecipients?: string[];
  internalRecipients?: string[];
  deliveryStatus?: "pending" | "delivered" | "failed" | "mixed";
  attachments?: EmailAttachment[];
  deliveredAt?: string;

  // Métadonnées
  attachments?: EmailAttachment[];
  messageId?: string;
  replyTo?: string;

  // Relations
  user?: string | number;
}

export interface EmailAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface CustomFolder {
  id: string;
  name: string;
  color: string;
  user: string | number;
  emailCount?: number;
}

// Configuration EmailJS
export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  isEnabled: boolean;
}

// Statistiques d'envoi
export interface EmailStats {
  totalSent: number;
  internalSent: number;
  externalSent: number;
  failed: number;
  delivered: number;
  pending: number;
}

// Interface pour les paramètres du template EmailJS
export interface EmailJSTemplateParams {
  from_email: string;
  from_name: string;
  real_sender: string;
  original_subject: string;
  to_email: string;
  subject: string;
  message: string;
  cc_list: string;
  bcc_list: string;
}
