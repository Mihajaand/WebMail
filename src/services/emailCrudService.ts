// services/emailCrudService.ts - CRUD des emails
import { ApiClient } from "./apiClient";
import type { ApiResponse, EmailData, EmailStats } from "../types/emailService";
import type { Email } from "../types/email";

export class EmailCrudService extends ApiClient {
  async getEmails(
    folder: string = "inbox",
    page: number = 1,
    includeAttachments: boolean = true,
  ): Promise<ApiResponse<Email[]>> {
    const user = this.getStoredUser();

    console.log("🔍 DEBUG - Getting emails:", {
      folder,
      page,
      user,
      userId: user.id,
      userDocumentId: user.documentId,
      includeAttachments,
    });

    const finalFilters = `filters[folder][$eq]=${folder}&filters[user][id][$eq]=${user.id}`;
    const populateQuery = includeAttachments ? 'populate[0]=attachments&populate[1]=user' : 'populate=user';
    console.log(`🧪 Requête avec filtres: ${finalFilters}`);

    const finalResponse = await this.fetchApi<ApiResponse<Email[]>>(
      `/emails?${finalFilters}&sort=sentAt:desc&pagination[page]=${page}&pagination[pageSize]=20&${populateQuery}`,
    );

    console.log("🎯 Réponse finale:", finalResponse);
    return finalResponse;
  }

  async getEmail(id: string): Promise<ApiResponse<Email>> {
    return this.fetchApi<ApiResponse<Email>>(`/emails/${id}?populate[0]=attachments&populate[1]=user`);
  }

  async getEmailById(id: string): Promise<Email | null> {
    try {
      console.log(`🔍 Récupération email par ID: ${id}`);

      // Essayer plusieurs approches pour récupérer l'email
      const approaches = [
        `/emails/${id}?populate=*`,
        `/emails?filters[id][$eq]=${id}&populate=*`,
      ];

      for (const approach of approaches) {
        try {
          console.log(`🔍 Tentative avec l'approche: ${approach}`);
          const response = await this.fetchApi<any>(approach);

          if (response.data) {
            // Si c'est un objet direct
            if (!Array.isArray(response.data)) {
              const email = response.data.attributes
                ? { id: String(response.data.id), ...response.data.attributes }
                : { id: String(response.data.id), ...response.data };
              console.log(`✅ Email trouvé (direct):`, email);
              return email as Email;
            }
            // Si c'est un tableau
            else if (response.data.length > 0) {
              const item = response.data[0];
              const email = item.attributes
                ? { id: String(item.id), ...item.attributes }
                : { id: String(item.id), ...item };
              console.log(`✅ Email trouvé (array):`, email);
              return email as Email;
            }
          }
        } catch (error) {
          console.warn(`❌ Approche ${approach} échouée:`, error);
          continue;
        }
      }

      console.log(`❌ Email ${id} non trouvé`);
      return null;
    } catch (error) {
      console.error(
        `❌ Erreur lors de la récupération de l'email ${id}:`,
        error,
      );
      return null;
    }
  }

  async toggleStar(id: string, isStarred: boolean): Promise<void> {
    console.log(`⭐ Toggle star email ${id}: ${isStarred}`);

    // Stratégies multiples pour la mise à jour
    const updateStrategies = [
      // Stratégie 1: ID direct
      async () => {
        console.log(`🧪 Stratégie 1: ID direct ${id}`);
        return this.fetchApi(`/emails/${id}`, {
          method: "PUT",
          body: JSON.stringify({ data: { isStarred } }),
        });
      },
      // Stratégie 2: Recherche par ID puis mise à jour
      async () => {
        console.log(`🧪 Stratégie 2: Recherche puis mise à jour`);
        const emailResponse = await this.fetchApi<ApiResponse<any>>(
          `/emails?filters[id][$eq]=${id}&populate=*`,
        );

        if (
          Array.isArray(emailResponse.data) &&
          emailResponse.data.length > 0
        ) {
          const email = emailResponse.data[0];
          const updateId = email.documentId || email.id;
          console.log(`📌 Trouvé email, mise à jour avec ID: ${updateId}`);

          return this.fetchApi(`/emails/${updateId}`, {
            method: "PUT",
            body: JSON.stringify({ data: { isStarred } }),
          });
        }
        throw new Error("Email non trouvé");
      },
      // Stratégie 3: Avec documentId si disponible
      async () => {
        console.log(`🧪 Stratégie 3: DocumentId lookup`);
        const correctId = await this.getEmailIdentifier(id);
        return this.fetchApi(`/emails/${correctId}`, {
          method: "PUT",
          body: JSON.stringify({ data: { isStarred } }),
        });
      },
    ];

    for (let i = 0; i < updateStrategies.length; i++) {
      try {
        const result = await updateStrategies[i]();
        console.log(`✅ Stratégie ${i + 1} réussie pour toggleStar:`, result);
        return;
      } catch (error) {
        console.warn(`❌ Stratégie ${i + 1} échouée:`, error);

        // Si c'est la dernière stratégie, on lance l'erreur
        if (i === updateStrategies.length - 1) {
          console.error(`❌ Toutes les stratégies ont échoué pour toggleStar`);
          throw error;
        }

        // Sinon on continue avec la stratégie suivante
        continue;
      }
    }
  }

