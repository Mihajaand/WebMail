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

  if (!user) return <div>Chargement ou utilisateur non connecté...</div>;

  return (
    <div className="h-screen overflow-hidden">
      <GmailClone user={user} />
    </div>
  );
};

export default AppWrapper;
