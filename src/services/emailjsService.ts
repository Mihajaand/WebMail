// services/emailjsService.ts
import emailjs from "@emailjs/browser";

// Configuration EmailJS
const EMAILJS_CONFIG = {
  SERVICE_ID: "service_36yv85c", // À configurer dans EmailJS
  TEMPLATE_ID: "template_xqyp0cr", // À configurer dans EmailJS
  PUBLIC_KEY: "SkC16Z_GcNqhLRQxJ", // Clé publique EmailJS
};

// Interface pour les données d'email externe
interface ExternalEmailData {
  from: string; // L'utilisateur interne (ex: volatiana@eni.mg)
  to: string; // L'email externe (ex: mihajamahefaandy@gmail.com)
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  attachments?: File[];
}

class EmailJSService {
  private isInitialized = false;

  // Initialiser EmailJS
  private init() {
    if (!this.isInitialized) {
      emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
      this.isInitialized = true;
      console.log("📧 EmailJS initialisé");
    }
  }

  // Vérifier si un email est externe (pas @eni.mg)
  isExternalEmail(email: string): boolean {
    return !email.toLowerCase().endsWith("@eni.mg");
  }

  // Séparer les emails internes et externes
  categorizeRecipients(recipients: string[]) {
    const internal: string[] = [];
    const external: string[] = [];

    recipients.forEach((email) => {
      if (this.isExternalEmail(email)) {
        external.push(email);
      } else {
        internal.push(email);
      }
    });

    return { internal, external };
  }

  // Générer le HTML des pièces jointes
  private generateAttachmentsHtml(attachments?: File[]): string {
    if (!attachments || attachments.length === 0) return "";

    const attachmentItems = attachments
      .map(
        (file) => `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin-bottom: 8px; display: flex; align-items: center;">
          <span style="margin-right: 10px; font-size: 36px;">⬇️</span>
          <span style="margin-top: 15px">${file.name}</span>
          <span style="color: #64748b; margin-left: 8px; font-size: 12px;">(${Math.round(file.size / 1024)}KB)</span>
        </div>
      `
      )
      .join("");

    return `
      <div style="margin-top: 25px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
        <h3 style="font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">📎 Pièces jointes :</h3>
        ${attachmentItems}
      </div>
    `;
  }

  // Formater le message pour les emails externes
  private formatExternalMessage(emailData: ExternalEmailData): string {
    return `
${emailData.body}

---
Ce message vous a été envoyé depuis le système de messagerie ENI.
Expéditeur original: ${emailData.from}
Pour répondre, contactez directement: ${emailData.from}

ENI - École Nationale d'Informatique
    `.trim();
  }

  // Envoyer un email externe via EmailJS
  async sendExternalEmail(emailData: ExternalEmailData): Promise<boolean> {
    try {
      this.init();

      console.log("📤 Envoi email externe via EmailJS:", emailData);

      // Template parameters pour EmailJS
      const templateParams = {
        // Expéditeur technique
        from_email: "eni.service.reply@gmail.com",
        from_name: "ENI Service Mail",

        // Expéditeur réel
        real_sender: emailData.from,
        original_subject: emailData.subject,

        // Destinataire externe
        to_email: emailData.to,

        // Objet modifié
        subject: `[De: ${emailData.from}] ${emailData.subject}`,

        // Corps du message + pièces jointes
        message: this.formatExternalMessage(emailData),
        attachments_html: this.generateAttachmentsHtml(emailData.attachments),

        // CC / BCC
        cc_list: emailData.cc?.join(", ") || "",
        bcc_list: emailData.bcc?.join(", ") || "",
      };

      console.log("📦 Template params:", templateParams);

      // Envoi via EmailJS
      const result = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams
      );

      console.log("✅ Email externe envoyé:", result);
      return result.status === 200;
    } catch (error) {
      console.error("❌ Erreur envoi email externe:", error);
      return false;
    }
  }

  // Envoyer plusieurs emails externes
  async sendMultipleExternalEmails(
    from: string,
    recipients: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[]
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    console.log(`📬 Envoi de ${recipients.length} emails externes`);

    for (const recipient of recipients) {
      const emailData: ExternalEmailData = { from, to: recipient, subject, body, cc, bcc };
      const sent = await this.sendExternalEmail(emailData);
      sent ? success++ : failed++;

      // Délai entre les envois
      if (recipients.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`📊 Résultats envoi externe: ${success} succès, ${failed} échecs`);
    return { success, failed };
  }

  // Créer un email de notification d'échec
  createFailureNotification(
    originalSender: string,
    failedRecipients: string[],
    originalSubject: string
  ) {
    return {
      to: [originalSender],
      subject: `Échec d'envoi: ${originalSubject}`,
      body: `
Votre email n'a pas pu être délivré aux destinataires suivants:

${failedRecipients.map((email) => `- ${email}`).join("\n")}

Objet original: ${originalSubject}

Veuillez vérifier les adresses email et réessayer.

Système de messagerie ENI
      `.trim(),
    };
  }
}

export const emailjsService = new EmailJSService();
