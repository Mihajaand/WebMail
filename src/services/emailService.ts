// services/emailService.ts
import type { ApiResponse, ComposeEmailData } from "../types/api";
import type { CustomFolder, Email } from "../types/email";

const API_BASE = import.meta.env.VITE_STRAPI_URL || "http://localhost:1337/api";

class EmailService {
  private async fetchApi<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const token = localStorage.getItem("jwt");
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  // Récupérer les emails par dossier
  // Récupérer les emails par dossier
  async getEmails(
    folder: string = "inbox",
    page: number = 1,
  ): Promise<ApiResponse<Email[]>> {
    // ✅ CORRECTION : Ajouter le filtre par utilisateur
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    return this.fetchApi<ApiResponse<Email[]>>(
      `/emails?filters[folder][$eq]=${folder}&filters[user][id][$eq]=${user.id}&sort=sentAt:desc&pagination[page]=${page}&pagination[pageSize]=20&populate=*`,
    );
  }

  // Récupérer un email spécifique
  async getEmail(id: string): Promise<ApiResponse<Email>> {
    return this.fetchApi<ApiResponse<Email>>(`/emails/${id}?populate=*`);
  }

  // Envoyer un email
  async sendEmail(emailData: ComposeEmailData): Promise<ApiResponse<Email>> {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const payload = {
      data: {
        from: user.email || `${user.username}@eni.mg`,
        to: emailData.to,
        cc: emailData.cc || [],
        bcc: emailData.bcc || [],
        subject: emailData.subject,
        body: emailData.body,
        folder: "sent",
        isRead: true,
        isStarred: false,
        isImportant: false,
        sentAt: new Date().toISOString(),
        user: user.id,
      },
    };

    const sentEmail = await this.fetchApi<ApiResponse<Email>>("/emails", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Créer des copies pour les destinataires
    for (const recipient of emailData.to) {
      const recipientUser = await this.getUserByEmail(recipient);
      if (recipientUser) {
        await this.fetchApi<ApiResponse<Email>>("/emails", {
          method: "POST",
          body: JSON.stringify({
            data: {
              ...payload.data,
              folder: "inbox",
              isRead: false,
              user: recipientUser.id,
            },
          }),
        });
      }
    }

    return sentEmail;
  }

  // Marquer comme lu
  async markAsRead(id: string, isRead: boolean): Promise<void> {
    await this.fetchApi(`/emails/${id}`, {
      method: "PUT",
      body: JSON.stringify({ data: { isRead } }),
    });
  }

  // Ajouter/retirer une étoile
  async toggleStar(id: string, isStarred: boolean): Promise<void> {
    await this.fetchApi(`/emails/${id}`, {
      method: "PUT",
      body: JSON.stringify({ data: { isStarred } }),
    });
  }

  // Déplacer un email
  async moveToFolder(id: string, folder: string): Promise<void> {
    await this.fetchApi(`/emails/${id}`, {
      method: "PUT",
      body: JSON.stringify({ data: { folder } }),
    });
  }

  // Supprimer
  async deleteEmail(id: string): Promise<void> {
    await this.fetchApi(`/emails/${id}`, { method: "DELETE" });
  }

  // Recherche
  async searchEmails(query: string): Promise<ApiResponse<Email[]>> {
    return this.fetchApi<ApiResponse<Email[]>>(
      `/emails?filters[$or][0][subject][$containsi]=${query}&filters[$or][1][body][$containsi]=${query}&filters[$or][2][from][$containsi]=${query}&populate=*`,
    );
  }

  // Dossiers custom
  async getCustomFolders(): Promise<ApiResponse<CustomFolder[]>> {
    return this.fetchApi<ApiResponse<CustomFolder[]>>("/folders?populate=*");
  }

  async createFolder(
    name: string,
    color: string,
  ): Promise<ApiResponse<CustomFolder>> {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return this.fetchApi<ApiResponse<CustomFolder>>("/folders", {
      method: "POST",
      body: JSON.stringify({
        data: { name, color, user: user.id },
      }),
    });
  }

  // Récupérer un utilisateur Strapi par email
  private async getUserByEmail(email: string): Promise<any> {
    try {
      const response = await this.fetchApi<ApiResponse<any>>(
        `/users?filters[email][$eq]=${email}`,
      );

      if (!response.data || response.data.length === 0) {
        return null;
      }

      const user = response.data[0];
      return { id: user.id, ...user.attributes }; // on reconstruit un User complet
    } catch {
      return null;
    }
  }
  // Compter les non lus
  async getUnreadCount(folder: string = "inbox"): Promise<number> {
    const response = await this.fetchApi<ApiResponse<any>>(
      `/emails?filters[folder][$eq]=${folder}&filters[isRead][$eq]=false&pagination[pageSize]=1`,
    );
    return response.meta?.pagination?.total || 0;
  }
}

export const emailService = new EmailService();
