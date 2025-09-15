import { useState } from "react";
import { useNavigate } from "react-router";

const SignUp = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch("http://localhost:1337/api/auth/local/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      });

      const data = await res.json(); // <- lire le body UNE seule fois
      console.log(data);

      if (!res.ok) {
        setError(data.error?.message || "Erreur inconnue");
        return;
      }

      console.log("Utilisateur créé:", data);
      // Sauvegarde user + JWT si besoin
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("jwt", data.jwt);

      navigate("/login"); // redirection après signup
    } catch (err) {
      console.error(err);
      setError("Erreur réseau ou serveur");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded bg-white p-8 shadow"
      >
        <h2 className="text-xl font-semibold">Créer un compte</h2>

        {error && <div className="text-red-500">{error}</div>}

        <div>
          <label className="block text-sm font-medium">Nom d'utilisateur</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700"
        >
          S'inscrire
        </button>
      </form>
    </div>
  );
};

export default SignUp;
