import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Inbox,
  Star,
  Send,
  Edit3,
  Trash2,
  Settings,
  Bug,
  LogOut,
} from "lucide-react";
import type { Email } from "../types/email";
import logoEni from "./../assets/logo/eni.jpg";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

interface SidebarProps {
  user: {
    username: string;
    email: string;
    [key: string]: any;
  };
  currentFolder: string;
  rawEmails: Email[];
  getEmailCount: (folderId: string) => number;
  showEmailList: boolean;
  onFolderChange: (folderId: string) => void;
  onShowCompose: () => void;
  onShowDiagnostic: () => void;
  onEmptyTrash?: () => Promise<void>;
}

const Sidebar = ({
  user,
  currentFolder,
  rawEmails,
  getEmailCount,
  showEmailList,
  onFolderChange,
  onShowCompose,
  onShowDiagnostic,
  onEmptyTrash,
}: SidebarProps) => {
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
  }>({
    show: false,
    x: 0,
    y: 0,
  });

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const folders = [
    {
      id: "inbox",
      name: "Boîte de réception",
      icon: Inbox,
      count: getEmailCount("inbox"),
      colors: {
        active: "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_8px_25px_rgba(59,130,246,0.5),0_0_40px_rgba(59,130,246,0.3)]",
        hover: "hover:bg-gradient-to-r hover:from-blue-400 hover:to-blue-500 hover:text-white hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)]"
      }
    },
    {
      id: "starred",
      name: "Messages suivis",
      icon: Star,
      count: getEmailCount("starred"),
      colors: {
        active: "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-[0_8px_25px_rgba(234,179,8,0.5),0_0_40px_rgba(234,179,8,0.3)]",
        hover: "hover:bg-gradient-to-r hover:from-yellow-300 hover:to-yellow-400 hover:text-white hover:shadow-[0_6px_20px_rgba(234,179,8,0.4)]"
      }
    },
    {
      id: "sent",
      name: "Messages envoyés",
      icon: Send,
      count: getEmailCount("sent"),
      colors: {
        active: "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-[0_8px_25px_rgba(34,197,94,0.5),0_0_40px_rgba(34,197,94,0.3)]",
        hover: "hover:bg-gradient-to-r hover:from-green-400 hover:to-green-500 hover:text-white hover:shadow-[0_6px_20px_rgba(34,197,94,0.4)]"
      }
    },
    {
      id: "drafts",
      name: "Brouillons",
      icon: Edit3,
      count: getEmailCount("drafts"),
      colors: {
        active: "bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-[0_8px_25px_rgba(107,114,128,0.5),0_0_40px_rgba(107,114,128,0.3)]",
        hover: "hover:bg-gradient-to-r hover:from-gray-400 hover:to-gray-500 hover:text-white hover:shadow-[0_6px_20px_rgba(107,114,128,0.4)]"
      }
    },
    {
      id: "trash",
      name: "Corbeille",
      icon: Trash2,
      count: getEmailCount("trash"),
      colors: {
        active: "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_8px_25px_rgba(239,68,68,0.5),0_0_40px_rgba(239,68,68,0.3)]",
        hover: "hover:bg-gradient-to-r hover:from-red-400 hover:to-red-500 hover:text-white hover:shadow-[0_6px_20px_rgba(239,68,68,0.4)]"
      }
    },
  ];

  const getInitial = (str?: string) =>
    str && str.length > 0 ? str.charAt(0).toUpperCase() : "U";

  // GESTION DU CLIC DROIT SUR LA CORBEILLE
  const handleContextMenu = (e: React.MouseEvent, folder: any) => {
    if (folder.id === "trash" && folder.count > 0) {
      e.preventDefault();
      setContextMenu({
        show: true,
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  // Fermer le menu contextuel
  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0 });
  };

  // Gérer le clic en dehors du menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        closeContextMenu();
      }
    };

    if (contextMenu.show) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contextMenu.show]);

  // VIDER LA CORBEILLE avec SweetAlert2
  const handleEmptyTrash = async () => {
    const trashCount = getEmailCount("trash");
    
    closeContextMenu();

    // Afficher la confirmation avec SweetAlert2
    const result = await Swal.fire({
      title: '⚠️ Vider la corbeille ?',
      html: `
        <div class="text-left">
          <p class="mb-3">Cette action est <strong class="text-red-600">IRRÉVERSIBLE</strong> et supprimera définitivement :</p>
          <div class="bg-red-50 border-l-4 border-red-500 p-3 mb-3">
            <p class="font-bold text-red-700">${trashCount} email(s)</p>
          </div>
          <p class="text-sm text-gray-600">Les emails seront supprimés de la base de données et ne pourront plus être récupérés.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: '🗑️ Oui, vider la corbeille',
      cancelButtonText: 'Annuler',
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'font-semibold',
        cancelButton: 'font-semibold'
      }
    });

    if (result.isConfirmed) {
      // Afficher un toast de chargement
      const loadingToast = toast.loading(
        `🗑️ Suppression de ${trashCount} email(s) en cours...`,
        {
          duration: Infinity,
          style: {
            background: '#1f2937',
            color: '#fff',
            fontWeight: '600',
          },
        }
      );

      try {
        if (onEmptyTrash) {
          await onEmptyTrash();
        }

        // Masquer le toast de chargement
        toast.dismiss(loadingToast);

        // Afficher un toast de succès
        toast.success(
          `✅ Corbeille vidée ! ${trashCount} email(s) supprimé(s)`,
          {
            duration: 5000,
            style: {
              background: '#10b981',
              color: '#fff',
              fontWeight: '600',
            },
            icon: '🎉',
          }
        );

        // SweetAlert de confirmation finale
        await Swal.fire({
          title: 'Corbeille vidée !',
          html: `
            <div class="text-center">
              <p class="text-lg mb-3">✅ ${trashCount} email(s) supprimé(s) définitivement</p>
              <p class="text-sm text-gray-600">La corbeille est maintenant vide.</p>
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#10b981',
          confirmButtonText: 'Parfait !',
          timer: 3000,
          timerProgressBar: true,
          customClass: {
            popup: 'rounded-xl',
          }
        });

      } catch (error) {
        // Masquer le toast de chargement
        toast.dismiss(loadingToast);

        // Afficher un toast d'erreur
        toast.error(
          '❌ Erreur lors de la suppression des emails',
          {
            duration: 5000,
            style: {
              background: '#dc2626',
              color: '#fff',
              fontWeight: '600',
            },
          }
        );

        // SweetAlert d'erreur
        await Swal.fire({
          title: 'Erreur',
          text: 'Une erreur est survenue lors de la suppression des emails.',
          icon: 'error',
          confirmButtonColor: '#dc2626',
          confirmButtonText: 'OK',
          customClass: {
            popup: 'rounded-xl',
          }
        });

        console.error('Erreur lors du vidage de la corbeille:', error);
      }
    }
  };
  
  return (
    <div
      className={`${showEmailList ? "hidden md:flex" : "flex"} w-64 flex-col border-r border-gray-300 bg-white`}
    >
      <img
        src={logoEni}
        alt="logo Eni"
        className="mt-2 ml-[80px] aspect-square h-[100px] w-[100px]"
      />
      <div className="p-4">
        <button
          onClick={onShowCompose}
          className={`flex w-full cursor-pointer items-center justify-center space-x-2 rounded-lg px-4 py-2 
  text-gray-900 border-2 border-blue-100
  transition-all duration-300
  hover:bg-white hover:bg-opacity-10 hover:backdrop-blur-lg
  hover:shadow-[0_12px_25px_rgba(0,0,255,0.3),0_0_50px_rgba(0,150,255,0.15),inset_0_0_8px_rgba(0,0,200,0.2)]
  hover:-translate-y-1`}
        >
          <Plus className="h-4 w-4" />
          <span>Nouveau message</span>
        </button>
      </div>

      <nav className="flex-1 px-2">
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => onFolderChange(folder.id)}
            onContextMenu={(e) => handleContextMenu(e, folder)}
            className={`mb-1 flex text-sm w-full items-center space-x-3 rounded-xl px-3 py-2 transition-all duration-300
  ${
    currentFolder === folder.id
      ? `${folder.colors.active} font-semibold border border-opacity-40 scale-105`
      : `text-gray-700 ${folder.colors.hover} hover:scale-105 hover:-translate-y-0.5`
  }`}
            title={
              folder.id === "trash" && folder.count > 0
                ? "Clic droit pour vider la corbeille"
                : folder.name
            }
          >
            <folder.icon className="h-5 w-5" />
            <span className="flex-1 cursor-pointer text-left">
              {folder.name}
            </span>
            {folder.count > 0 && (
              <span className="mb-1 rounded-full bg-red-500 font-semibold p-1 px-2 text-xs text-white">
                {folder.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* MENU CONTEXTUEL POUR VIDER LA CORBEILLE */}
      {contextMenu.show && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 py-2 min-w-[220px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          <button
            onClick={handleEmptyTrash}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-5 w-5" />
            <div className="flex flex-col">
              <span className="font-medium">Vider la corbeille</span>
              <span className="text-xs text-gray-500">
                {getEmailCount("trash")} email(s) seront supprimés définitivement
              </span>
            </div>
          </button>
        </div>
      )}

      <div className="border-t border-gray-300 p-4">
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
          <button
            onClick={() => navigate('/profiles')}
            title="Paramètres du compte"
            className={`rounded-full cursor-pointer p-2 transition-all duration-300
    hover:bg-white hover:bg-opacity-10 hover:backdrop-blur-md
    hover:shadow-[0_8px_20px_rgba(0,0,0,0.25),inset_0_0_8px_rgba(255,255,255,0.15)]
    hover:-translate-y-0.5
    active:translate-y-0 active:scale-95`}
          >
            <Settings className="h-4 w-4 text-gray-700 hover:text-gray-900 transition-colors duration-300" />
          </button>

          <button
            onClick={onShowDiagnostic}
            title="Diagnostic"
            className={`cursor-pointer rounded-full p-2 transition-all duration-300
    hover:bg-white hover:bg-opacity-10 hover:backdrop-blur-md
    hover:shadow-[0_8px_20px_rgba(0,0,0,0.25),inset_0_0_8px_rgba(255,255,255,0.15)]
    hover:-translate-y-0.5
    active:translate-y-0 active:scale-95`}
          >
            <Bug className="h-4 w-4 text-gray-700 hover:text-blue-600 transition-colors duration-300" />
          </button>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem("user");
            localStorage.removeItem("jwt");
            navigate("/login");
          }}
          className={`mt-2 w-full flex items-center justify-center gap-2 cursor-pointer rounded-md px-3 py-1 
  text-red-600 border-2 border-red-200
  transition-all duration-300
  hover:bg-white hover:bg-opacity-10 hover:backdrop-blur-lg
  hover:shadow-[0_12px_25px_rgba(255,0,0,0.35),0_0_35px_rgba(255,100,100,0.15),inset_0_0_8px_rgba(200,0,0,0.2)]
  hover:-translate-y-1`}
        >
          <LogOut className="h-4 w-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;