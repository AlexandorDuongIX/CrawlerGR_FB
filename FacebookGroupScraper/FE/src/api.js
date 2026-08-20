const API_BASE = 'http://127.0.0.1:8000';

// ── Bot Control ──────────────────────────────

export async function fetchBotStatus() {
  try {
    const res = await fetch(`${API_BASE}/bot/status`);
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch bot status:', e);
    return null;
  }
}

export async function startBot() {
  try {
    const res = await fetch(`${API_BASE}/bot/start`, { method: 'POST' });
    return await res.json();
  } catch (e) {
    console.error('Failed to start bot:', e);
    return null;
  }
}

export async function stopBot() {
  try {
    const res = await fetch(`${API_BASE}/bot/stop`, { method: 'POST' });
    return await res.json();
  } catch (e) {
    console.error('Failed to stop bot:', e);
    return null;
  }
}

export async function quitBot() {
  try {
    const res = await fetch(`${API_BASE}/bot/quit`, { method: 'POST' });
    return await res.json();
  } catch (e) {
    console.error('Failed to quit bot:', e);
    return null;
  }
}

// ── Groups ───────────────────────────────────

export async function fetchGroups() {
  try {
    const res = await fetch(`${API_BASE}/groups`);
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch groups:', e);
    return { groups: [], total: 0 };
  }
}

export async function addGroup(url, name = '') {
  try {
    const res = await fetch(`${API_BASE}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, name }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to add group');
    }
    return await res.json();
  } catch (e) {
    console.error('Failed to add group:', e);
    throw e;
  }
}

export async function activateGroup(id) {
  try {
    const res = await fetch(`${API_BASE}/groups/${id}/activate`, { method: 'PATCH' });
    return await res.json();
  } catch (e) {
    console.error('Failed to activate group:', e);
    return null;
  }
}

export async function deactivateGroup(id) {
  try {
    const res = await fetch(`${API_BASE}/groups/${id}`, { method: 'DELETE' });
    return await res.json();
  } catch (e) {
    console.error('Failed to deactivate group:', e);
    return null;
  }
}

export async function deleteGroup(id) {
  try {
    const res = await fetch(`${API_BASE}/groups/${id}/permanent`, { method: 'DELETE' });
    return await res.json();
  } catch (e) {
    console.error('Failed to delete group:', e);
    return null;
  }
}

// ── Posts ─────────────────────────────────────

export async function fetchPosts(page = 1, perPage = 20, groupUrl = null, search = null) {
  try {
    const params = new URLSearchParams({ page, per_page: perPage });
    if (groupUrl) params.set('group_url', groupUrl);
    if (search) params.set('search', search);
    const res = await fetch(`${API_BASE}/posts?${params}`);
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch posts:', e);
    return { posts: [], total: 0, page: 1, per_page: perPage, total_pages: 0 };
  }
}
