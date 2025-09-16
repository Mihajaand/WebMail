// services/emailService.ts - Version corrigée pour Strapi v4
import type { ApiResponse, ComposeEmailData } from "../types/api";
import type { CustomFolder, Email } from "../types/email";

const API_BASE = import.meta.env.VITE_STRAPI_URL || "http://localhost:1337/api";

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

  async getEmails(
    folder: string = "inbox",
    page: number = 1,
  ): Promise<ApiResponse<Email[]>> {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

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
    const user = JSON.parse(localStorage.getItem("user") || "{}");

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
      },
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
            },
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

  private async getUserByEmail(email: string): Promise<any> {
    console.log(`🔍 RECHERCHE UTILISATEUR: ${email}`);

    const searchApproaches = [
      `/users?filters[email][$eq]=${email}`,
      `/users?filters[email]=${email}`,
      `/users?email=${email}`,
    ];

    for (const approach of searchApproaches) {
      try {
        console.log(`🧪 Tentative avec: ${approach}`);
        const response = await this.fetchApi<any>(approach);
        console.log(`📡 Réponse:`, response);

        let users = [];
        if (response.data && Array.isArray(response.data)) {
          users = response.data;
        } else if (Array.isArray(response)) {
          users = response;
        } else if (response.users && Array.isArray(response.users)) {
          users = response.users;
        }

        console.log(`👥 Utilisateurs trouvés:`, users);

        if (users.length > 0) {
          const user = users[0];
          const finalUser = user.attributes
            ? { id: user.id, ...user.attributes }
            : user;
          console.log(`✅ Utilisateur sélectionné:`, finalUser);
          return finalUser;
        }
      } catch (error) {
        console.log(`❌ Approche ${approach} échouée:`, error);
        continue;
      }
    }

    console.log(`❌ Aucun utilisateur trouvé pour: ${email}`);
    return null;
  }

  // 🔹 CORRECTION PRINCIPALE : Utiliser documentId pour les mises à jour
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

      // Si ça échoue, essayer de récupérer l'email pour obtenir son documentId
      try {
        const emailResponse = await this.fetchApi<ApiResponse<any>>(
          `/emails?filters[id][$eq]=${id}&populate=*`,
        );

        if (emailResponse.data && emailResponse.data.length > 0) {
          const email = emailResponse.data[0];
          const documentId = email.documentId;

          console.log(`🔄 Retry avec documentId: ${documentId}`);

          await this.fetchApi(`/emails/${documentId}`, {
            method: "PUT",
            body: JSON.stringify({ data: { isRead } }),
          });
        } else {
          throw new Error(`Email avec ID ${id} non trouvé`);
        }
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
        const emailResponse = await this.fetchApi<ApiResponse<any>>(
          `/emails?filters[id][$eq]=${id}&populate=*`,
        );

        if (emailResponse.data && emailResponse.data.length > 0) {
          const email = emailResponse.data[0];
          const documentId = email.documentId;

          await this.fetchApi(`/emails/${documentId}`, {
            method: "PUT",
            body: JSON.stringify({ data: { isStarred } }),
          });
        }
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
        const emailResponse = await this.fetchApi<ApiResponse<any>>(
          `/emails?filters[id][$eq]=${id}&populate=*`,
        );

        if (emailResponse.data && emailResponse.data.length > 0) {
          const email = emailResponse.data[0];
          const documentId = email.documentId;

          await this.fetchApi(`/emails/${documentId}`, {
            method: "PUT",
            body: JSON.stringify({ data: { folder } }),
          });
        }
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
        const emailResponse = await this.fetchApi<ApiResponse<any>>(
          `/emails?filters[id][$eq]=${id}&populate=*`,
        );

        if (emailResponse.data && emailResponse.data.length > 0) {
          const email = emailResponse.data[0];
          const documentId = email.documentId;

          await this.fetchApi(`/emails/${documentId}`, { method: "DELETE" });
        }
      } catch (retryError) {
        console.error(`❌ Échec final pour deleteEmail:`, retryError);
        throw retryError;
      }
    }
  }

  async searchEmails(query: string): Promise<ApiResponse<Email[]>> {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
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
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return this.fetchApi<ApiResponse<CustomFolder>>("/folders", {
      method: "POST",
      body: JSON.stringify({
        data: { name, color, user: user.id },
      }),
    });
  }

  async getUnreadCount(folder: string = "inbox"): Promise<number> {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
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
    const user = JSON.parse(localStorage.getItem("user") || "{}");

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
      },
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
