import GmailClone from "./GmailClone";

interface User {
  username: string;
  name: string;
  email: string;
  [key: string]: any;
}

const AppWrapper = () => {
  // Exemple : récupérer user depuis localStorage
  const storedUser = localStorage.getItem("user");
  const user: User | null = storedUser ? JSON.parse(storedUser) : null;

  if (!user)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      {/* Spinner */}
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      {/* Texte */}
      <p className="text-center text-gray-700 text-lg">
        Chargement en cours ou utilisateur non connecté...
      </p>
      <a href="/login" className="mt-4 animate-bounce rounded-3xl cursor-pointer bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
        Se connecter
      </a>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden">
      <GmailClone user={user} />
    </div>
  );
};

export default AppWrapper;
