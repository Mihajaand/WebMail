// services/emailService.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_STRAPI_URL || "http://localhost:1337/api";
export type ComposeEmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: File[];
}
export const emailService = {
  async getEmails(folder: string, page: number = 1) {
    const res = await axios.get(`${API_URL}/emails`, {
      params: {
        filters: { folder },
        populate: ["attachments"],
        pagination: { page, pageSize: 50 },
        sort: ["sentAt:desc"],
      },
    });
    return res.data;
  },

  async sendEmail(emailData: any) {
    try {
      console.log("📤 Envoi de l'email avec pièces jointes :", emailData);

      // 1️⃣ Upload des fichiers s’il y en a
      let uploadedAttachments: any[] = [];

      if (emailData.attachments && emailData.attachments.length > 0) {
        const formData = new FormData();
        emailData.attachments.forEach((file: File) => {
          formData.append("files", file);
        });

        const uploadResponse = await axios.post(`${API_URL}/upload`, formData);
        uploadedAttachments = uploadResponse.data;
        console.log("✅ Fichiers uploadés :", uploadedAttachments);
      }

      // 2️⃣ Création du mail dans “envoyés”
      const sentPayload = {
        data: {
          from: "me@exemple.com", // tu peux remplacer par user.email si dispo
          to: emailData.to,
          cc: emailData.cc || [],
          bcc: emailData.bcc || [],
          subject: emailData.subject,
          body: emailData.body,
          folder: "sent",
          attachments: uploadedAttachments.map((a) => a.id), // ✅ On lie les pièces
          isStarred: false,
          isRead: true,
          sentAt: new Date().toISOString(),
        },
      };

      const sentResponse = await axios.post(`${API_URL}/emails`, sentPayload);
      console.log("📨 Mail envoyé dans 'Envoyés' :", sentResponse.data);

      // 3️⃣ Duplication dans “inbox” du destinataire
      const inboxPayload = {
        data: {
          from: "me@exemple.com",
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          folder: "inbox",
          attachments: uploadedAttachments.map((a) => a.id), // ✅ Copie des fichiers ici aussi
          isStarred: false,
          isRead: false,
          sentAt: new Date().toISOString(),
        },
      };

      const inboxResponse = await axios.post(`${API_URL}/emails`, inboxPayload);
      console.log("📥 Copie du mail dans 'Inbox' :", inboxResponse.data);

      return {
        sent: sentResponse.data,
        inbox: inboxResponse.data,
      };
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi de l'email :", error);
      throw error;
    }
  },

  async saveDraft(draftData: any) {
    const payload = {
      data: {
        ...draftData,
        folder: "draft",
      },
    };
    const res = await axios.post(`${API_URL}/emails`, payload);
    return res.data;
  },

  async toggleStar(id: string, isStarred: boolean) {
    const res = await axios.put(`${API_URL}/emails/${id}`, {
      data: { isStarred },
    });
    return res.data;
  },

  async moveToFolder(id: string, targetFolder: string) {
    const res = await axios.put(`${API_URL}/emails/${id}`, {
      data: { folder: targetFolder },
    });
    return res.data;
  },

  async deleteEmail(id: string) {
    await axios.delete(`${API_URL}/emails/${id}`);
  },

  async markAsRead(id: string) {
    await axios.put(`${API_URL}/emails/${id}`, { data: { isRead: true } });
  },
};
