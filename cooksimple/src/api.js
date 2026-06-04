// Central API client. Points at the Django backend.
const API_BASE = "http://127.0.0.1:8000/api";

export function getToken() {
  return localStorage.getItem("cs_token");
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Token ${token}` } : {}),
    ...extra,
  };
}

async function request(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: authHeaders(options.headers || {}),
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const get  = (p)       => request(p);
const post = (p, body) => request(p, { method: "POST", body: JSON.stringify(body) });
const put  = (p, body) => request(p, { method: "PUT",  body: JSON.stringify(body) });
const del  = (p)       => request(p, { method: "DELETE" });

const qs = (params) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v != null && v !== false)
  );
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : "";
};

// Auth
export const registerUser = (data) => post("/auth/register/", data);
export const loginUser    = (data) => post("/auth/login/",    data);
export const logoutUser   = ()     => post("/auth/logout/",   {});
export const getMe        = ()     => get("/auth/me/");

// Recipes
export const listRecipes   = (params = {}) => get(`/recipes/${qs(params)}`);
export const getRecipe     = (id)          => get(`/recipes/${id}/`);
export const createRecipe  = (data)        => post(`/recipes/`, data);
export const updateRecipe  = (id, data)    => put(`/recipes/${id}/`, data);
export const deleteRecipe  = (id)          => del(`/recipes/${id}/`);

// Image upload (PATCH with multipart/form-data — no Content-Type header)
export const uploadRecipeImage = async (id, file) => {
  const fd = new FormData();
  fd.append("image", file);
  const token = getToken();
  const res = await fetch(`${API_BASE}/recipes/${id}/`, {
    method: "PATCH",
    headers: token ? { Authorization: `Token ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
};

// Units
export const listUnits = () => get(`/units/`);

// Pantry
export const listPantry      = ()         => get(`/pantry/`);
export const addPantryItem   = (data)     => post(`/pantry/`, data);
export const updatePantryItem = (id, data) => put(`/pantry/${id}/`, data);
export const deletePantryItem = (id)      => del(`/pantry/${id}/`);

// Suggestions
export const getSuggestions = (params = {}) => get(`/suggestions/${qs(params)}`);

// Shopping list
export const buildShoppingList = (recipe_ids) => post(`/shopping-list/`, { recipe_ids });

// Backward-compat
export const cookNow           = (ingredients) => post(`/cook-now/`, { ingredients });
export const recipeDetailLegacy = (id)         => get(`/recipes-detail/${id}/`);
