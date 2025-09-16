import {
  Plus,
  Inbox,
  Star,
  Send,
  Edit3,
  Trash2,
  Settings,
  Bug,
} from "lucide-react";
import type { Email } from "../types/email";
import logoEni from "./../assets/logo/eni.jpg";
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
}: SidebarProps) => {
  const folders = [
    {
      id: "inbox",
      name: "Boîte de réception",
      icon: Inbox,
      count: getEmailCount("inbox"),
    },
    {
      id: "starred",
      name: "Messages suivis",
      icon: Star,
      count: getEmailCount("starred"),
    },
    {
      id: "sent",
      name: "Messages envoyés",
      icon: Send,
      count: getEmailCount("sent"),
    },
    {
      id: "drafts",
      name: "Brouillons",
      icon: Edit3,
      count: getEmailCount("drafts"),
    },
    {
      id: "trash",
      name: "Corbeille",
      icon: Trash2,
      count: getEmailCount("trash"),
    },
  ];

  const getInitial = (str?: string) =>
    str && str.length > 0 ? str.charAt(0).toUpperCase() : "U";

  return (
    <div
      className={`${showEmailList ? "hidden md:flex" : "flex"} w-64 flex-col border-r bg-white`}
    >
      <img
        src={logoEni}
        alt="logo Eni"
        className="mt-2 ml-[80px] aspect-square h-[100px] w-[100px]"
      />
      <div className="p-4">
        <button
          onClick={onShowCompose}
          className="flex w-full cursor-pointer items-center justify-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
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
            <Settings className="h-4 w-4 cursor-pointer" />
          </button>
          <button
            onClick={onShowDiagnostic}
            className="cursor-pointer rounded p-1 hover:bg-gray-100"
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
          className="mt-2 w-full cursor-pointer rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
        >
          Déconnexion
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
