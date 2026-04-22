export function getAccessToken() {
  return localStorage.getItem("access");
}

export function clearSession() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("is_admin");
}

export function logoutAndRedirect() {
  clearSession();
  window.location.href = "/login";
}

export async function authFetch(url, options = {}) {
  const token = getAccessToken();
  const headers = {
    ...options.headers,
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    // Basic implementation: logout on unauthorized
    logoutAndRedirect();
  }
  
  return response;
}
