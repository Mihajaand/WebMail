import { useState } from "react";
import {
  Mail,
  Send,
  Inbox,
  Star,
  Trash2,
  Archive,
  Search,
  Plus,
  Paperclip,
  MoreVertical,
  ChevronLeft,
  Settings,
  Edit3,
  X,
  AlertCircle,
  RefreshCw,
  Bug,
} from "lucide-react";
import { useEmails } from "../hooks/useEmails"; // ton hook
import type { Email } from "../types/email";
import type { ComposeEmailData } from "../types/api";
import { emailService } from "../services/emailService";

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

  const {
    emails,
    loading,
    error,
    sendEmail,
    markAsRead,
    toggleStar,
    moveToFolder,
    refresh,
  } = useEmails(currentFolder);

  const folders = [
    {
      id: "inbox",
      name: "Boîte de réception",
      icon: Inbox,
      count: emails.filter((e) => e.folder === "inbox" && !e.isRead).length,
    },
    {
      id: "starred",
      name: "Messages suivis",
      icon: Star,
      count: emails.filter((e) => e.isStarred).length,
    },
    {
      id: "sent",
      name: "Messages envoyés",
      icon: Send,
      count: emails.filter((e) => e.folder === "sent").length,
    },
    { id: "drafts", name: "Brouillons", icon: Edit3, count: 0 },
    {
      id: "trash",
      name: "Corbeille",
      icon: Trash2,
      count: emails.filter((e) => e.folder === "trash").length,
    },
  ];

  const currentEmails = emails
    .filter((email) =>
      currentFolder === "starred"
        ? email.isStarred
        : email.folder === currentFolder,
    )
    .filter(
      (email) =>
        searchQuery === "" ||
        email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.body.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  // ✅ DEBUG COMPLET - Maintenant après la définition de currentEmails
  console.log("=== DEBUG EMAILS ===");
  console.log("👤 Utilisateur actuel:", user);
  console.log("📁 Dossier actuel:", currentFolder);
  console.log("📧 Tous les emails récupérés:", emails);
  console.log("📊 Nombre total emails:", emails.length);
  console.log("🎯 Emails filtrés pour affichage:", currentEmails);
  console.log("📊 Nombre emails affichés:", currentEmails.length);
  console.log("⏳ Loading:", loading);
  console.log("❌ Error:", error);

  // DEBUG DÉTAILLÉ : Voir la structure des emails
  if (emails.length > 0) {
    console.log("🔍 Premier email:", emails[0]);
    console.log("🔑 Propriétés du premier email:", Object.keys(emails[0]));

    emails.forEach((email, index) => {
      console.log(
        `📧 Email ${index + 1} - ID: ${email.id}, folder: "${email.folder}", from: "${email.from}", to: "${email.to}"`,
      );
    });
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Hier";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("fr-FR", { weekday: "short" });
    } else {
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      });
    }
  };

  const toggleEmailSelection = (emailId: string) => {
    setSelectedEmails((prev) =>
      prev.includes(emailId)
        ? prev.filter((id) => id !== emailId)
        : [...prev, emailId],
    );
  };

  const getInitial = (str?: string) =>
    str && str.length > 0 ? str.charAt(0).toUpperCase() : "U";

  // ✅ NOUVEAU: Fonctions de diagnostic
  const createTestEmail = async () => {
    try {
      await emailService.createTestEmail();
      setTimeout(() => refresh(), 1000); // Attendre et rafraîchir
    } catch (error) {
      console.error("Erreur création email de test:", error);
    }
  };

  const EmailDiagnostic = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<string[]>([]);

    const addResult = (message: string) => {
      setResults((prev) => [
        ...prev,
        `${new Date().toLocaleTimeString()}: ${message}`,
      ]);
    };

    const clearResults = () => {
      setResults([]);
    };

    const runDiagnostic = async () => {
      setIsRunning(true);
      clearResults();

      addResult("🚀 Début du diagnostic...");

      try {
        // Test 1: Récupérer tous les emails
        addResult("📋 Test 1: Récupération inbox");
        await emailService.getEmails("inbox", 1);
        addResult("✅ Test 1 terminé (voir console)");

        // Test 2: Créer un email de test
        addResult("📧 Test 2: Création email de test");
        await emailService.createTestEmail();
        addResult("✅ Test 2 terminé");

        // Test 3: Re-récupérer après création
        addResult("🔄 Test 3: Re-récupération");
        await emailService.getEmails("inbox", 1);
        addResult("✅ Test 3 terminé");
      } catch (error: any) {
        addResult(`❌ Erreur: ${error.message}`);
      } finally {
        setIsRunning(false);
        addResult("🏁 Diagnostic terminé");
      }
    };

    return showDiagnostic ? (
      <div className="fixed top-4 right-4 z-50 max-h-96 w-96 rounded-lg border-2 border-blue-500 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b bg-blue-500 p-4 text-white">
          <h3 className="font-bold">🔧 Diagnostic Email</h3>
          <button onClick={() => setShowDiagnostic(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4 space-y-2">
            <button
              onClick={runDiagnostic}
              disabled={isRunning}
              className="w-full rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isRunning ? "🔄 En cours..." : "🚀 Diagnostic Complet"}
            </button>

            <button
              onClick={createTestEmail}
              disabled={isRunning}
              className="w-full rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isRunning ? "🔄 En cours..." : "📧 Créer Email Test"}
            </button>

            <button
              onClick={clearResults}
              className="w-full rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
            >
              🗑️ Effacer Résultats
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto rounded bg-gray-100 p-2 text-xs">
            {results.length === 0 ? (
              <p className="text-gray-500 italic">Aucun résultat</p>
            ) : (
              results.map((result, index) => (
                <div key={index} className="mb-1 font-mono">
                  {result}
                </div>
              ))
            )}
          </div>

          <div className="mt-2 text-xs text-gray-500">
            💡 Regardez la console pour plus de détails
          </div>
        </div>
      </div>
    ) : null;
  };

  const ComposeModal = () => {
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
      setSending(true);

      const newEmailData: ComposeEmailData = {
        to: to.split(",").map((e) => e.trim()),
        subject,
        body,
        folder: "sent",
        isRead: true,
        sentAt: new Date().toISOString(),
        from: user.email || user.username,
      };

      console.log("📤 Composing email:", newEmailData);

      const success = await sendEmail(newEmailData);
      if (success) {
        console.log("✅ Email sent successfully!");
        setShowCompose(false);
        setTo("");
        setSubject("");
        setBody("");

        // ✅ Basculer vers le dossier "sent" après envoi réussi
        setCurrentFolder("sent");
        setSelectedEmail(null);
        setShowEmailList(true);
      } else {
        console.error("❌ Failed to send email");
      }

      setSending(false);
    };

    return (
      <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold">Nouveau message</h2>
            <button onClick={() => setShowCompose(false)} disabled={sending}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-sm text-gray-600">À</label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="destinataire@eni.mg"
                  disabled={sending}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Objet
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  disabled={sending}
                />
              </div>
            </div>

            <div className="flex-1 px-4 pb-4">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="h-full min-h-[200px] w-full resize-none rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Rédigez votre message..."
                disabled={sending}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t p-4">
            <div className="flex items-center space-x-2">
              <button
                className="rounded p-2 hover:bg-gray-100"
                disabled={sending}
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCompose(false)}
                className="rounded-md px-4 py-2 text-gray-600 hover:bg-gray-100"
                disabled={sending}
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={!to || !subject || sending}
                className="flex items-center space-x-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>{sending ? "Envoi..." : "Envoyer"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const EmailViewer = ({ email }: { email: Email }) => {
    if (!email.isRead) markAsRead(email.id, true);

    return (
      <div className="flex flex-1 flex-col bg-white">
        <div className="border-b p-4">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setSelectedEmail(null)}
              className="rounded p-2 hover:bg-gray-100 md:hidden"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleStar(email.id)}
                className={`rounded p-2 hover:bg-gray-100 ${email.isStarred ? "text-yellow-500" : ""}`}
              >
                <Star
                  className={`h-5 w-5 ${email.isStarred ? "fill-current" : ""}`}
                />
              </button>
              <button
                className="rounded p-2 hover:bg-gray-100"
                onClick={() => moveToFolder(email.id, "archive")}
              >
                <Archive className="h-5 w-5" />
              </button>
              <button
                className="rounded p-2 hover:bg-gray-100"
                onClick={() => moveToFolder(email.id, "trash")}
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button className="rounded p-2 hover:bg-gray-100">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div>
            <h1 className="mb-3 text-xl font-semibold">{email.subject}</h1>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 font-semibold text-white">
                  {getInitial(email.from)}
                </div>
                <div>
                  <div className="font-medium">{email.from}</div>
                  <div className="text-sm text-gray-600">
                    à {Array.isArray(email.to) ? email.to.join(", ") : email.to}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {formatDate(email.sentAt)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="leading-relaxed whitespace-pre-wrap text-gray-900">
            {email.body}
          </div>
        </div>

        <div className="border-t p-4">
          <button className="flex items-center space-x-2 rounded-md px-4 py-2 text-blue-600 hover:bg-blue-50">
            <ChevronLeft className="h-4 w-4" />
            <span>Répondre</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${showEmailList ? "hidden md:flex" : "flex"} w-64 flex-col border-r bg-white`}
      >
        <div className="p-4">
          <button
            onClick={() => setShowCompose(true)}
            className="flex w-full items-center justify-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau message</span>
          </button>
        </div>

        <nav className="flex-1 px-2">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => {
                console.log(`📁 Switching to folder: ${folder.id}`);
                setCurrentFolder(folder.id);
                setSelectedEmail(null);
                setShowEmailList(true);
              }}
              className={`mb-1 flex w-full items-center space-x-3 rounded-lg px-3 py-2 hover:bg-gray-100 ${
                currentFolder === folder.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700"
              }`}
            >
              <folder.icon className="h-5 w-5" />
              <span className="flex-1 text-left">{folder.name}</span>
              {folder.count > 0 && (
                <span className="rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-700">
                  {folder.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t p-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-blue-600 font-semibold text-white">
              {getInitial(user.username)}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">
                {user.username || "Utilisateur"}
              </div>
              <div className="text-xs text-gray-600">{user.email}</div>
            </div>
            <button className="rounded p-1 hover:bg-gray-100">
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowDiagnostic(true)}
              className="rounded p-1 hover:bg-gray-100"
              title="Diagnostic"
            >
              <Bug className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("user");
              localStorage.removeItem("jwt");
              window.location.reload();
            }}
            className="mt-2 w-full rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Email List */}
      <div
        className={`${selectedEmail ? "hidden md:flex" : "flex"} ${showEmailList ? "flex" : "hidden md:flex"} w-full flex-col border-r bg-white md:w-80 lg:w-96`}
      >
        <div className="border-b p-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans les emails"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border py-2 pr-4 pl-10 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              {folders.find((f) => f.id === currentFolder)?.name}
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {currentEmails.length} email
                {currentEmails.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => {
                  console.log("🔄 Manual refresh requested");
                  refresh();
                }}
                className="rounded p-1 hover:bg-gray-100"
                title="Actualiser"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-gray-500">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Chargement...
            </div>
          ) : error ? (
            <div className="flex h-64 flex-col items-center justify-center text-red-500">
              <AlertCircle className="mb-2 h-8 w-8" />
              <p className="text-center">Erreur: {error}</p>
              <button
                onClick={refresh}
                className="mt-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Réessayer
              </button>
            </div>
          ) : currentEmails.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-gray-500">
              <Mail className="mb-4 h-12 w-12" />
              <p className="text-center">
                {searchQuery
                  ? "Aucun email trouvé"
                  : `Aucun email dans ${folders.find((f) => f.id === currentFolder)?.name?.toLowerCase()}`}
              </p>
              {currentFolder === "inbox" && (
                <p className="mt-2 text-center text-xs text-gray-400">
                  Les emails reçus apparaîtront ici
                </p>
              )}
            </div>
          ) : (
            currentEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => {
                  console.log("📖 Opening email:", email);
                  setSelectedEmail(email);
                  setShowEmailList(false);
                }}
                className={`cursor-pointer border-b p-4 hover:bg-gray-50 ${
                  selectedEmail?.id === email.id
                    ? "border-blue-200 bg-blue-50"
                    : ""
                } ${!email.isRead ? "bg-blue-25" : ""}`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedEmails.includes(email.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleEmailSelection(email.id);
                    }}
                    className="mt-1 rounded"
                  />
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-sm font-semibold text-white">
                    {getInitial(email.from)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center space-x-2">
                      <span
                        className={`truncate font-medium ${!email.isRead ? "text-black" : "text-gray-900"}`}
                      >
                        {email.from}
                      </span>
                      <div className="flex flex-shrink-0 items-center space-x-1">
                        {email.isImportant && (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStar(email.id);
                          }}
                          className={`rounded p-1 hover:bg-gray-200 ${email.isStarred ? "text-yellow-500" : "text-gray-400"}`}
                        >
                          <Star
                            className={`h-4 w-4 ${email.isStarred ? "fill-current" : ""}`}
                          />
                        </button>
                      </div>
                    </div>

                    <div
                      className={`mb-1 truncate text-sm ${!email.isRead ? "font-medium text-black" : "text-gray-900"}`}
                    >
                      {email.subject}
                    </div>

                    <div className="truncate text-sm text-gray-600">
                      {email.body.substring(0, 100)}...
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatDate(email.sentAt)}
                      </span>
                      {!email.isRead && (
                        <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Email Content */}
      {selectedEmail ? (
        <EmailViewer email={selectedEmail} />
      ) : (
        <div className="flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <Mail className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <h3 className="mb-2 text-lg font-medium">Webmail ENI</h3>
            <p>Sélectionnez un email pour le lire</p>
            <div className="mt-4 text-xs text-gray-400">
              <p>
                👤 Utilisateur: {user.username} ({user.email})
              </p>
              <p>📁 Dossier: {currentFolder}</p>
              <p>📊 {emails.length} emails chargés</p>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && <ComposeModal />}

      {/* Diagnostic Modal */}
      <EmailDiagnostic />
    </div>
  );
};

export default GmailClone;
