import { db } from "../db/database";
import { env } from "../app/services/env_service";
import { join } from "path";

const STATIC_DIR = join(import.meta.dir, "..", "site", "dist", "site", "browser");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function getMimeType(path: string): string {
  const ext = path.slice(path.lastIndexOf("."));
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

async function handleApi(req: Request): Promise<Response | null> {
  const url = new URL(req.url);

  if (url.pathname === "/api/memes" && req.method === "GET") {
    const memes = await db.query.memes.findMany({
      columns: {
        id: true,
        name: true,
        duration: true,
        playCount: true,
      },
      with: {
        commands: { columns: { name: true } },
        memeTags: { columns: { tagName: true } },
      },
    });

    const result = memes.map((meme) => ({
      id: meme.id,
      name: meme.name,
      duration: meme.duration,
      playCount: meme.playCount,
      commands: meme.commands.map((c) => c.name),
      tags: meme.memeTags.map((mt) => mt.tagName),
      audioUrl: `${env.assetBaseUrl}/audio/${meme.id}.webm`,
    }));

    return Response.json(result);
  }

  return null;
}

async function serveStatic(pathname: string): Promise<Response | null> {
  const filePath = join(STATIC_DIR, pathname);

  // Prevent directory traversal
  if (!filePath.startsWith(STATIC_DIR)) {
    return new Response("Forbidden", { status: 403 });
  }

  const file = Bun.file(filePath);
  if (await file.exists()) {
    return new Response(file, {
      headers: { "Content-Type": getMimeType(filePath) },
    });
  }

  return null;
}

export async function router(req: Request): Promise<Response> {
  // API routes
  const apiResponse = await handleApi(req);
  if (apiResponse) return apiResponse;

  // Static files
  const url = new URL(req.url);
  const staticResponse = await serveStatic(url.pathname);
  if (staticResponse) return staticResponse;

  // SPA fallback — serve index.html for client-side routing
  const indexFile = Bun.file(join(STATIC_DIR, "index.html"));
  if (await indexFile.exists()) {
    return new Response(indexFile, {
      headers: { "Content-Type": "text/html" },
    });
  }

  return new Response("Not Found", { status: 404 });
}
