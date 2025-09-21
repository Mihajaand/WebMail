// services/emailService.ts - Version complète et corrigée avec gestion des brouillons et EmailJS
import type { CustomFolder, Email } from "../types/email";
import { emailjsService } from "./emailjsService";

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

// Interface pour les brouillons
interface DraftData extends ComposeEmailData {
  id?: string;
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
  // Nouveaux champs pour la gestion externe
  hasExternalRecipients?: boolean;
  externalRecipients?: string[];
  internalRecipients?: string[];
  deliveryStatus?: "pending" | "delivered" | "failed" | "mixed";
  deliveredAt?: string;
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

    console.log("📤 ENVOI EMAIL - Analyse des destinataires:", {
      user,
      emailData,
      userEmail: user.email || `${user.username}@eni.mg`,
    });

    // Analyser tous les destinataires (to, cc, bcc)
    const allRecipients = [
      ...emailData.to,
      ...(emailData.cc || []),
      ...(emailData.bcc || []),
    ];

    const { internal, external } =
      emailjsService.categorizeRecipients(allRecipients);

    console.log("📊 Analyse destinataires:", { internal, external });

    // Sauvegarder l'email dans Strapi (copie locale)
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
        // Temporairement commenté jusqu'à mise à jour du modèle Strapi
        // hasExternalRecipients: external.length > 0,
        // externalRecipients: external,
        // internalRecipients: internal,
        // deliveryStatus: external.length > 0 ? 'pending' : 'delivered',
      } as EmailData,
    };

    console.log("📊 Info tracking (non sauvé en DB):", {
      hasExternalRecipients: external.length > 0,
      externalRecipients: external,
      internalRecipients: internal,
      deliveryStatus: external.length > 0 ? "pending" : "delivered",
    });

    console.log("📦 Payload pour l'envoi:", payload);

    const sentEmail = await this.fetchApi<ApiResponse<Email>>("/emails", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    console.log("✅ Email sauvé dans sent:", sentEmail);

    // 1. Traiter les destinataires INTERNES (comme avant)
    if (internal.length > 0) {
      console.log(`📨 Traitement de ${internal.length} destinataires internes`);

      for (const recipientEmail of internal) {
        try {
          console.log(
            `📨 Recherche du destinataire interne: ${recipientEmail}`,
          );
          const recipientUser = await this.getUserByEmail(recipientEmail);

          if (recipientUser) {
            console.log(`👤 Destinataire interne trouvé:`, recipientUser);

            const inboxPayload = {
              data: {
                from: user.email || `${user.username}@eni.mg`,
                to: [recipientEmail],
                cc:
                  emailData.cc?.filter(
                    (email) => !emailjsService.isExternalEmail(email),
                  ) || [],
                bcc:
                  emailData.bcc?.filter(
                    (email) => !emailjsService.isExternalEmail(email),
                  ) || [],
                subject: emailData.subject,
                body: emailData.body,
                folder: "inbox",
                isRead: false,
                user: recipientUser.id,
                sentAt: new Date().toISOString(),
                isStarred: false,
                isImportant: false,
              } as EmailData,
            };

            const deliveredEmail = await this.fetchApi<ApiResponse<Email>>(
              "/emails",
              {
                method: "POST",
                body: JSON.stringify(inboxPayload),
              },
            );

            console.log(
              `✅ Email livré en interne à ${recipientEmail}:`,
              deliveredEmail,
            );
          } else {
            console.warn(
              `⚠️ Destinataire interne non trouvé: ${recipientEmail}`,
            );
          }
        } catch (error) {
          console.error(
            `❌ Erreur livraison interne à ${recipientEmail}:`,
            error,
          );
        }
      }
    }

    // 2. Traiter les destinataires EXTERNES via EmailJS
    if (external.length > 0) {
      console.log(`📧 Traitement de ${external.length} destinataires externes`);

      try {
        // Séparer to, cc, bcc externes
        const externalTo = emailData.to.filter((email) =>
          emailjsService.isExternalEmail(email),
        );
        const externalCc = (emailData.cc || []).filter((email) =>
          emailjsService.isExternalEmail(email),
        );
        const externalBcc = (emailData.bcc || []).filter((email) =>
          emailjsService.isExternalEmail(email),
        );

        // Envoyer aux destinataires principaux externes
        let totalSuccess = 0;
        let totalFailed = 0;

        if (externalTo.length > 0) {
          const result = await emailjsService.sendMultipleExternalEmails(
            user.email || `${user.username}@eni.mg`,
            externalTo,
            emailData.subject,
            emailData.body,
            externalCc,
            externalBcc,
          );

          totalSuccess += result.success;
          totalFailed += result.failed;

          console.log(
            `📊 Résultat envoi externe TO: ${result.success}/${externalTo.length} succès`,
          );
        }

        // Mettre à jour le statut de livraison (temporairement désactivé)
        /*
        const finalStatus = totalFailed === 0 ? 'delivered' : 
                          totalSuccess === 0 ? 'failed' : 'mixed';

        await this.updateEmailDeliveryStatus(sentEmail.data.id, finalStatus);
        */

        console.log("📊 Statut de livraison (non sauvé):", {
          totalSuccess,
          totalFailed,
          finalStatus:
            totalFailed === 0
              ? "delivered"
              : totalSuccess === 0
                ? "failed"
                : "mixed",
        });

        // Si il y a des échecs, créer une notification
        if (totalFailed > 0) {
          const failedEmails = external.slice(totalSuccess);
          await this.createFailureNotification(
            user,
            failedEmails,
            emailData.subject,
          );
        }

        console.log("✅ Traitement des emails externes terminé");
      } catch (error) {
        console.error("❌ Erreur lors de l'envoi d'emails externes:", error);

        // Marquer comme échec et créer une notification (temporairement désactivé)
        // await this.updateEmailDeliveryStatus(sentEmail.data.id, 'failed');
        await this.createFailureNotification(user, external, emailData.subject);
      }
    }

    return sentEmail;
  }

  // Nouvelle méthode pour mettre à jour le statut de livraison
  private async updateEmailDeliveryStatus(
    emailId: string | number,
    status: "pending" | "delivered" | "failed" | "mixed",
  ): Promise<void> {
    try {
      await this.fetchApi(`/emails/${emailId}`, {
        method: "PUT",
        body: JSON.stringify({
          data: {
            deliveryStatus: status,
            deliveredAt: new Date().toISOString(),
          },
        }),
      });
      console.log(`✅ Statut de livraison mis à jour: ${status}`);
    } catch (error) {
      console.warn(
        "❌ Impossible de mettre à jour le statut de livraison:",
        error,
      );
    }
  }

  // Nouvelle méthode pour créer des notifications d'échec
  private async createFailureNotification(
    user: StoredUser,
    failedEmails: string[],
    originalSubject: string,
  ): Promise<void> {
    try {
      const notification = emailjsService.createFailureNotification(
        user.email || `${user.username}@eni.mg`,
        failedEmails,
        originalSubject,
      );

      // Créer la notification dans Strapi
      const notificationPayload = {
        data: {
          from: "system@eni.mg",
          to: notification.to,
          subject: notification.subject,
          body: notification.body,
          folder: "inbox",
          isRead: false,
          isStarred: false,
          isImportant: true, // Marquer comme important
          sentAt: new Date().toISOString(),
          user: user.id,
        } as EmailData,
      };

      await this.fetchApi<ApiResponse<Email>>("/emails", {
        method: "POST",
        body: JSON.stringify(notificationPayload),
      });

      console.log("📨 Notification d'échec créée");
    } catch (error) {
      console.error("❌ Erreur création notification d'échec:", error);
    }
  }

  async saveDraft(draftData: DraftData): Promise<ApiResponse<Email>> {
    const user = this.getStoredUser();

    console.log("💾 SAUVEGARDE BROUILLON - Données:", {
      user,
      draftData,
      userEmail: user.email || `${user.username}@eni.mg`,
      isUpdate: !!draftData.id,
    });

    const payload = {
      data: {
        from: user.email || `${user.username}@eni.mg`,
        to: draftData.to || [],
        cc: draftData.cc || [],
        bcc: draftData.bcc || [],
        subject: draftData.subject || "",
        body: draftData.body || "",
        folder: "draft",
        isRead: false,
        isStarred: false,
        isImportant: false,
        sentAt: new Date().toISOString(),
        user: user.id,
      } as EmailData,
    };

    console.log("📦 Payload pour la sauvegarde du brouillon:", payload);

    // Si c'est une modification d'un brouillon existant
    if (draftData.id) {
      console.log(`✏️ Mise à jour du brouillon existant: ${draftData.id}`);

      try {
        // Essayer de mettre à jour le brouillon existant
        const updatedDraft = await this.updateDraft(draftData.id, payload.data);
        console.log("✅ Brouillon mis à jour:", updatedDraft);
        return updatedDraft;
      } catch (error) {
        console.warn(
          "❌ Échec mise à jour brouillon, création d'un nouveau:",
          error,
        );
        // Si la mise à jour échoue, créer un nouveau brouillon
      }
    }

    // Créer un nouveau brouillon
    console.log("📝 Création d'un nouveau brouillon");
    const savedDraft = await this.fetchApi<ApiResponse<Email>>("/emails", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    console.log("✅ Brouillon sauvegardé:", savedDraft);
    return savedDraft;
  }

  private async updateDraft(
    draftId: string,
    draftData: EmailData,
  ): Promise<ApiResponse<Email>> {
    console.log(`📝 Mise à jour du brouillon ${draftId}:`, draftData);

    // Stratégies multiples pour la mise à jour du brouillon
    const updateStrategies = [
      // Stratégie 1: ID direct
      async () => {
        console.log(`🧪 Stratégie 1: ID direct ${draftId}`);
        return this.fetchApi<ApiResponse<Email>>(`/emails/${draftId}`, {
          method: "PUT",
          body: JSON.stringify({ data: draftData }),
        });
      },
      // Stratégie 2: Recherche par ID puis mise à jour
      async () => {
        console.log(`🧪 Stratégie 2: Recherche puis mise à jour`);
        const emailResponse = await this.fetchApi<ApiResponse<any>>(
          `/emails?filters[id][$eq]=${draftId}&filters[folder][$eq]=draft&populate=*`,
        );

        if (
          Array.isArray(emailResponse.data) &&
          emailResponse.data.length > 0
        ) {
          const email = emailResponse.data[0];
          const updateId = email.documentId || email.id;
          console.log(`📌 Trouvé brouillon, mise à jour avec ID: ${updateId}`);

          return this.fetchApi<ApiResponse<Email>>(`/emails/${updateId}`, {
            method: "PUT",
            body: JSON.stringify({ data: draftData }),
          });
        }
        throw new Error("Brouillon non trouvé");
      },
      // Stratégie 3: Avec documentId si disponible
      async () => {
        console.log(`🧪 Stratégie 3: DocumentId lookup`);
        const correctId = await this.getEmailIdentifier(draftId);
        return this.fetchApi<ApiResponse<Email>>(`/emails/${correctId}`, {
          method: "PUT",
          body: JSON.stringify({ data: draftData }),
        });
      },
    ];

    for (let i = 0; i < updateStrategies.length; i++) {
      try {
        const result = await updateStrategies[i]();
        console.log(`✅ Stratégie ${i + 1} réussie pour updateDraft:`, result);
        return result;
      } catch (error) {
        console.warn(`❌ Stratégie ${i + 1} échouée:`, error);

        // Si c'est la dernière stratégie, on lance l'erreur
        if (i === updateStrategies.length - 1) {
          console.error(`❌ Toutes les stratégies ont échoué pour updateDraft`);
          throw error;
        }

        // Sinon on continue avec la stratégie suivante
        continue;
      }
    }

    // Ne devrait jamais arriver, mais TypeScript l'exige
    throw new Error("Toutes les stratégies de mise à jour ont échoué");
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

  // Méthode pour supprimer un brouillon après envoi
  async deleteDraft(draftId: string): Promise<void> {
    console.log(`🗑️ Suppression du brouillon: ${draftId}`);

    try {
      await this.deleteEmail(draftId);
      console.log(`✅ Brouillon ${draftId} supprimé avec succès`);
    } catch (error) {
      console.error(
        `❌ Erreur lors de la suppression du brouillon ${draftId}:`,
        error,
      );
      throw error;
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

  // Nouvelle méthode pour vérifier l'état d'un email spécifique
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

  // Méthode pour synchroniser l'état starred d'un email
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

  // Nouvelle méthode pour obtenir les statistiques d'envoi
  async getEmailStats(): Promise<{
    totalSent: number;
    internalSent: number;
    externalSent: number;
    failed: number;
    delivered: number;
    pending: number;
  }> {
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

  // Méthode pour récupérer les emails avec leur statut de livraison
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

  // Méthode pour réessayer l'envoi d'emails échoués
  async retryFailedEmail(emailId: string): Promise<boolean> {
    try {
      console.log(`🔄 Tentative de renvoi pour l'email: ${emailId}`);

      const email = await this.getEmailById(emailId);
      if (!email) {
        console.error("❌ Email non trouvé pour renvoi");
        return false;
      }

      // Vérifier si l'email a des destinataires externes échoués
      const emailData = email as any;
      if (!emailData.hasExternalRecipients || !emailData.externalRecipients) {
        console.warn("⚠️ Aucun destinataire externe à renvoyer");
        return false;
      }

      // Réessayer l'envoi externe
      const user = this.getStoredUser();
      const result = await emailjsService.sendMultipleExternalEmails(
        user.email || `${user.username}@eni.mg`,
        emailData.externalRecipients,
        emailData.subject,
        emailData.body,
        emailData.cc || [],
        emailData.bcc || [],
      );

      // Mettre à jour le statut
      const newStatus =
        result.failed === 0
          ? "delivered"
          : result.success === 0
            ? "failed"
            : "mixed";

      await this.updateEmailDeliveryStatus(emailId, newStatus);

      console.log(
        `✅ Renvoi terminé: ${result.success}/${emailData.externalRecipients.length} succès`,
      );
      return result.success > 0;
    } catch (error) {
      console.error("❌ Erreur lors du renvoi:", error);
      return false;
    }
  }

  // Méthode pour nettoyer les emails anciens
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

  // Méthode pour exporter les emails en JSON
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

  // Méthode pour obtenir la configuration EmailJS
  getEmailJSConfig(): {
    isEnabled: boolean;
    hasValidConfig: boolean;
    serviceId: string | null;
    templateId: string | null;
  } {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || null;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || null;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || null;

    return {
      isEnabled: !!(serviceId && templateId && publicKey),
      hasValidConfig: !!(serviceId && templateId && publicKey),
      serviceId,
      templateId,
    };
  }
}

export const emailService = new EmailService();