  async moveToFolder(id: string, folder: string): Promise<void> {
    console.log(`📁 Déplacement email ${id} vers: ${folder}`);

    const updateStrategies = [
      // Stratégie 1: ID direct
      async () => {
        console.log(`🧪 Stratégie 1: ID direct ${id}`);
        return this.fetchApi(`/emails/${id}`, {
          method: "PUT",
          body: JSON.stringify({ data: { folder } }),
        });
      },
      // Stratégie 2: Recherche par ID puis mise à jour
      async () => {
        console.log(`🧪 Stratégie 2: Recherche puis mise à jour`);
        const emailResponse = await this.fetchApi<ApiResponse<any>>(
          `/emails?filters[id][$eq]=${id}&populate=*`,
        );

        if (
          Array.isArray(emailResponse.data) &&
          emailResponse.data.length > 0
        ) {
          const email = emailResponse.data[0];
          const updateId = email.documentId || email.id;
          console.log(`📌 Trouvé email, mise à jour avec ID: ${updateId}`);

          return this.fetchApi(`/emails/${updateId}`, {
            method: "PUT",
            body: JSON.stringify({ data: { folder } }),
          });
        }
        throw new Error("Email non trouvé");
      },
      // Stratégie 3: Avec documentId si disponible
      async () => {
        console.log(`🧪 Stratégie 3: DocumentId lookup`);
        const correctId = await this.getEmailIdentifier(id);
        return this.fetchApi(`/emails/${correctId}`, {
          method: "PUT",
          body: JSON.stringify({ data: { folder } }),
        });
      },
    ];

    for (let i = 0; i < updateStrategies.length; i++) {
      try {
        console.log(
          `📝 Tentative de la stratégie ${i + 1} pour moveToFolder...`,
        );
        const result = await updateStrategies[i]();
        console.log(`✅ Stratégie ${i + 1} réussie pour moveToFolder:`, result);
        return;
      } catch (error) {
        console.warn(`❌ Stratégie ${i + 1} échouée:`, error);

        // Si c'est la dernière stratégie, on lance l'erreur
        if (i === updateStrategies.length - 1) {
          console.error(
            `❌ Toutes les stratégies ont échoué pour moveToFolder`,
          );
          throw error;
        }

        // Sinon on continue avec la stratégie suivante
        continue;
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

  async syncEmailStarStatus(id: string): Promise<boolean | null> {
    try {
      const email = await this.getEmailById(id);
      if (email) {
        console.log(
          `🔄 État isStarred synchronisé pour ${id}: ${email.isStarred}`,
        );
        return email.isStarred;
      }
      return null;
    } catch (error) {
      console.error(`❌ Erreur sync star status pour ${id}:`, error);
      return null;
    }
  }

  async getEmailStats(): Promise<EmailStats> {
    try {
      const user = this.getStoredUser();

      const response = await this.fetchApi<ApiResponse<any>>(
        `/emails?filters[user][id][$eq]=${user.id}&filters[folder][$eq]=sent&populate=*`,
      );

      const sentEmails = Array.isArray(response.data) ? response.data : [];

      let totalSent = sentEmails.length;
      let internalSent = 0;
      let externalSent = 0;
      let failed = 0;
      let delivered = 0;
      let pending = 0;

      sentEmails.forEach((email: any) => {
        const emailData = email.attributes || email;

        if (emailData.hasExternalRecipients) {
          externalSent++;
        } else {
          internalSent++;
        }

        switch (emailData.deliveryStatus) {
          case "delivered":
            delivered++;
            break;
          case "failed":
            failed++;
            break;
          case "pending":
            pending++;
            break;
          case "mixed":
            delivered++;
            break;
          default:
            delivered++;
            break;
        }
      });

      const stats = {
        totalSent,
        internalSent,
        externalSent,
        failed,
        delivered,
        pending,
      };

      console.log("📊 Statistiques d'envoi:", stats);
      return stats;
    } catch (error) {
      console.error("❌ Erreur récupération statistiques:", error);
      return {
        totalSent: 0,
        internalSent: 0,
        externalSent: 0,
        failed: 0,
        delivered: 0,
        pending: 0,
      };
    }
  }

  async getEmailsWithDeliveryStatus(
    folder: string = "sent",
    page: number = 1,
  ): Promise<ApiResponse<Email[]>> {
    const user = this.getStoredUser();

    const response = await this.fetchApi<ApiResponse<Email[]>>(
      `/emails?filters[folder][$eq]=${folder}&filters[user][id][$eq]=${user.id}&sort=sentAt:desc&pagination[page]=${page}&pagination[pageSize]=20&populate=*`,
    );

    console.log("📧 Emails avec statut de livraison:", response);
    return response;
  }

  async exportEmails(folder?: string): Promise<Email[]> {
    try {
      const user = this.getStoredUser();

      let query = `/emails?filters[user][id][$eq]=${user.id}&populate=*&pagination[pageSize]=1000`;
      if (folder) {
        query += `&filters[folder][$eq]=${folder}`;
      }

      const response = await this.fetchApi<ApiResponse<any>>(query);

      const emails = Array.isArray(response.data)
        ? response.data.map((item: any) => {
            return item.attributes
              ? { id: String(item.id), ...item.attributes }
              : { id: String(item.id), ...item };
          })
        : [];

      console.log(`📤 Export de ${emails.length} emails`);
      return emails as Email[];
    } catch (error) {
      console.error("❌ Erreur lors de l'export:", error);
      return [];
    }
  }

  async cleanupOldEmails(daysOld: number = 30): Promise<number> {
    try {
      const user = this.getStoredUser();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      console.log(
        `🧹 Nettoyage des emails antérieurs au: ${cutoffDate.toISOString()}`,
      );

      const response = await this.fetchApi<ApiResponse<any>>(
        `/emails?filters[user][id][$eq]=${user.id}&filters[folder][$eq]=trash&filters[sentAt][$lt]=${cutoffDate.toISOString()}&populate=*`,
      );

      const oldEmails = Array.isArray(response.data) ? response.data : [];
      let deletedCount = 0;

      for (const email of oldEmails) {
        try {
          await this.deleteEmail(String(email.id));
          deletedCount++;
        } catch (error) {
          console.warn(
            `❌ Impossible de supprimer l'email ${email.id}:`,
            error,
          );
        }
      }

      console.log(`✅ ${deletedCount} emails supprimés lors du nettoyage`);
      return deletedCount;
    } catch (error) {
      console.error("❌ Erreur lors du nettoyage:", error);
      return 0;
    }
  }

  // Méthode pour marquer un email comme lu/non lu
  async markAsRead(id: string, isRead: boolean = true): Promise<void> {
    console.log(`📖 Marquer email ${id} comme ${isRead ? "lu" : "non lu"}`);

    const updateStrategies = [
      // Stratégie 1: ID direct
      async () => {
        console.log(`🧪 Stratégie 1: ID direct ${id}`);
        return this.fetchApi(`/emails/${id}`, {
          method: "PUT",
          body: JSON.stringify({ data: { isRead } }),
        });
      },
      // Stratégie 2: Recherche par ID puis mise à jour
      async () => {
        console.log(`🧪 Stratégie 2: Recherche puis mise à jour`);
        const emailResponse = await this.fetchApi<ApiResponse<any>>(
          `/emails?filters[id][$eq]=${id}&populate=*`,
        );

        if (
          Array.isArray(emailResponse.data) &&
          emailResponse.data.length > 0
        ) {
          const email = emailResponse.data[0];
          const updateId = email.documentId || email.id;
          console.log(`📌 Trouvé email, mise à jour avec ID: ${updateId}`);

          return this.fetchApi(`/emails/${updateId}`, {
            method: "PUT",
            body: JSON.stringify({ data: { isRead } }),
          });
        }
        throw new Error("Email non trouvé");
      },
      // Stratégie 3: Avec documentId si disponible
      async () => {
        console.log(`🧪 Stratégie 3: DocumentId lookup`);
        const correctId = await this.getEmailIdentifier(id);
        return this.fetchApi(`/emails/${correctId}`, {
          method: "PUT",
          body: JSON.stringify({ data: { isRead } }),
        });
      },
    ];

    for (let i = 0; i < updateStrategies.length; i++) {
      try {
        const result = await updateStrategies[i]();
        console.log(`✅ Stratégie ${i + 1} réussie pour markAsRead:`, result);
        return;
      } catch (error) {
        console.warn(`❌ Stratégie ${i + 1} échouée:`, error);

        // Si c'est la dernière stratégie, on lance l'erreur
        if (i === updateStrategies.length - 1) {
          console.error(`❌ Toutes les stratégies ont échoué pour markAsRead`);
          throw error;
        }

        // Sinon on continue avec la stratégie suivante
        continue;
      }
    }
  }

  // Méthode pour marquer un email comme important/pas important
  async markAsImportant(
    id: string,
    isImportant: boolean = true,
  ): Promise<void> {
    console.log(
      `⚠️ Marquer email ${id} comme ${isImportant ? "important" : "normal"}`,
    );

    const updateStrategies = [
      // Stratégie 1: ID direct
      async () => {
        console.log(`🧪 Stratégie 1: ID direct ${id}`);
        return this.fetchApi(`/emails/${id}`, {
          method: "PUT",
          body: JSON.stringify({ data: { isImportant } }),
        });
      },
      // Stratégie 2: Recherche par ID puis mise à jour
      async () => {
        console.log(`🧪 Stratégie 2: Recherche puis mise à jour`);
        const emailResponse = await this.fetchApi<ApiResponse<any>>(
          `/emails?filters[id][$eq]=${id}&populate=*`,
        );

        if (
          Array.isArray(emailResponse.data) &&
          emailResponse.data.length > 0
        ) {
          const email = emailResponse.data[0];
          const updateId = email.documentId || email.id;
          console.log(`📌 Trouvé email, mise à jour avec ID: ${updateId}`);

          return this.fetchApi(`/emails/${updateId}`, {
            method: "PUT",
            body: JSON.stringify({ data: { isImportant } }),
          });
        }
        throw new Error("Email non trouvé");
      },
      // Stratégie 3: Avec documentId si disponible
      async () => {
        console.log(`🧪 Stratégie 3: DocumentId lookup`);
        const correctId = await this.getEmailIdentifier(id);
        return this.fetchApi(`/emails/${correctId}`, {
          method: "PUT",
          body: JSON.stringify({ data: { isImportant } }),
        });
      },
    ];

    for (let i = 0; i < updateStrategies.length; i++) {
      try {
        const result = await updateStrategies[i]();
        console.log(
          `✅ Stratégie ${i + 1} réussie pour markAsImportant:`,
          result,
        );
        return;
      } catch (error) {
        console.warn(`❌ Stratégie ${i + 1} échouée:`, error);

        // Si c'est la dernière stratégie, on lance l'erreur
        if (i === updateStrategies.length - 1) {
          console.error(
            `❌ Toutes les stratégies ont échoué pour markAsImportant`,
          );
          throw error;
        }

        // Sinon on continue avec la stratégie suivante
        continue;
      }
    }
  }

  // Méthode pour obtenir les emails par statut (lu/non lu, important, etc.)
  async getEmailsByStatus(
    status: "read" | "unread" | "starred" | "important",
    page: number = 1,
  ): Promise<ApiResponse<Email[]>> {
    const user = this.getStoredUser();

    let statusFilter = "";
    switch (status) {
      case "read":
        statusFilter = "filters[isRead][$eq]=true";
        break;
      case "unread":
        statusFilter = "filters[isRead][$eq]=false";
        break;
      case "starred":
        statusFilter = "filters[isStarred][$eq]=true";
        break;
      case "important":
        statusFilter = "filters[isImportant][$eq]=true";
        break;
    }

    return this.fetchApi<ApiResponse<Email[]>>(
      `/emails?filters[user][id][$eq]=${user.id}&${statusFilter}&sort=sentAt:desc&pagination[page]=${page}&pagination[pageSize]=20&populate=*`,
    );
  }
}

export const emailCrudService = new EmailCrudService();
