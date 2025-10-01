// services/draftService.ts - Gestion des brouillons
import { ApiClient } from "./apiClient";
import type { DraftData, EmailData, ApiResponse } from "../types/emailService";
import type { Email } from "../types/email";

export class DraftService extends ApiClient {
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

  async deleteDraft(draftId: string): Promise<void> {
    console.log(`🗑️ Suppression du brouillon: ${draftId}`);

    try {
      await this.fetchApi(`/emails/${draftId}`, { method: "DELETE" });
      console.log(`✅ Brouillon ${draftId} supprimé avec succès`);
    } catch (error) {
      console.warn(
        `❌ Échec deleteEmail avec ID ${draftId}, tentative avec documentId...`,
      );

      try {
        const correctId = await this.getEmailIdentifier(draftId);
        await this.fetchApi(`/emails/${correctId}`, { method: "DELETE" });
        console.log(`✅ Brouillon supprimé avec correctId: ${correctId}`);
      } catch (retryError) {
        console.error(`❌ Échec final pour deleteDraft:`, retryError);
        throw retryError;
      }
    }
  }
}

export const draftService = new DraftService();
