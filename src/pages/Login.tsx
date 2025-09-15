import { useState } from "react";
import { useNavigate } from "react-router";

interface LoginData {
  email: string;
  password: string;
}

const Login = ({ setUser }: { setUser: (user: any) => void }) => {
  const [form, setForm] = useState<LoginData>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch("http://localhost:1337/api/auth/local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Email ou mot de passe incorrect");
        return;
      }

      // Stockage dans localStorage
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("jwt", data.jwt);
      setUser(data.user);

      navigate("/"); // redirection après login
    } catch (err: any) {
      console.error(err);
      setError("Erreur réseau ou serveur");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded bg-white p-6 shadow"
      >
        <h2 className="mb-4 text-xl font-semibold">Connexion</h2>
        {error && <p className="mb-2 text-red-500">{error}</p>}

        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          className="mb-3 w-full rounded border px-3 py-2"
          required
        />
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Mot de passe"
          className="mb-3 w-full rounded border px-3 py-2"
          required
        />

        <button
          type="submit"
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700"
        >
          Se connecter
        </button>
      </form>
    </div>
  );
};

export default Login;
