// types/emailService.ts - Types et interfaces partagés
import type { CustomFolder, Email, EmailAttachment } from "./email";

// Types pour les réponses API
export interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Interface pour les données d'email à envoyer
export interface ComposeEmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: File[];
}

// Interface pour les brouillons
export interface DraftData extends ComposeEmailData {
  id?: string;
}

// Interface pour les données d'email à sauvegarder
export interface EmailData {
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  folder: string;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  sentAt: string;
  user: string | number;
  attachments?: EmailAttachment[];
  hasExternalRecipients?: boolean;
  externalRecipients?: string[];
  internalRecipients?: string[];
  deliveryStatus?: 'pending' | 'delivered' | 'failed' | 'mixed';
}

// Interface pour l'utilisateur stocké en localStorage
export interface StoredUser {
  id: string | number;
  documentId?: string;
  username?: string;
  email?: string;
  [key: string]: any;
}

// Interface pour les utilisateurs retournés par l'API
export interface UserResponse {
  id: string | number;
  documentId?: string;
  username: string;
  email: string;
  [key: string]: any;
}

// Interface pour un item Strapi générique
export interface StrapiItem {
  id: string | number;
  attributes: any;
  documentId?: string;
}

// Types de réponse API pour les utilisateurs
export type UsersApiResponse =
  | UserResponse[]
  | { data: StrapiItem[] }
  | { users: UserResponse[] }
  | StrapiItem[];

// Interface pour les données d'email
export interface EmailData {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  folder: string;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  sentAt: string;
  user: string | number;
  // Nouveaux champs pour la gestion externe
  hasExternalRecipients?: boolean;
  externalRecipients?: string[];
  internalRecipients?: string[];
  deliveryStatus?: "pending" | "delivered" | "failed" | "mixed";
  deliveredAt?: string;
}

// Interface pour les statistiques d'envoi
export interface EmailStats {
  totalSent: number;
  internalSent: number;
  externalSent: number;
  failed: number;
  delivered: number;
  pending: number;
}

// Interface pour la configuration EmailJS
export interface EmailJSConfig {
  isEnabled: boolean;
  hasValidConfig: boolean;
  serviceId: string | null;
  templateId: string | null;
}
