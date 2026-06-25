// Lightweight Google OAuth + Drive helpers used to let a user sign in with
// Google and pick one of their own (private) spreadsheets to import.
//
// Flow: load Google Identity Services → request an access token (implicit) →
// call the Drive API to list the user's spreadsheets. The token is then handed
// to the backend (/spreadsheet/import-oauth) which exports the sheet as CSV.

const GIS_SRC = "https://accounts.google.com/gsi/client";

// drive.readonly lets us both LIST the user's spreadsheets and let the backend
// EXPORT the chosen one to CSV with the same token.
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

let gisPromise = null;

// Inject the Google Identity Services script once and resolve when ready.
const loadGis = () => {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;

  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google sign-in")),
      );
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google sign-in"));
    document.head.appendChild(s);
  });
  return gisPromise;
};

// Pop the Google consent screen and resolve with an OAuth access token.
export const requestGoogleAccessToken = async () => {
  if (!CLIENT_ID) {
    throw new Error(
      "Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID.",
    );
  }
  await loadGis();

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (res) => {
        if (res?.error) {
          reject(new Error(res.error_description || res.error));
          return;
        }
        if (!res?.access_token) {
          reject(new Error("No access token returned by Google"));
          return;
        }
        resolve(res.access_token);
      },
      error_callback: (err) =>
        reject(new Error(err?.message || "Google sign-in was cancelled")),
    });
    client.requestAccessToken({ prompt: "consent" });
  });
};

// List the signed-in user's Google Sheets (most recently modified first).
export const listSpreadsheets = async (accessToken) => {
  const params = new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    fields: "files(id,name,modifiedTime,webViewLink)",
    orderBy: "modifiedTime desc",
    pageSize: "100",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body?.error?.message || `Failed to list spreadsheets (${res.status})`,
    );
  }
  const data = await res.json();
  return data.files || [];
};

// Build the canonical edit URL for a Drive spreadsheet id.
export const spreadsheetUrl = (id) =>
  `https://docs.google.com/spreadsheets/d/${id}/edit`;
