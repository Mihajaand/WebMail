import { useState } from "react";
import { Mail } from "lucide-react";
import { useEmails } from "../hooks/useEmails";
import type { Email } from "../types/email";
import Sidebar from "../components/Sidebar";
import EmailList from "../components/EmailList";
import EmailViewer from "../components/EmailViewer";
import ComposeModal from "../components/ComposeModal";
import EmailDiagnostic from "../components/EmailDiagnostic";

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

  const handleEmailSelect = (email: Email) => {
    console.log("📖 Opening email:", email);

    // Si c'est un brouillon, l'ouvrir en mode édition
    if (email.folder === "draft") {
      console.log("📝 Opening draft for editing:", email);

      const draftData: DraftData = {
        id: email.id,
        to: email.to || [],
        cc: email.cc || [],
        bcc: email.bcc || [],
        subject: email.subject || "",
        body: email.body || "",
      };

      setDraftToEdit(draftData);
      setShowCompose(true);
    } else {
      // Email normal, l'ouvrir en lecture
      setSelectedEmail(email);
      setShowEmailList(false);
    }
  };

  const handleNewCompose = () => {
    setDraftToEdit(null); // Reset draft data pour un nouveau message
    setShowCompose(true);
  };

  const handleCloseCompose = () => {
    setShowCompose(false);
    setDraftToEdit(null); // Reset draft data
  };

  return (
    <div className="flex h-screen bg-gray-50">
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
    </div>
  );
};

export default GmailClone;
