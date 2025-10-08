// services/emailjsService.ts
import emailjs from "@emailjs/browser";

// Configuration EmailJS
const EMAILJS_CONFIG = {
  SERVICE_ID: "service_36yv85c",
  TEMPLATE_ID: "template_xqyp0cr",
  PUBLIC_KEY: "SkC16Z_GcNqhLRQxJ",
};

// Interface pour les données d'email externe
interface ExternalEmailData {
  from: string;
  to: string;
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  attachments?: File[];
  isCcRecipient?: boolean; // Pour savoir si c'est un destinataire en CC
}

class EmailJSService {
  private isInitialized = false;

  private init() {
    if (!this.isInitialized) {
      emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
      this.isInitialized = true;
      console.log("📧 EmailJS initialisé");
    }
  }

  isExternalEmail(email: string): boolean {
    return !email.toLowerCase().endsWith("@eni.mg");
  }

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

  // Générer le message d'information CC
  private generateCcNotice(ccList: string[], primaryRecipient: string): string {
    if (!ccList || ccList.length === 0) return "";

    const otherRecipients = ccList.filter(email => email !== primaryRecipient);
    if (otherRecipients.length === 0) return "";

    const recipientNames = otherRecipients.join(", ");
    const plural = otherRecipients.length > 1;

    return `
<div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
  <p style="margin: 0; color: #1e40af; font-size: 14px;">
    ℹ️ <strong>Information :</strong> ${plural ? 'Les personnes suivantes ont' : 'La personne suivante a'} également reçu ce message en copie : ${recipientNames}
  </p>
</div>
    `.trim();
  }

  // Formater le message pour les emails externes
  private formatExternalMessage(emailData: ExternalEmailData): string {
    const ccNotice = emailData.isCcRecipient && emailData.cc 
      ? this.generateCcNotice(emailData.cc, emailData.to)
      : "";

    return `
${ccNotice}

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

      const templateParams = {
        from_email: "eni.service.reply@gmail.com",
        from_name: "ENI Service Mail",
        real_sender: emailData.from,
        original_subject: emailData.subject,
        to_email: emailData.to,
        subject: `[De: ${emailData.from}] ${emailData.subject}`,
        message: this.formatExternalMessage(emailData),
        attachments_html: this.generateAttachmentsHtml(emailData.attachments),
        cc_list: "",
        bcc_list: "",
      };

      console.log("📦 Template params:", templateParams);

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

  // Envoyer un email avec gestion CC/BCC
  async sendEmailWithCcBcc(
    from: string,
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    attachments?: File[]
  ): Promise<{ success: number; failed: number; details: any[] }> {
    let success = 0;
    let failed = 0;
    const details: any[] = [];

    console.log("📬 Envoi email avec CC/BCC");
    console.log("👤 De:", from);
    console.log("📧 À:", to);
    console.log("📋 CC:", cc);
    console.log("🔒 BCC:", bcc);

    // Liste de tous les destinataires (TO + CC + BCC)
    const allRecipients = [
      ...to,
      ...(cc || []),
      ...(bcc || [])
    ];

    console.log(`📨 Total destinataires: ${allRecipients.length}`);

    // Envoyer à chaque destinataire individuellement
    for (const recipient of allRecipients) {
      try {
        const isCcRecipient = cc?.includes(recipient) || false;
        const isBccRecipient = bcc?.includes(recipient) || false;

        console.log(`📤 Envoi à ${recipient} (CC: ${isCcRecipient}, BCC: ${isBccRecipient})`);

        const emailData: ExternalEmailData = {
          from,
          to: recipient,
          subject,
          body,
          cc: isCcRecipient ? [...to, ...(cc || [])] : undefined, // Inclure la liste CC pour les destinataires CC
          bcc: undefined, // Ne jamais exposer les BCC
          attachments,
          isCcRecipient: isCcRecipient,
        };

        const sent = await this.sendExternalEmail(emailData);
        
        if (sent) {
          success++;
          details.push({ recipient, status: "success", type: isBccRecipient ? "BCC" : isCcRecipient ? "CC" : "TO" });
          console.log(`✅ Envoi réussi à ${recipient}`);
        } else {
          failed++;
          details.push({ recipient, status: "failed", type: isBccRecipient ? "BCC" : isCcRecipient ? "CC" : "TO" });
          console.log(`❌ Échec envoi à ${recipient}`);
        }

        // Délai entre les envois pour éviter le rate limiting
        if (allRecipients.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        failed++;
        details.push({ recipient, status: "error", error: String(error) });
        console.error(`❌ Erreur envoi à ${recipient}:`, error);
      }
    }

    console.log(`📊 Résultats: ${success} succès, ${failed} échecs`);
    return { success, failed, details };
  }

  // Ancienne méthode conservée pour compatibilité
  async sendMultipleExternalEmails(
    from: string,
    recipients: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[]
  ): Promise<{ success: number; failed: number }> {
    const result = await this.sendEmailWithCcBcc(from, recipients, subject, body, cc, bcc);
    return { success: result.success, failed: result.failed };
  }

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