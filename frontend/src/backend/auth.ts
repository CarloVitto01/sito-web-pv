// Sostituisce firebase/auth + la lettura del profilo utente da Firestore.
// L'utente autenticato viene tenuto in memoria (sincronizzato con localStorage per sopravvivere al reload)
// e propagato agli ascoltatori tramite onAuthStateChanged, cosi' i componenti che leggevano `auth.currentUser`
// in modo sincrono continuano a funzionare allo stesso modo.

import { api, ApiError, API_BASE, setTokens, getAccessToken } from "./apiClient";

export interface CurrentUser {
  uid: string;
  email: string;
  displayName: string;
  cognome: string;
  telefono: string;
  corsoLaurea: string;
  annoAccademico: string;
  ruolo: string;
  pageAccess: string[];
}

type UserDtoResponse = {
  id: string;
  email: string;
  displayName: string;
  cognome: string;
  telefono: string;
  corsoLaurea: string;
  annoAccademico: string;
  ruolo: string;
  pageAccess: string[];
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: UserDtoResponse;
};

const CURRENT_USER_KEY = "pv_current_user";

function toCurrentUser(u: UserDtoResponse): CurrentUser {
  return {
    uid: u.id,
    email: u.email,
    displayName: u.displayName || "",
    cognome: u.cognome || "",
    telefono: u.telefono || "",
    corsoLaurea: u.corsoLaurea || "",
    annoAccademico: u.annoAccademico || "",
    ruolo: u.ruolo,
    pageAccess: u.pageAccess || [],
  };
}

function loadCachedUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

const listeners = new Set<(user: CurrentUser | null) => void>();

export const auth: { currentUser: CurrentUser | null } = {
  currentUser: getAccessToken() ? loadCachedUser() : null,
};

function setCurrentUser(user: CurrentUser | null) {
  auth.currentUser = user;
  if (user) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(CURRENT_USER_KEY);
  listeners.forEach((cb) => cb(user));
}

/** Equivalente di onAuthStateChanged: invoca subito con lo stato corrente, poi ad ogni cambiamento. */
export function onAuthStateChanged(callback: (user: CurrentUser | null) => void): () => void {
  callback(auth.currentUser);
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function applyAuthResponse(res: AuthResponse): CurrentUser {
  setTokens(res.accessToken, res.refreshToken);
  const user = toCurrentUser(res.user);
  setCurrentUser(user);
  return user;
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  const res = await api.post<AuthResponse>("/api/auth/login", { email, password }, { auth: false });
  return applyAuthResponse(res);
}

export async function register(payload: {
  email: string;
  password: string;
  displayName?: string;
  cognome?: string;
  telefono?: string;
  corsoLaurea?: string;
  annoAccademico?: string;
}): Promise<CurrentUser> {
  const res = await api.post<AuthResponse>("/api/auth/register", payload, { auth: false });
  return applyAuthResponse(res);
}

export function logout(): void {
  const token = getAccessToken();
  if (token) void fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST", headers: { Authorization: `Bearer ${token}` }, keepalive: true,
  }).catch(() => {});
  clearSession();
}

function clearSession(): void {
  setTokens(null, null);
  setCurrentUser(null);
}

/** Ricarica il profilo dal server (es. dopo una modifica in AccountPage) e aggiorna lo stato locale. */
export async function refreshCurrentUser(): Promise<CurrentUser | null> {
  if (!getAccessToken()) return null;
  try {
    const dto = await api.get<UserDtoResponse>("/api/auth/me");
    const user = toCurrentUser(dto);
    setCurrentUser(user);
    return user;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) clearSession();
    return null;
  }
}

export async function updateProfile(payload: Partial<{
  displayName: string; cognome: string; telefono: string; corsoLaurea: string; annoAccademico: string;
}>): Promise<CurrentUser> {
  const dto = await api.put<UserDtoResponse>("/api/auth/me", payload);
  const user = toCurrentUser(dto);
  setCurrentUser(user);
  return user;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post("/api/auth/change-password", { currentPassword, newPassword });
  clearSession();
}

export async function recoverPassword(telefono: string, email: string): Promise<void> {
  await api.post("/api/auth/recover-password", { telefono, email }, { auth: false });
}

export async function recoverEmailMasked(telefono: string): Promise<string> {
  const res = await api.post<{ maskedEmail: string }>("/api/auth/recover-email", { telefono }, { auth: false });
  return res.maskedEmail;
}

export async function resetPasswordConfirm(token: string, newPassword: string): Promise<void> {
  await api.post("/api/auth/reset-password-confirm", { token, newPassword }, { auth: false });
}
