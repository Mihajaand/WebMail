import { Search, RefreshCw, Mail, AlertCircle, Star } from "lucide-react";
import type { Email } from "../types/email";

interface EmailListProps {
  currentFolder: string;
  currentEmails: Email[];
  selectedEmail: Email | null;
  selectedEmails: string[];
  searchQuery: string;
  loading: boolean;
  error: string | null;
  showEmailList: boolean;
  rawEmails: Email[];
  onSearchChange: (query: string) => void;
  onEmailSelect: (email: Email) => void;
  onEmailToggleSelect: (emailId: string) => void;
  onToggleStar: (id: string) => Promise<void>;
  onRefresh: () => void;
  getEmailCount: (folderId: string) => number;
}

const EmailList = ({
  currentFolder,
  currentEmails,
  selectedEmail,
  selectedEmails,
  searchQuery,
  loading,
  error,
  showEmailList,
  rawEmails,
  onSearchChange,
  onEmailSelect,
  onEmailToggleSelect,
  onToggleStar,
  onRefresh,
  getEmailCount,
}: EmailListProps) => {
  const folders = [
    {
      id: "inbox",
      name: "Boîte de réception",
    },
    {
      id: "starred",
      name: "Messages suivis",
    },
    {
      id: "sent",
      name: "Messages envoyés",
    },
    {
      id: "drafts",
      name: "Brouillons",
    },
    {
      id: "trash",
      name: "Corbeille",
    },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } else if (diffDays === 1) {
      return "Hier";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("fr-FR", { weekday: "short" });
    } else {
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const getInitial = (str?: string) =>
    str && str.length > 0 ? str.charAt(0).toUpperCase() : "U";

  return (
    <div
      className={`${selectedEmail ? "hidden md:flex" : "flex"} ${showEmailList ? "flex" : "hidden md:flex"} w-full flex-col border-r border-gray-300 bg-white md:w-80 lg:w-96`}
    >
      <div className="border-b border-gray-300 p-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher dans les emails"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="border-b border-gray-300 p-4">
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
                onRefresh();
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
              onClick={onRefresh}
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
            {currentFolder === "starred" && (
              <p className="mt-2 text-center text-xs text-gray-400">
                Marquez des emails d'une étoile pour les voir ici
              </p>
            )}
          </div>
        ) : (
          currentEmails.map((email) => (
            <div
              key={email.id}
              onClick={() => onEmailSelect(email)}
              className={`cursor-pointer border-b border-gray-300 p-4 hover:bg-gray-50 ${
                selectedEmail?.id === email.id
                  ? "border-blue-200 bg-blue-50"
                  : ""
              } ${!email.isRead ? "bg-blue-25" : ""}`}
            >
              <div className="flex items-start space-x-3">
                {/* <input
                  type="checkbox"
                  checked={selectedEmails.includes(email.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onEmailToggleSelect(email.id);
                  }}
                  className="mt-1 rounded"
                /> */}
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
                          onToggleStar(email.id);
                        }}
                       title={email.isStarred ? "Retirer au suivi " : "Ajouter au suivi"}
                        className={`rounded p-1 cursor-pointer hover:bg-gray-200 ${email.isStarred ? "text-yellow-500" : "text-gray-400"}`}
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
  );
};

export default EmailList;
