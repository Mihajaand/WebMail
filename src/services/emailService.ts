// services/emailService.ts - Version corrigée avec types TypeScript fixes
import type { CustomFolder, Email } from "../types/email";

const API_BASE = import.meta.env.VITE_STRAPI_URL || "http://localhost:1337/api";

// Types pour les réponses API
interface ApiResponse<T> {
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
interface ComposeEmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
}

// Interface pour l'utilisateur stocké en localStorage
interface StoredUser {
  id: string | number;
  documentId?: string;
  username?: string;
  email?: string;
  [key: string]: any;
}

// Interface pour les utilisateurs retournés par l'API
interface UserResponse {
  id: string | number;
  documentId?: string;
  username: string;
  email: string;
  [key: string]: any;
}

// Interface pour un item Strapi générique
interface StrapiItem {
  id: string | number;
  attributes: any;
  documentId?: string;
}

// Types de réponse API pour les utilisateurs
type UsersApiResponse =
  | UserResponse[]
  | { data: StrapiItem[] }
  | { users: UserResponse[] }
  | StrapiItem[];

// Interface pour les données d'email
interface EmailData {
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
}

class EmailService {
  private async fetchApi<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const token = localStorage.getItem("jwt");
    const fullUrl = `${API_BASE}${endpoint}`;

    console.log("🌐 Making API request:", {
      url: fullUrl,
      method: options?.method || "GET",
      hasToken: !!token,
      headers: options?.headers,
    });

