// services/emailSendingService.ts - Service d'envoi d'emails
import { ApiClient } from "./apiClient";
import { userService } from "./userService";
import { emailjsService } from "./emailjsService";
import type {
  ComposeEmailData,
  EmailData,
  ApiResponse,
  StoredUser,
} from "../types/emailService";
import type { Email } from "../types/email";

export class EmailSendingService extends ApiClient {
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

    // Créer un FormData pour l'envoi des fichiers
    const formData = new FormData();
    
    // Ajouter les données de base
    const emailPayload: EmailData = {
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
    };

    console.log("📊 Info tracking (non sauvé en DB):", {
      hasExternalRecipients: external.length > 0,
      externalRecipients: external,
      internalRecipients: internal,
      deliveryStatus: external.length > 0 ? "pending" : "delivered",
    });

    console.log("📦 Payload pour l'envoi:", emailPayload);

    // Premier appel API pour créer l'email
    const sentEmail = await this.fetchApi<ApiResponse<Email>>("/emails", {
      method: "POST",
      body: JSON.stringify({ 
        data: {
          ...emailPayload,
          publishedAt: new Date().toISOString(), // Ajouter le champ publishedAt requis par Strapi
        }
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Si il y a des pièces jointes, les uploader dans un second appel
    if (emailData.attachments && emailData.attachments.length > 0) {
      try {
        console.log("📎 Préparation de l'upload des pièces jointes pour l'email:", sentEmail.data.id);
        
        const formData = new FormData();
        
        // Ajouter les fichiers et les métadonnées de relation
        emailData.attachments.forEach((file) => {
          formData.append('files', file);
        });
        
        formData.append('ref', 'api::email.email');
        formData.append('refId', sentEmail.data.id);
        formData.append('field', 'attachments');

        console.log("📎 Uploading attachments for email:", {
          emailId: sentEmail.data.id,
          filesCount: emailData.attachments.length,
          files: emailData.attachments.map(f => ({ name: f.name, size: f.size }))
        });

        // Faire l'upload sans paramètres dans l'URL car ils sont dans le FormData
        const uploadResponse = await this.fetchApi("/upload", {
          method: "POST",
          body: formData,
          params: {
            ref: 'api::email.email',
            refId: sentEmail.data.id,
            field: 'attachments'
          },
          headers: {} // Laisser le navigateur gérer le Content-Type pour le FormData
        });
        
        console.log("✅ Pièces jointes uploadées:", uploadResponse);
        
        // Attendre un peu que Strapi finisse de traiter l'upload
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          // Récupérer l'email mis à jour avec les pièces jointes
          const updatedEmail = await this.fetchApi<ApiResponse<Email>>(`/emails/${sentEmail.data.id}?populate[0]=attachments&populate[1]=user`);
          console.log("✅ Email mis à jour avec pièces jointes:", updatedEmail);
          sentEmail = updatedEmail;
        } catch (error) {
          // Si on ne peut pas récupérer l'email mis à jour, on continue avec l'email original
          console.warn("⚠️ Impossible de récupérer l'email mis à jour, on continue avec l'original:", error);
          // On ne relance pas l'erreur ici pour ne pas bloquer le processus
        }
      } catch (error) {
        console.error("❌ Erreur lors de l'upload des pièces jointes:", error);
        throw error;
      }
    }

    console.log("✅ Email final:", sentEmail);

    // 1. Traiter les destinataires INTERNES
    await this.processInternalRecipients(internal, emailData, user);

    // 2. Traiter les destinataires EXTERNES via EmailJS
    // Convertir les pièces jointes au format attendu par EmailJS
    const emailjsAttachments = emailData.attachments?.map(file => ({
      name: file.name,
      data: file, // EmailJS accepte les objets File directement
    }));

    // Préparer les données pour le processus externe
    const externalEmailData = {
      ...emailData,
      attachments: emailjsAttachments,
      from: user.email || `${user.username}@eni.mg`,
    };

    await this.processExternalRecipients(external, externalEmailData, user, sentEmail);

    return sentEmail;
  }

  private async processInternalRecipients(
    internal: string[],
    emailData: ComposeEmailData,
    user: StoredUser,
  ): Promise<void> {
    if (internal.length === 0) return;

    console.log(`📨 Traitement de ${internal.length} destinataires internes`);

    for (const recipientEmail of internal) {
      try {
        console.log(`📨 Recherche du destinataire interne: ${recipientEmail}`);
        const recipientUser = await userService.getUserByEmail(recipientEmail);

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
          console.warn(`⚠️ Destinataire interne non trouvé: ${recipientEmail}`);
        }
      } catch (error) {
        console.error(
          `❌ Erreur livraison interne à ${recipientEmail}:`,
          error,
        );
      }
    }
  }

  private async processExternalRecipients(
    external: string[],
    emailData: ComposeEmailData,
    user: StoredUser,
    sentEmail: ApiResponse<Email>,
  ): Promise<void> {
    if (external.length === 0) return;

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
  console.log(`📬 Envoi vers ${externalTo.length} destinataires externes`);
  
  // Envoyer un email séparé pour chaque destinataire externe
  for (const recipient of externalTo) {
    const externalEmailData = {
      from: user.email || `${user.username}@eni.mg`,
      to: recipient,
      subject: emailData.subject,
      body: emailData.body,
      cc: externalCc,
      bcc: externalBcc,
      attachments: emailData.attachments, // 🎯 Les pièces jointes sont passées ici
    };

    const sent = await emailjsService.sendExternalEmail(externalEmailData);
    if (sent) {
      totalSuccess++;
    } else {
      totalFailed++;
    }

    // Délai entre les envois pour éviter le spam
    if (externalTo.length > 1 && recipient !== externalTo[externalTo.length - 1]) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(
    `📊 Résultat envoi externe TO: ${totalSuccess}/${externalTo.length} succès`,
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

  // Méthode pour mettre à jour le statut de livraison
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

  // Méthode pour créer des notifications d'échec
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

  private async getEmailById(id: string): Promise<Email | null> {
    try {
      const emailResponse = await this.fetchApi<any>(
        `/emails/${id}?populate=*`,
      );

      if (emailResponse.data) {
        const email = emailResponse.data.attributes
          ? {
              id: String(emailResponse.data.id),
              ...emailResponse.data.attributes,
            }
          : { id: String(emailResponse.data.id), ...emailResponse.data };
        return email as Email;
      }
      return null;
    } catch (error) {
      console.error(`❌ Erreur récupération email ${id}:`, error);
      return null;
    }
  }
}

export const emailSendingService = new EmailSendingService();
