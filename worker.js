/* ============================================================
   ANIDOST API — Cloudflare Worker
   Storage: KV namespace (binding: ANIME_KV)
   Auth:    X-API-Key header vs env.API_KEY
   Data:    GitHub-এ কিছু নেই — সব KV-তে
   ============================================================ */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  "Access-Control-Max-Age": "86400"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}
function err(msg, status = 400) { return json({ error: msg }, status); }

function checkAuth(request, env) {
  if (!env.API_KEY) return true;
  return request.headers.get("X-API-Key") === env.API_KEY;
}

function isValidName(name) {
  return /^anime_\d+\.js$/.test(name) || name === "anime_link.js";
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (!checkAuth(request, env)) {
      return err("Unauthorized — invalid API key", 401);
    }

    try {
      /* ─────── GET /health ─────── */
      if (request.method === "GET" && path === "/health") {
        return json({
          ok: true,
          service: "anidost-api",
          time: new Date().toISOString(),
          storage: "KV",
          kvBound: !!env.ANIME_KV,
          authConfigured: !!env.API_KEY
        });
      }

      /* ─────── GET /list ─────── */
      if (request.method === "GET" && path === "/list") {
        const list = await env.ANIME_KV.list({ prefix: "anime_" });
        const files = (list.keys || [])
          .filter(k => /^anime_\d+\.js$/.test(k.name))
          .map(k => ({ name: k.name }))
          .sort((a, b) => {
            const na = parseInt(a.name.match(/_(\d+)\.js/)[1], 10);
            const nb = parseInt(b.name.match(/_(\d+)\.js/)[1], 10);
            return na - nb;
          });
        return json({ files });
      }

      /* ─────── GET /file/:name ─────── */
      if (request.method === "GET" && path.startsWith("/file/")) {
        const name = decodeURIComponent(path.slice(6));
        if (!isValidName(name)) return err("Invalid file name", 400);
        const content = await env.ANIME_KV.get(name, { type: "text" });
        if (content === null) return err("File not found", 404);
        return json({ name, content, size: content.length });
      }

      /* ─────── PUT /file/:name ─────── */
      if (request.method === "PUT" && path.startsWith("/file/")) {
        const name = decodeURIComponent(path.slice(6));
        if (!isValidName(name)) return err("Invalid file name", 400);

        let body;
        try { body = await request.json(); }
        catch { return err("Invalid JSON body", 400); }

        if (typeof body.content !== "string") {
          return err("Missing 'content' field", 400);
        }
        if (body.content.length > 25 * 1024 * 1024) {
          return err("Content too large (max 25 MB per file)", 413);
        }

        await env.ANIME_KV.put(name, body.content, {
          metadata: { updated: new Date().toISOString() }
        });

        return json({
          ok: true, name,
          size: body.content.length,
          savedAt: new Date().toISOString()
        });
      }

      /* ─────── DELETE /file/:name ─────── */
      if (request.method === "DELETE" && path.startsWith("/file/")) {
        const name = decodeURIComponent(path.slice(6));
        if (!isValidName(name)) return err("Invalid file name", 400);
        await env.ANIME_KV.delete(name);
        return json({ ok: true, deleted: name });
      }

      /* ─────── GET /anime_link.js ─────── */
      if (request.method === "GET" && path === "/anime_link.js") {
        const list = await env.ANIME_KV.list({ prefix: "anime_" });
        const files = (list.keys || [])
          .filter(k => /^anime_\d+\.js$/.test(k.name))
          .map(k => k.name)
          .sort((a, b) => {
            const na = parseInt(a.match(/_(\d+)\.js/)[1], 10);
            const nb = parseInt(b.match(/_(\d+)\.js/)[1], 10);
            return na - nb;
          });

        const base = url.origin;
        const lines = [
          "// anime_link.js — auto-generated " + new Date().toISOString(),
          "window.ANIME_LINKS = ["
        ];
        files.forEach((f, i) => {
          lines.push('  "' + base + '/file/' + f + '"' + (i < files.length - 1 ? "," : ""));
        });
        lines.push("];");
        lines.push('window.dispatchEvent(new Event("anime-links-ready"));');

        return new Response(lines.join("\n"), {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=60",
            ...CORS
          }
        });
      }

      /* ─────── GET /anime_N.js (public site-এর জন্য) ─────── */
      if (request.method === "GET" && /^\/anime_\d+\.js$/.test(path)) {
        const name = path.slice(1);
        const content = await env.ANIME_KV.get(name, { type: "text" });
        if (content === null) return err("Not found", 404);

        return new Response(content, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            ...CORS
          }
        });
      }

      return err("Not found: " + request.method + " " + path, 404);

    } catch (e) {
      console.error("[worker error]", e);
      return err("Server error: " + e.message, 500);
    }
  }
};