    const response = await fetch(fullUrl, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    console.log("📡 API Response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: fullUrl,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error Details:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: fullUrl,
      });
      throw new Error(
        `API Error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const jsonResponse = await response.json();
    console.log("📦 API JSON Response:", jsonResponse);

    return jsonResponse as T;
  }

  private getStoredUser(): StoredUser {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      throw new Error("Utilisateur non trouvé dans localStorage");
    }
    return JSON.parse(userStr) as StoredUser;
  }

  async getEmails(
    folder: string = "inbox",
    page: number = 1,
  ): Promise<ApiResponse<Email[]>> {
    const user = this.getStoredUser();

    console.log("🔍 DEBUG - Getting emails:", {
      folder,
      page,
      user,
      userId: user.id,
      userDocumentId: user.documentId,
    });

    const finalFilters = `filters[folder][$eq]=${folder}&filters[user][id][$eq]=${user.id}`;
    console.log(`🧪 Requête avec filtres: ${finalFilters}`);

    const finalResponse = await this.fetchApi<ApiResponse<Email[]>>(
      `/emails?${finalFilters}&sort=sentAt:desc&pagination[page]=${page}&pagination[pageSize]=20&populate=*`,
    );

    console.log("🎯 Réponse finale:", finalResponse);
    return finalResponse;
  }

  async getEmail(id: string): Promise<ApiResponse<Email>> {
    return this.fetchApi<ApiResponse<Email>>(`/emails/${id}?populate=*`);
  }

  async sendEmail(emailData: ComposeEmailData): Promise<ApiResponse<Email>> {
    const user = this.getStoredUser();

    console.log("📤 ENVOI EMAIL - Données:", {
      user,
      emailData,
      userEmail: user.email || `${user.username}@eni.mg`,
    });

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
      } as EmailData,
    };

    console.log("📦 Payload pour l'envoi:", payload);

    const sentEmail = await this.fetchApi<ApiResponse<Email>>("/emails", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    console.log("✅ Email sauvé dans sent:", sentEmail);

    // Créer des copies dans la boîte de réception des destinataires
    for (const recipientEmail of emailData.to) {
      try {
        console.log(`📨 Recherche du destinataire: ${recipientEmail}`);

        const recipientUser = await this.getUserByEmail(recipientEmail);

        if (recipientUser) {
          console.log(`👤 Destinataire trouvé:`, recipientUser);

          const inboxPayload = {
            data: {
              ...payload.data,
              folder: "inbox",
              isRead: false,
              user: recipientUser.id,
            } as EmailData,
          };

          console.log("📦 Payload pour la boîte de réception:", inboxPayload);

          const deliveredEmail = await this.fetchApi<ApiResponse<Email>>(
            "/emails",
            {
              method: "POST",
              body: JSON.stringify(inboxPayload),
            },
          );

          console.log(`✅ Email livré à ${recipientEmail}:`, deliveredEmail);
        } else {
          console.warn(`⚠️ Destinataire non trouvé: ${recipientEmail}`);
        }
      } catch (error) {
        console.error(`❌ Erreur livraison à ${recipientEmail}:`, error);
      }
    }

    return sentEmail;
  }

  private async getUserByEmail(email: string): Promise<UserResponse | null> {
    console.log(`🔍 RECHERCHE UTILISATEUR: ${email}`);

    const searchApproaches = [
      `/users?filters[email][$eq]=${email}`,
      `/users?filters[email]=${email}`,
      `/users?email=${email}`,
    ];

    for (const approach of searchApproaches) {
      try {
        console.log(`🧪 Tentative avec: ${approach}`);
        const response = await this.fetchApi<UsersApiResponse>(approach);
        console.log(`📡 Réponse:`, response);

        let users: UserResponse[] = [];

        // Gérer les différents formats de réponse
        if (Array.isArray(response)) {
          users = response.map((user: StrapiItem | UserResponse) => {
            if ("attributes" in user) {
              const strapiUser = user as StrapiItem;
              return {
                id: strapiUser.id,
                documentId: strapiUser.documentId,
                ...strapiUser.attributes,
              } as UserResponse;
            }
            return user as UserResponse;
          });
        } else if ("data" in response && Array.isArray(response.data)) {
          users = response.data.map((user: StrapiItem) => ({
            id: user.id,
            documentId: user.documentId,
            ...user.attributes,
          })) as UserResponse[];
        } else if ("users" in response && Array.isArray(response.users)) {
          users = response.users;
        }

        console.log(`👥 Utilisateurs trouvés:`, users);

        if (users.length > 0) {
          const user = users[0];
          console.log(`✅ Utilisateur sélectionné:`, user);
          return user;
        }
      } catch (error) {
        console.log(`❌ Approche ${approach} échouée:`, error);
        continue;
      }
    }

    console.log(`❌ Aucun utilisateur trouvé pour: ${email}`);
    return null;
  }

  // Fonction helper pour obtenir l'identifiant correct (documentId ou id)
  private async getEmailIdentifier(id: string): Promise<string> {
    try {
      const emailResponse = await this.fetchApi<ApiResponse<any>>(
        `/emails?filters[id][$eq]=${id}&populate=*`,
      );

      if (Array.isArray(emailResponse.data) && emailResponse.data.length > 0) {
        const email = emailResponse.data[0];
        return email.id.toString();
      }
    } catch (error) {
      console.warn(
        `❌ Impossible de récupérer l'identifiant pour ${id}:`,
        error,
      );
    }
    return id; // Fallback vers l'ID original
  }

  async markAsRead(id: string, isRead: boolean): Promise<void> {
    console.log(`📖 Marquage email ${id} comme lu: ${isRead}`);

    try {
      // Essayer d'abord avec l'id numérique (ancienne méthode)
      await this.fetchApi(`/emails/${id}`, {
        method: "PUT",
        body: JSON.stringify({ data: { isRead } }),
      });
    } catch (error) {
      console.warn(`❌ Échec avec ID ${id}, tentative avec documentId...`);

      try {
        const correctId = await this.getEmailIdentifier(id);
        await this.fetchApi(`/emails/${correctId}`, {
          method: "PUT",
          body: JSON.stringify({ data: { isRead } }),
        });
      } catch (retryError) {
        console.error(`❌ Échec final pour markAsRead:`, retryError);
        // On ne relance pas l'erreur pour éviter de bloquer l'interface
        // L'email reste fonctionnel même si le statut "lu" n'est pas mis à jour
      }
    }
  }

  async toggleStar(id: string, isStarred: boolean): Promise<void> {
    console.log(`⭐ Toggle star email ${id}: ${isStarred}`);

    try {
      await this.fetchApi(`/emails/${id}`, {
        method: "PUT",
        body: JSON.stringify({ data: { isStarred } }),
      });
    } catch (error) {
      console.warn(
        `❌ Échec toggle star avec ID ${id}, tentative avec documentId...`,
      );

      try {
        const correctId = await this.getEmailIdentifier(id);
        await this.fetchApi(`/emails/${correctId}`, {
          method: "PUT",
          body: JSON.stringify({ data: { isStarred } }),
        });
      } catch (retryError) {
        console.error(`❌ Échec final pour toggleStar:`, retryError);
      }
    }
  }

  async moveToFolder(id: string, folder: string): Promise<void> {
    console.log(`📁 Déplacement email ${id} vers: ${folder}`);

    try {
      await this.fetchApi(`/emails/${id}`, {
        method: "PUT",
        body: JSON.stringify({ data: { folder } }),
      });
    } catch (error) {
      console.warn(
        `❌ Échec moveToFolder avec ID ${id}, tentative avec documentId...`,
      );

      try {
        const correctId = await this.getEmailIdentifier(id);
        await this.fetchApi(`/emails/${correctId}`, {
          method: "PUT",
          body: JSON.stringify({ data: { folder } }),
        });
      } catch (retryError) {
        console.error(`❌ Échec final pour moveToFolder:`, retryError);
        throw retryError;
      }
    }
  }

  async deleteEmail(id: string): Promise<void> {
    console.log(`🗑️ Suppression email: ${id}`);

    try {
      await this.fetchApi(`/emails/${id}`, { method: "DELETE" });
    } catch (error) {
      console.warn(
        `❌ Échec deleteEmail avec ID ${id}, tentative avec documentId...`,
      );

      try {
        const correctId = await this.getEmailIdentifier(id);
        await this.fetchApi(`/emails/${correctId}`, { method: "DELETE" });
      } catch (retryError) {
        console.error(`❌ Échec final pour deleteEmail:`, retryError);
        throw retryError;
      }
    }
  }

  async searchEmails(query: string): Promise<ApiResponse<Email[]>> {
    const user = this.getStoredUser();
    return this.fetchApi<ApiResponse<Email[]>>(
      `/emails?filters[user][id][$eq]=${user.id}&filters[$or][0][subject][$containsi]=${query}&filters[$or][1][body][$containsi]=${query}&filters[$or][2][from][$containsi]=${query}&populate=*`,
    );
  }

  async getCustomFolders(): Promise<ApiResponse<CustomFolder[]>> {
    return this.fetchApi<ApiResponse<CustomFolder[]>>("/folders?populate=*");
  }

  async createFolder(
    name: string,
    color: string,
  ): Promise<ApiResponse<CustomFolder>> {
    const user = this.getStoredUser();
    return this.fetchApi<ApiResponse<CustomFolder>>("/folders", {
      method: "POST",
      body: JSON.stringify({
        data: { name, color, user: user.id },
      }),
    });
  }

  async getUnreadCount(folder: string = "inbox"): Promise<number> {
    const user = this.getStoredUser();
    const response = await this.fetchApi<ApiResponse<any>>(
      `/emails?filters[folder][$eq]=${folder}&filters[user][id][$eq]=${user.id}&filters[isRead][$eq]=false&pagination[pageSize]=1`,
    );
    return response.meta?.pagination?.total || 0;
  }

  async refreshEmails(folder: string): Promise<ApiResponse<Email[]>> {
    console.log(`🔄 Rafraîchissement emails pour: ${folder}`);
    return this.getEmails(folder, 1);
  }

  async createTestEmail(): Promise<void> {
    const user = this.getStoredUser();

    const testPayload = {
      data: {
        from: "test@eni.mg",
        to: [user.email || `${user.username}@eni.mg`],
        subject: "Email de test",
        body: "Ceci est un email de test pour vérifier la réception.",
        folder: "inbox",
        isRead: false,
        isStarred: false,
        isImportant: false,
        sentAt: new Date().toISOString(),
        user: user.id,
      } as EmailData,
    };

    console.log("🧪 Création d'un email de test:", testPayload);

    try {
      const result = await this.fetchApi<ApiResponse<Email>>("/emails", {
        method: "POST",
        body: JSON.stringify(testPayload),
      });
      console.log("✅ Email de test créé:", result);
    } catch (error) {
      console.error("❌ Erreur création email de test:", error);
    }
  }
}

export const emailService = new EmailService();
