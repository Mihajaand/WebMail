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

    // Catégoriser par type (TO, CC, BCC)
    const toInternal = emailData.to.filter(
      (email) => !emailjsService.isExternalEmail(email)
    );
    const toExternal = emailData.to.filter((email) =>
      emailjsService.isExternalEmail(email)
    );

    const ccInternal = (emailData.cc || []).filter(
      (email) => !emailjsService.isExternalEmail(email)
    );
    const ccExternal = (emailData.cc || []).filter((email) =>
      emailjsService.isExternalEmail(email)
    );

    const bccInternal = (emailData.bcc || []).filter(
      (email) => !emailjsService.isExternalEmail(email)
    );
    const bccExternal = (emailData.bcc || []).filter((email) =>
      emailjsService.isExternalEmail(email)
    );

    console.log("📊 Répartition des destinataires:");
    console.log("TO - Internes:", toInternal, "Externes:", toExternal);
    console.log("CC - Internes:", ccInternal, "Externes:", ccExternal);
    console.log("BCC - Internes:", bccInternal, "Externes:", bccExternal);

    // Créer un FormData pour l'envoi des fichiers
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
    };

    console.log("📊 Info tracking (non sauvé en DB):", {
      hasExternalRecipients: external.length > 0,
      externalRecipients: external,
      internalRecipients: internal,
      deliveryStatus: external.length > 0 ? "pending" : "delivered",
    });

    console.log("📦 Payload pour l'envoi:", emailPayload);

    // Premier appel API pour créer l'email dans "sent"
    const sentEmail = await this.fetchApi<ApiResponse<Email>>("/emails", {
      method: "POST",
      body: JSON.stringify({ 
        data: {
          ...emailPayload,
          publishedAt: new Date().toISOString(),
        }
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Si il y a des pièces jointes, les uploader
    if (emailData.attachments && emailData.attachments.length > 0) {
      try {
        console.log("📎 Préparation de l'upload des pièces jointes pour l'email:", sentEmail.data.id);
        
        const formData = new FormData();
        
        emailData.attachments.forEach((file) => {
          formData.append('files', file);
        });
        
        formData.append('ref', 'api::email.email');
        formData.append('refId', String(sentEmail.data.id));
        formData.append('field', 'attachments');

        console.log("📎 Uploading attachments...");

        const uploadResponse = await this.fetchApi("/upload", {
          method: "POST",
          body: formData,
          params: {
            ref: 'api::email.email',
            refId: String(sentEmail.data.id),
            field: 'attachments'
          },
          headers: {}
        });
        
        console.log("✅ Pièces jointes uploadées:", uploadResponse);
        
        // Stocker les IDs des fichiers uploadés
        if (Array.isArray(uploadResponse)) {
          sentEmail.data.attachments = uploadResponse;
          console.log(`📎 ${uploadResponse.length} attachments ajoutés à sentEmail:`, uploadResponse.map((f: any) => f.id));
        }
        
      } catch (error) {
        console.error("❌ Erreur lors de l'upload des pièces jointes:", error);
        throw error;
      }
    }

    console.log("✅ Email final:", sentEmail);

    // 1. Traiter les destinataires INTERNES (TO + CC)
    await this.processInternalRecipients(
      [...toInternal, ...ccInternal], 
      emailData, 
      user, 
      sentEmail,
      ccInternal,
      ccExternal
    );

    // 2. Traiter les destinataires INTERNES BCC (séparément pour confidentialité)
    await this.processInternalBccRecipients(
      bccInternal,
      emailData,
      user,
      sentEmail
    );

    // 3. Traiter les destinataires EXTERNES via EmailJS
    // IMPORTANT : Cette méthode vérifie aussi si les emails externes appartiennent à des utilisateurs de l'app
    await this.processExternalRecipients(
      toExternal,
      ccExternal,
      bccExternal,
      emailData,
      user,
      sentEmail
    );

    return sentEmail;
  }

  private async processInternalRecipients(
    internal: string[],
    emailData: ComposeEmailData,
    user: StoredUser,
    sentEmail: ApiResponse<Email>,
    ccInternal: string[],
    ccExternal: string[]
  ): Promise<void> {
    if (internal.length === 0) return;

    console.log(`📨 Traitement de ${internal.length} destinataires internes (TO + CC)`);

    // Récupérer les IDs des attachments
    let attachmentIds: number[] = [];
    if (sentEmail?.data?.attachments && Array.isArray(sentEmail.data.attachments)) {
      attachmentIds = sentEmail.data.attachments.map((att: any) => att.id);
      console.log(`📎 ${attachmentIds.length} IDs d'attachments récupérés:`, attachmentIds);
    }

    // Préparer le message avec notice CC si nécessaire
    let bodyForRecipient = emailData.body;
    
    if (ccInternal.length > 0 || ccExternal.length > 0) {
      const allCc = [...ccInternal, ...ccExternal];
      const ccNames = allCc.join(", ");
      const plural = allCc.length > 1;
      
      const ccNotice = `ℹ️ Information : ${plural ? 'Les personnes suivantes ont' : 'La personne suivante a'} également reçu ce message en copie : ${ccNames}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      bodyForRecipient = ccNotice + emailData.body;
    }

    for (const recipientEmail of internal) {
      try {
        console.log(`📨 Recherche du destinataire interne: ${recipientEmail}`);
        const recipientUser = await userService.getUserByEmail(recipientEmail);

        if (recipientUser) {
          console.log(`👤 Destinataire interne trouvé:`, recipientUser);

          const inboxData: any = {
            from: user.email || `${user.username}@eni.mg`,
            to: emailData.to,
            cc: emailData.cc || [],
            bcc: [], // Ne jamais exposer les BCC
            subject: emailData.subject,
            body: bodyForRecipient, // Corps avec notice CC
            folder: "inbox",
            isRead: false,
            user: recipientUser.id,
            sentAt: new Date().toISOString(),
            isStarred: false,
            isImportant: false,
          };

          // Ajouter les attachments
          if (attachmentIds.length > 0) {
            inboxData.attachments = attachmentIds;
            console.log(`📎 Ajout de ${attachmentIds.length} attachments à l'email inbox`);
          }

          const inboxPayload = { data: inboxData };
          console.log("📦 Payload inbox avec notice CC:", inboxPayload);

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

  private async processInternalBccRecipients(
    bccInternal: string[],
    emailData: ComposeEmailData,
    user: StoredUser,
    sentEmail: ApiResponse<Email>
  ): Promise<void> {
    if (bccInternal.length === 0) return;

    console.log(`📨 Traitement de ${bccInternal.length} destinataires BCC internes`);

    // Récupérer les IDs des attachments
    let attachmentIds: number[] = [];
    if (sentEmail?.data?.attachments && Array.isArray(sentEmail.data.attachments)) {
      attachmentIds = sentEmail.data.attachments.map((att: any) => att.id);
    }

    for (const recipientEmail of bccInternal) {
      try {
        console.log(`📨 Recherche du destinataire BCC interne: ${recipientEmail}`);
        const recipientUser = await userService.getUserByEmail(recipientEmail);

        if (recipientUser) {
          const inboxData: any = {
            from: user.email || `${user.username}@eni.mg`,
            to: emailData.to,
            cc: emailData.cc || [],
            bcc: [], // Ne jamais exposer les BCC
            subject: emailData.subject,
            body: emailData.body, // Corps SANS notice CC pour BCC
            folder: "inbox",
            isRead: false,
            user: recipientUser.id,
            sentAt: new Date().toISOString(),
            isStarred: false,
            isImportant: false,
          };

          if (attachmentIds.length > 0) {
            inboxData.attachments = attachmentIds;
          }

          const inboxPayload = { data: inboxData };

          await this.fetchApi<ApiResponse<Email>>("/emails", {
            method: "POST",
            body: JSON.stringify(inboxPayload),
          });

          console.log(`✅ Email BCC livré en interne à ${recipientEmail}`);
        }
      } catch (error) {
        console.error(`❌ Erreur livraison BCC interne à ${recipientEmail}:`, error);
      }
    }
  }

  private async processExternalRecipients(
    toExternal: string[],
    ccExternal: string[],
    bccExternal: string[],
    emailData: ComposeEmailData,
    user: StoredUser,
    sentEmail: ApiResponse<Email>
  ): Promise<void> {
    const allExternal = [...toExternal, ...ccExternal, ...bccExternal];
    
    if (allExternal.length === 0) return;

    console.log(`📧 Traitement de ${allExternal.length} destinataires externes`);
    console.log(`TO: ${toExternal.length}, CC: ${ccExternal.length}, BCC: ${bccExternal.length}`);

    try {
      let totalSuccess = 0;
      let totalFailed = 0;

      // Récupérer les IDs des attachments
      let attachmentIds: number[] = [];
      if (sentEmail?.data?.attachments && Array.isArray(sentEmail.data.attachments)) {
        attachmentIds = sentEmail.data.attachments.map((att: any) => att.id);
        console.log(`📎 ${attachmentIds.length} IDs d'attachments pour emails externes:`, attachmentIds);
      }

      // Envoyer à tous les destinataires externes via la nouvelle méthode
      const result = await emailjsService.sendEmailWithCcBcc(
        user.email || `${user.username}@eni.mg`,
        toExternal,
        emailData.subject,
        emailData.body,
        ccExternal.length > 0 ? ccExternal : undefined,
        bccExternal.length > 0 ? bccExternal : undefined,
        emailData.attachments
      );

      totalSuccess = result.success;
      totalFailed = result.failed;

      console.log(`📊 Résultat envoi externe: ${totalSuccess}/${allExternal.length} succès`);
      console.log("📋 Détails:", result.details);

      // NOUVEAU : Créer une copie inbox pour les utilisateurs de l'app qui ont un email externe
      await this.createInboxForExternalAppUsers(
        toExternal,
        ccExternal,
        bccExternal,
        emailData,
        user,
        attachmentIds
      );

      // Si il y a des échecs, créer une notification
      if (totalFailed > 0) {
        const failedEmails = result.details
          .filter((d: any) => d.status !== "success")
          .map((d: any) => d.recipient);
        
        await this.createFailureNotification(
          user,
          failedEmails,
          emailData.subject,
        );
      }

      console.log("✅ Traitement des emails externes terminé");
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi d'emails externes:", error);
      await this.createFailureNotification(user, allExternal, emailData.subject);
    }
  }

  // NOUVELLE MÉTHODE : Créer des emails inbox pour les utilisateurs de l'app avec emails externes
  private async createInboxForExternalAppUsers(
    toExternal: string[],
    ccExternal: string[],
    bccExternal: string[],
    emailData: ComposeEmailData,
    senderUser: StoredUser,
    attachmentIds: number[]
  ): Promise<void> {
    console.log("🔍 Recherche d'utilisateurs de l'app avec emails externes...");

    const allExternalEmails = [...toExternal, ...ccExternal, ...bccExternal];

    for (const externalEmail of allExternalEmails) {
      try {
        // Vérifier si cet email externe correspond à un utilisateur de l'app
        const recipientUser = await userService.getUserByEmail(externalEmail);

        if (recipientUser) {
          console.log(`👤 Utilisateur trouvé dans l'app avec email externe: ${externalEmail}`);

          // Déterminer le type de destinataire (TO, CC, BCC)
          const isTo = toExternal.includes(externalEmail);
          const isCc = ccExternal.includes(externalEmail);
          const isBcc = bccExternal.includes(externalEmail);

          // Préparer le message avec notice CC si c'est un destinataire TO ou CC
          let bodyForRecipient = emailData.body;
          
          if ((isTo || isCc) && (emailData.cc && emailData.cc.length > 0)) {
            const allCc = [...(emailData.cc || [])];
            const ccNames = allCc.join(", ");
            const plural = allCc.length > 1;
            
            const ccNotice = `ℹ️ Information : ${plural ? 'Les personnes suivantes ont' : 'La personne suivante a'} également reçu ce message en copie : ${ccNames}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            bodyForRecipient = ccNotice + emailData.body;
          }

          const inboxData: any = {
            from: senderUser.email || `${senderUser.username}@eni.mg`,
            to: emailData.to,
            cc: isBcc ? [] : (emailData.cc || []), // Ne pas exposer les CC aux BCC
            bcc: [], // Ne jamais exposer les BCC
            subject: emailData.subject,
            body: isBcc ? emailData.body : bodyForRecipient, // BCC sans notice CC
            folder: "inbox",
            isRead: false,
            user: recipientUser.id,
            sentAt: new Date().toISOString(),
            isStarred: false,
            isImportant: false,
          };

          // Ajouter les attachments
          if (attachmentIds.length > 0) {
            inboxData.attachments = attachmentIds;
            console.log(`📎 Ajout de ${attachmentIds.length} attachments à l'email inbox externe`);
          }

          const inboxPayload = { data: inboxData };
          console.log("📦 Création inbox pour utilisateur externe:", inboxPayload);

          await this.fetchApi<ApiResponse<Email>>("/emails", {
            method: "POST",
            body: JSON.stringify(inboxPayload),
          });

          console.log(`✅ Email inbox créé pour ${externalEmail} (utilisateur de l'app)`);
        } else {
          console.log(`📧 ${externalEmail} n'est pas un utilisateur de l'app (email externe seulement)`);
        }
      } catch (error) {
        console.error(`❌ Erreur lors de la création inbox pour ${externalEmail}:`, error);
      }
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
          isImportant: true,
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

      const emailData = email as any;
      const user = this.getStoredUser();
      
      const result = await emailjsService.sendMultipleExternalEmails(
        user.email || `${user.username}@eni.mg`,
        emailData.to || [],
        emailData.subject,
        emailData.body,
        emailData.cc || [],
        emailData.bcc || [],
      );

      console.log(`✅ Renvoi terminé: ${result.success} succès, ${result.failed} échecs`);
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