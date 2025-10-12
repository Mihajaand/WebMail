import { useState } from "react";
import { Mail } from "lucide-react";
import { useEmails } from "../hooks/useEmails";
import type { Email } from "../types/email";
import Sidebar from "../components/Sidebar";
import EmailList from "../components/EmailList";
import EmailViewer from "../components/EmailViewer";
import ComposeModal from "../components/ComposeModal";
import EmailDiagnostic from "../components/EmailDiagnostic";
import Support from "./../pages/Support";
import { emailService } from "../services/emailService";
// Types locaux pour éviter les erreurs d'import
interface ComposeEmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
}

interface DraftData extends ComposeEmailData {
  id?: string;
  forwardedAttachments?: any[];
}

interface GmailCloneProps {
  user: {
    username: string;
    email: string;
    [key: string]: any;
  };
}

const GmailClone = ({ user }: GmailCloneProps) => {
  const [currentFolder, setCurrentFolder] = useState("inbox");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [showEmailList, setShowEmailList] = useState(true);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [draftToEdit, setDraftToEdit] = useState<DraftData | null>(null);
  const [showSupport, setShowSupport] = useState(false);
  // Pour les messages suivis, on utilise le dossier inbox par défaut
  // Pour les brouillons, on mappe "drafts" vers "draft" pour l'API
  const folderForHook =
    currentFolder === "starred"
      ? "inbox"
      : currentFolder === "drafts"
        ? "draft"
        : currentFolder;

  const {
    emails: rawEmails,
    loading,
    error,
    sendEmail,
    saveDraft,
    toggleStar,
    moveToFolder,
    refresh,
    markAsRead,
  } = useEmails(folderForHook);

  // Logique de filtrage des emails améliorée
  const getFilteredEmails = () => {
    let filteredEmails: Email[] = [];

    switch (currentFolder) {
      case "starred":
        // Pour les messages suivis : seulement les emails étoilés de la boîte de réception
        filteredEmails = rawEmails.filter(
          (email) => email.isStarred === true && email.folder === "inbox",
        );
        break;
      case "inbox":
        filteredEmails = rawEmails.filter((email) => email.folder === "inbox");
        break;
      case "sent":
        filteredEmails = rawEmails.filter((email) => email.folder === "sent");
        break;
      case "drafts":
        filteredEmails = rawEmails.filter((email) => email.folder === "draft");
        break;
      case "trash":
        filteredEmails = rawEmails.filter((email) => email.folder === "trash");
        break;
      default:
        filteredEmails = rawEmails.filter(
          (email) => email.folder === currentFolder,
        );
        break;
    }

    // Appliquer le filtre de recherche
    if (searchQuery) {
      filteredEmails = filteredEmails.filter(
        (email) =>
          email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
          email.body.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    return filteredEmails;
  };

  const currentEmails = getFilteredEmails();

  // Calcul des compteurs pour chaque dossier
  const getEmailCount = (folderId: string) => {
    switch (folderId) {
      case "inbox":
        return rawEmails.filter((e) => e.folder === "inbox" && !e.isRead)
          .length;
      case "starred":
        return rawEmails.filter((e) => e.isStarred).length;
      case "sent":
        return rawEmails.filter((e) => e.folder === "sent").length;
      case "drafts":
        return rawEmails.filter((e) => e.folder === "draft").length;
      case "trash":
        return rawEmails.filter((e) => e.folder === "trash").length;
      default:
        return 0;
    }
  };

  // Debug complet
  console.log("=== DEBUG EMAILS ===");
  console.log("👤 Utilisateur actuel:", user);
  console.log("📁 Dossier actuel:", currentFolder);
  console.log("📁 Dossier pour hook:", folderForHook);
  console.log("📧 Tous les emails bruts:", rawEmails);
  console.log("📊 Nombre total emails bruts:", rawEmails.length);
  console.log("🎯 Emails filtrés pour affichage:", currentEmails);
  console.log("📊 Nombre emails affichés:", currentEmails.length);
  console.log("⏳ Loading:", loading);
  console.log("❌ Error:", error);

  if (currentFolder === "starred") {
    console.log("⭐ STARRED DEBUG:");
    console.log(
      "Emails étoilés:",
      rawEmails.filter((e) => e.isStarred),
    );
    rawEmails.forEach((email, index) => {
      console.log(
        `Email ${index}: isStarred=${email.isStarred}, folder=${email.folder}, subject=${email.subject}`,
      );
    });
  }

  const toggleEmailSelection = (emailId: string) => {
    setSelectedEmails((prev) =>
      prev.includes(emailId)
        ? prev.filter((id) => id !== emailId)
        : [...prev, emailId],
    );
  };

  const handleSendEmail = async (
    emailData: ComposeEmailData,
  ): Promise<boolean> => {
    console.log("📤 Composing email:", emailData);

    // Si c'est l'envoi d'un brouillon, noter l'ID pour suppression après envoi
    const draftIdToDelete = draftToEdit?.id;

    const success = await sendEmail(emailData);
    if (success) {
      console.log("✅ Email sent successfully!");

      // Si c'était un brouillon, le supprimer après envoi réussi
      if (draftIdToDelete) {
        try {
          console.log(
            `🗑️ Suppression du brouillon après envoi: ${draftIdToDelete}`,
          );
          await moveToFolder(draftIdToDelete, "trash");
          console.log("✅ Brouillon supprimé après envoi");
        } catch (error) {
          console.error(
            "❌ Erreur lors de la suppression du brouillon:",
            error,
          );
          // L'erreur n'empêche pas l'envoi réussi
        }
      }

      setShowCompose(false);
      setDraftToEdit(null); // Reset draft data

      setCurrentFolder("sent");
      setSelectedEmail(null);
      setShowEmailList(true);
      return true;
    } else {
      console.error("❌ Failed to send email");
      return false;
    }
  };

  const handleSaveDraft = async (draftData: DraftData): Promise<boolean> => {
    console.log("💾 Saving draft:", draftData);

    const success = await saveDraft(draftData);
    if (success) {
      console.log("✅ Draft saved successfully!");
      setShowCompose(false);
      setDraftToEdit(null); // Reset draft data

      // Rediriger vers les brouillons pour voir le brouillon sauvegardé
      setCurrentFolder("drafts");
      setSelectedEmail(null);
      setShowEmailList(true);
      return true;
    } else {
      console.error("❌ Failed to save draft");
      return false;
    }
  };

  const handleFolderChange = (folderId: string) => {
    console.log(`📁 Switching to folder: ${folderId}`);
    setCurrentFolder(folderId);
    setSelectedEmail(null);
    setShowEmailList(true);
  };
 const markAsUnread = async (id: string | number) => {
    try {
      console.log(`📧 Marquage de l'email ${id} comme non lu...`);
      
      // Appel direct à l'API emailService avec isRead: false
      await emailService.markAsRead(String(id), false);
      
      console.log("✅ Email marqué comme non lu dans la base de données");

      // Mettre à jour l'état local immédiatement
      setSelectedEmail(prev =>
        prev && prev.id === id ? { ...prev, isRead: false } : prev
      );

      // Rafraîchir la liste pour voir le changement
      await refresh();
      
      console.log("✅ Liste rafraîchie");

    } catch (err) {
      console.error("❌ Erreur markAsUnread:", err);
    }
  };



  const handleEmailSelect = async (email: Email) => {
    console.log("📖 Opening email:", email);
    
    // Debug des attachments
    if (email.attachments && email.attachments.length > 0) {
      console.log("📎 Attachments de l'email:", email.attachments);
      email.attachments.forEach((att, idx) => {
        console.log(`📎 Attachment ${idx}:`, {
          name: att.name,
          size: att.size,
          allProps: Object.keys(att),
          fullObject: att
        });
      });
    }

    if (email.folder === "draft") {
      const draftData: DraftData = {
        id: email.id,
        to: Array.isArray(email.to) ? email.to : [email.to].filter(Boolean),
        cc: Array.isArray(email.cc) ? email.cc : email.cc ? [email.cc] : [],
        bcc: Array.isArray(email.bcc) ? email.bcc : email.bcc ? [email.bcc] : [],
        subject: email.subject || "",
        body: email.body || "",
      };

      setDraftToEdit(draftData);
      setShowCompose(true);
      return;
    }

    // Marquer comme lu
    if (!email.isRead) {
      await markAsRead(email.id);
    }

    setSelectedEmail({ ...email, isRead: true });
    setShowEmailList(false);
  };

  const handleNewCompose = () => {
    setDraftToEdit(null); // Reset draft data pour un nouveau message
    setShowCompose(true);
  };

  const handleCloseCompose = () => {
    setShowCompose(false);
    setDraftToEdit(null); // Reset draft data
  };

  // Gérer la réponse à un email
  const handleReply = (emailData: { to: string; subject: string; body: string }) => {
    console.log("💬 Réponse à l'email:", emailData);
    
    setDraftToEdit({
      to: [emailData.to],
      subject: emailData.subject,
      body: emailData.body,
    });
    
    setShowCompose(true);
    setSelectedEmail(null);
    setShowEmailList(false);
  };

  // Gérer le transfert d'un email
  const handleForward = (emailData: { subject: string; body: string; attachments?: any[] }) => {
    console.log("➡️ Transfert de l'email:", emailData);
    console.log("📎 Pièces jointes à transférer:", emailData.attachments);
    
    setDraftToEdit({
      to: [],
      subject: emailData.subject,
      body: emailData.body,
      forwardedAttachments: emailData.attachments || [],
    });
    
    setShowCompose(true);
    setSelectedEmail(null);
    setShowEmailList(false);
  };
const handleEmptyTrash = async (): Promise<void> => {
    try {
      console.log(`🗑️ Début du vidage de la corbeille...`);

      // Récupérer tous les emails de la corbeille depuis l'API
      const trashEmailsResponse = await emailService.getEmails("trash", 1);
      const emailsToDelete = trashEmailsResponse.data || [];

      if (emailsToDelete.length === 0) {
        console.log("ℹ️ La corbeille est déjà vide");
        alert("La corbeille est déjà vide.");
        return;
      }

      console.log(`📊 ${emailsToDelete.length} emails à supprimer définitivement`);
      console.log(`📋 IDs à supprimer:`, emailsToDelete.map(e => e.id));

      let deletedCount = 0;
      let failedCount = 0;
      const failedEmails: string[] = [];

      // Supprimer chaque email de la corbeille un par un
      for (const email of emailsToDelete) {
        try {
          const emailId = String(email.id);
          console.log(`\n🗑️ Tentative de suppression DÉFINITIVE de l'email ${emailId}...`);
          
          await emailService.deleteEmail(emailId);
          
          deletedCount++;
          //console.log(`✅ Email ${emailId} supprimé DÉFINITIVEMENT (${deletedCount}/${emailsToDelete.length})`);
          
          // Petit délai pour éviter de surcharger l'API
          await new Promise(resolve => setTimeout(resolve, 150));
          
        } catch (error) {
          console.error(`❌ Erreur suppression email ${email.id}:`, error);
          failedCount++;
          failedEmails.push(`${email.subject} (ID: ${email.id})`);
        }
      }

      console.log(`\n✅ Vidage terminé: ${deletedCount} supprimés, ${failedCount} échecs`);

      // Afficher un message détaillé à l'utilisateur
      if (failedCount === 0) {
        console.log(
          `✅ Corbeille vidée avec succès !\n\n${deletedCount} email(s) supprimé(s) DÉFINITIVEMENT de la base de données.`
        );
      } else {
        const failedList = failedEmails.join('\n');
        console.log(
          `⚠️ Vidage terminé avec des erreurs.\n\n✅ Supprimés: ${deletedCount}\n❌ Échecs: ${failedCount}\n\nEmails non supprimés:\n${failedList}`
        );
      }

      // Vider immédiatement la liste locale pour feedback instantané
      setSelectedEmail(null);
      setShowEmailList(true);
      
      console.log("🔄 Attente avant rafraîchissement...");
      
      // Attendre un peu plus longtemps pour que Strapi nettoie son cache
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log("🔄 Rafraîchissement de la corbeille...");
      
      // Forcer plusieurs rafraîchissements pour contourner le cache
      await refresh();
      
      // Second refresh après un délai supplémentaire
      setTimeout(async () => {
        console.log("🔄 Second rafraîchissement...");
        await refresh();
        
        // Vérifier si la corbeille est vraiment vide
        const verifyResponse = await emailService.getEmails("trash", 1);
        const remainingEmails = verifyResponse.data?.length || 0;
        
        if (remainingEmails > 0) {
          console.warn(`⚠️ ATTENTION: ${remainingEmails} emails encore présents dans la corbeille après suppression!`);
          console.warn("Cela peut être dû au cache de Strapi ou à un soft delete.");
        } else {
          console.log("✅ Corbeille confirmée vide!");
        }
        
        console.log("✅ Interface rafraîchie");
      }, 1000);

    } catch (error) {
      console.error("❌ Erreur globale lors du vidage de la corbeille:", error);
      alert(`Une erreur est survenue lors de la suppression des emails:\n${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
  <div className="flex h-screen bg-gray-50">
    {/* Support Page */}
    {showSupport ? (
      <Support 
        onBack={() => setShowSupport(false)} 
        userEmail={user.email}
      />
    ) : (
      <>
        {/* Sidebar */}
        <Sidebar
          user={user}
          currentFolder={currentFolder}
          rawEmails={rawEmails}
          getEmailCount={getEmailCount}
          showEmailList={showEmailList}
          onFolderChange={handleFolderChange}
          onShowCompose={handleNewCompose}
          onShowDiagnostic={() => setShowDiagnostic(true)}
          onEmptyTrash={handleEmptyTrash}
        />

        {/* Email List */}
        <EmailList
          currentFolder={currentFolder}
          currentEmails={currentEmails}
          selectedEmail={selectedEmail}
          selectedEmails={selectedEmails}
          searchQuery={searchQuery}
          loading={loading}
          error={error}
          showEmailList={showEmailList}
          rawEmails={rawEmails}
          onSearchChange={setSearchQuery}
          onEmailSelect={handleEmailSelect}
          onEmailToggleSelect={toggleEmailSelection}
          onToggleStar={toggleStar}
          onRefresh={refresh}
          getEmailCount={getEmailCount}
        />

        {/* Email Content */}
        {selectedEmail ? (
          <EmailViewer
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
            onToggleStar={(id) => toggleStar(String(id))}
            onMoveToFolder={async (id, folder) => {
              try {
                console.log(
                  `🗑️ Tentative de déplacement de l'email ${id} vers ${folder}...`,
                );
                await moveToFolder(String(id), folder);
                console.log("✅ Déplacement réussi");

                if (folder === "trash") {
                  console.log("📤 Email déplacé vers la corbeille");
                  // Mettre à jour l'interface après confirmation du backend
                  setSelectedEmail(null);
                  setShowEmailList(true);

                  // Forcer un rafraîchissement pour mettre à jour les listes d'emails
                  if (currentFolder === "trash") {
                    // Si on est dans la corbeille, recharger la corbeille
                    setCurrentFolder("trash");
                    refresh();
                  } else {
                    // Sinon, juste rafraîchir la vue actuelle
                    refresh();
                  }
                }
              } catch (error) {
                console.error(
                  "❌ Erreur lors du déplacement vers la corbeille:",
                  error,
                );
                // Afficher une erreur à l'utilisateur si nécessaire
              }
            }}
            onMarkAsUnread={markAsUnread}
            onReply={handleReply}
            onForward={handleForward}
            onShowSupport={() => setShowSupport(true)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <Mail className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <h3 className="mb-2 text-lg font-medium">Webmail ENI</h3>
              <p>
                {currentFolder === "drafts"
                  ? "Sélectionnez un brouillon pour le modifier"
                  : "Sélectionnez un email pour le lire"}
              </p>
              {currentFolder === "drafts" && (
                <p className="mt-2 text-sm text-gray-400">
                  Les brouillons s'ouvrent en mode édition
                </p>
              )}
              <div className="mt-4 text-xs text-gray-400">
                <p>
                  👤 Utilisateur: {user.username} ({user.email})
                </p>
                <p>📁 Dossier Actif: {currentFolder}</p>
                <p>📊 {rawEmails.length} emails au total</p>
              </div>
            </div>
          </div>
        )}

        {/* Compose Modal */}
        {showCompose && (
          <ComposeModal
            onClose={handleCloseCompose}
            onSend={handleSendEmail}
            onSaveDraft={handleSaveDraft}
            draftData={draftToEdit}
          />
        )}

        {/* Email Diagnostic */}
        <EmailDiagnostic
          showDiagnostic={showDiagnostic}
          onClose={() => setShowDiagnostic(false)}
          onRefresh={refresh}
        />
      </>
    )}
  </div>
);
};

export default GmailClone;