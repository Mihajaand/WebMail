import { Search, RefreshCw, Mail, AlertCircle, Star } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

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
      className={`${selectedEmail ? "hidden md:flex" : "flex"} ${showEmailList ? "flex" : "hidden md:flex"} w-full flex-col border-r border-gray-200/50 bg-gradient-to-br from-gray-50/80 via-white/60 to-gray-50/80 backdrop-blur-xl md:w-80 lg:w-96`}
    >
      {/* Header avec recherche - effet glass */}
      <div className="border-b border-white/30 bg-gradient-to-br from-white/70 via-white/50 to-white/40 backdrop-blur-xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
        <div className="relative group">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400 group-hover:text-blue-500 transition-colors duration-300 z-10" />
          <input
            type="text"
            placeholder="Rechercher dans les emails"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-white/40 bg-white/60 backdrop-blur-md py-2.5 pr-4 pl-10 shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_1px_2px_rgba(255,255,255,0.5)] focus:ring-2 focus:ring-blue-400/50 focus:border-blue-300 focus:outline-none focus:shadow-[0_8px_24px_rgba(59,130,246,0.15)] transition-all duration-300 hover:bg-white/70"
          />
        </div>
      </div>

      {/* En-tête du dossier avec effet 3D */}
      <div className="border-b border-white/30 bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-lg p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900 drop-shadow-sm text-lg">
            {folders.find((f) => f.id === currentFolder)?.name}
          </h2>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-600 px-2.5 py-1 rounded-lg bg-white/50 backdrop-blur-sm shadow-[0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-white/30">
              {currentEmails.length} email{currentEmails.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => {
                console.log("🔄 Manual refresh requested");
                onRefresh();
                window.location.reload();
              }}
              title="Actualiser"
              className="rounded-xl p-2 cursor-pointer transition-all duration-300 backdrop-blur-sm bg-white/40 hover:bg-white/60 shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(255,255,255,0.4)] hover:shadow-[0_8px_20px_rgba(59,130,246,0.2),inset_0_1px_2px_rgba(255,255,255,0.5)] hover:-translate-y-1 hover:scale-110 active:translate-y-0 active:scale-95 transform-gpu border border-white/30"
            >
              <RefreshCw
                className={`h-4 w-4 text-gray-700 hover:text-blue-600 transition-colors duration-300 ${
                  loading ? "animate-spin text-blue-500" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Liste des emails avec espacement */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
              className={`cursor-pointer rounded-2xl p-4 transition-all duration-500 transform-gpu hover:scale-[1.02] hover:-translate-y-1
                ${
                  selectedEmail?.id === email.id
                    ? "bg-gradient-to-br from-blue-100/80 via-blue-50/60 to-blue-100/80 backdrop-blur-xl border-2 border-blue-300/60 shadow-[0_12px_40px_rgba(59,130,246,0.25),inset_0_1px_2px_rgba(255,255,255,0.6)]"
                    : !email.isRead
                      ? "bg-gradient-to-br from-white/70 via-white/50 to-blue-50/40 backdrop-blur-xl border border-blue-200/40 shadow-[0_8px_32px_rgba(59,130,246,0.08),inset_0_1px_2px_rgba(255,255,255,0.5)] hover:shadow-[0_16px_48px_rgba(59,130,246,0.15),inset_0_1px_2px_rgba(255,255,255,0.6)]"
                      : "bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-xl border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(255,255,255,0.5)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.12),inset_0_1px_2px_rgba(255,255,255,0.6)]"
                }
                hover:border-white/50
              `}
            >
              <div className="flex items-start space-x-3 group relative">
                {/* Gradient animé de fond au hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                
                {/* Reflet lumineux sur le dessus */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-t-2xl"></div>
                

                
                {/* Avatar avec effet 3D profond */}
                <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 text-base font-bold text-white shadow-[0_8px_24px_rgba(168,85,247,0.4),inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-3px_6px_rgba(0,0,0,0.2)] group-hover:shadow-[0_12px_36px_rgba(168,85,247,0.6),inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-3px_6px_rgba(0,0,0,0.25)] transition-all duration-300 transform group-hover:scale-110 group-hover:rotate-3 z-10">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-transparent to-white/30"></div>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent to-black/10"></div>
                  <span className="relative z-10 drop-shadow-sm">{getInitial(email.from)}</span>
                </div>

                {/* Contenu de l'email */}
                <div className="min-w-0 flex-1 relative z-10">
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`truncate font-semibold ${!email.isRead ? "text-gray-900" : "text-gray-700"} drop-shadow-sm`}
                    >
                      {email.from}
                    </span>
                    <div className="flex flex-shrink-0 items-center space-x-1">
                      {email.isImportant && (
                        <div className="relative">
                          <AlertCircle className="h-4 w-4 text-amber-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]" />
                          <div className="absolute inset-0 blur-md">
                            <AlertCircle className="h-4 w-4 text-amber-400 opacity-60" />
                          </div>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(email.id);
                          toast.success("Changement de statut du suivi de l'email avec succès !", { duration: 3000 }); // toast

                        }}
                        title={email.isStarred ? "Retirer au suivi" : "Ajouter au suivi"}
                        className={`rounded-xl p-2 cursor-pointer transition-all duration-300 backdrop-blur-sm transform-gpu
                          ${
                            email.isStarred
                              ? "text-yellow-500 bg-gradient-to-br from-yellow-500/25 to-yellow-500/15 shadow-[0_4px_16px_rgba(234,179,8,0.35),inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(234,179,8,0.1)]"
                              : "text-gray-400 hover:text-yellow-500 bg-white/30 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.3)]"
                          }
                          hover:bg-gradient-to-br hover:from-white/70 hover:to-white/50 hover:shadow-[0_6px_20px_rgba(234,179,8,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)]
                          hover:scale-110 hover:translate-y-[-2px] hover:rotate-12 active:scale-95 active:translate-y-0 active:rotate-0 border border-white/30`}
                      >
                        <Star
                          className={`h-4 w-4 transition-all duration-300 drop-shadow-sm ${
                            email.isStarred ? "fill-current scale-110" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div
                    className={`mb-2 truncate text-sm ${!email.isRead ? "font-semibold text-gray-900" : "text-gray-700"} drop-shadow-sm`}
                  >
                    {email.subject}
                  </div>

                  <div className="truncate text-sm text-gray-600/90">
                    {email.body.substring(0, 100)}...
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500/90 backdrop-blur-sm px-3 py-1.5 rounded-lg bg-gradient-to-br from-white/60 to-white/40 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-white/30">
                      {formatDate(email.sentAt)}
                    </span>
                    {/* Indicateur non lu avec effet lumineux */}
                    {!email.isRead && (
                      <div className="relative">
                        <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-500 shadow-[0_0_16px_rgba(59,130,246,0.8),0_0_8px_rgba(59,130,246,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)]"></div>
                        <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-blue-400 animate-ping opacity-75"></div>
                        <div className="absolute inset-[-3px] rounded-full bg-gradient-to-br from-blue-400/30 to-transparent blur-md"></div>
                      </div>
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