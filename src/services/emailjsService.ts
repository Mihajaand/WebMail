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
  from: string; // L'utilisateur interne (volatiana@eni.mg)
  to: string; // L'email externe (mihajamahefaandy@gmail.com)
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
}

class EmailJSService {
  private isInitialized = false;

  // Initialiser EmailJS
  init() {
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

  // Envoyer un email externe via EmailJS
  async sendExternalEmail(emailData: ExternalEmailData): Promise<boolean> {
    try {
      this.init();

      console.log("📤 Envoi email externe via EmailJS:", emailData);

      // Template parameters pour EmailJS
      const templateParams = {
        // Email de service comme expéditeur technique
        from_email: "eni.service.reply@gmail.com",
        from_name: "ENI Service Mail",

        // Email du vrai expéditeur dans l'objet
        real_sender: emailData.from,
        original_subject: emailData.subject,

        // Destinataire externe
        to_email: emailData.to,

        // Objet modifié avec l'expéditeur réel
        subject: `[De: ${emailData.from}] ${emailData.subject}`,

        // Corps du message avec signature
        message: this.formatExternalMessage(emailData),

        // Métadonnées
        cc_list: emailData.cc?.join(", ") || "",
        bcc_list: emailData.bcc?.join(", ") || "",
      };

      console.log("📦 Template params:", templateParams);

      // Envoyer via EmailJS
      const result = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams,
      );

      console.log("✅ Email externe envoyé:", result);
      return result.status === 200;
    } catch (error) {
      console.error("❌ Erreur envoi email externe:", error);
      return false;
    }
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

  // Envoyer plusieurs emails externes
  async sendMultipleExternalEmails(
    from: string,
    recipients: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    console.log(`📬 Envoi de ${recipients.length} emails externes`);

    for (const recipient of recipients) {
      const emailData: ExternalEmailData = {
        from,
        to: recipient,
        subject,
        body,
        cc,
        bcc,
      };

      const sent = await this.sendExternalEmail(emailData);
      if (sent) {
        success++;
      } else {
        failed++;
      }

      // Délai entre les envois pour éviter le spam
      if (recipients.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(
      `📊 Résultats envoi externe: ${success} succès, ${failed} échecs`,
    );
    return { success, failed };
  }

  // Créer un email de notification pour les échecs d'envoi externe
  createFailureNotification(
    originalSender: string,
    failedRecipients: string[],
    originalSubject: string,
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
