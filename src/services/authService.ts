// services/authService.ts
const API_BASE = import.meta.env.VITE_STRAPI_URL || "http://localhost:1337/api";

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: email, // identifiant peut être email ou username
      password,
    }),
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  const data = await response.json();

  // Stocker jwt + user
  localStorage.setItem("jwt", data.jwt);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data;
}

export function logout() {
  localStorage.removeItem("jwt");
  localStorage.removeItem("user");
}
