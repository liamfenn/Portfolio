import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const envPath = `${projectRoot}.env.local`;
const envSource = await readFile(envPath, "utf8");

function parseEnv(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator);
        let value = line.slice(separator + 1).trim();

        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        return [key, value];
      })
  );
}

function requireValue(env, key) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is missing from .env.local`);
  return value;
}

function updateEnvValue(source, key, value) {
  const nextLine = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(source)) return source.replace(pattern, nextLine);
  return `${source.trimEnd()}\n${nextLine}\n`;
}

const env = parseEnv(envSource);
const clientId = requireValue(env, "SPOTIFY_CLIENT_ID");
const clientSecret = requireValue(env, "SPOTIFY_CLIENT_SECRET");
const redirectUri =
  env.SPOTIFY_REDIRECT_URI?.trim() || "http://127.0.0.1:3000/callback";
const redirectUrl = new URL(redirectUri);

if (redirectUrl.protocol !== "http:" || redirectUrl.hostname !== "127.0.0.1") {
  throw new Error(
    "SPOTIFY_REDIRECT_URI must use a 127.0.0.1 loopback URL for this local authorization helper."
  );
}

const state = randomBytes(24).toString("hex");
const authorizeUrl = new URL("https://accounts.spotify.com/authorize");
authorizeUrl.search = new URLSearchParams({
  client_id: clientId,
  response_type: "code",
  redirect_uri: redirectUri,
  scope: "user-read-currently-playing user-read-recently-played",
  state,
  show_dialog: "true",
}).toString();

const server = createServer(async (request, response) => {
  try {
    const callbackUrl = new URL(request.url || "/", redirectUri);

    if (callbackUrl.pathname !== redirectUrl.pathname) {
      response.writeHead(404).end("Not found");
      return;
    }

    if (callbackUrl.searchParams.get("state") !== state) {
      response.writeHead(400).end("Invalid OAuth state. Please restart authorization.");
      return;
    }

    const spotifyError = callbackUrl.searchParams.get("error");
    const code = callbackUrl.searchParams.get("code");
    if (spotifyError || !code) {
      response
        .writeHead(400)
        .end(`Spotify authorization failed: ${spotifyError || "missing code"}`);
      return;
    }

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    const token = await tokenResponse.json();

    if (!tokenResponse.ok || !token.refresh_token) {
      throw new Error(
        token.error_description || token.error || "Spotify did not return a refresh token"
      );
    }

    await writeFile(
      envPath,
      updateEnvValue(envSource, "SPOTIFY_REFRESH_TOKEN", token.refresh_token),
      { mode: 0o600 }
    );

    response
      .writeHead(200, { "Content-Type": "text/plain; charset=utf-8" })
      .end("Spotify is connected. You can close this tab and return to Codex.");
    console.log("\nSpotify reauthorization succeeded. Updated .env.local safely.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    response.writeHead(500).end(`Spotify authorization failed: ${message}`);
    console.error(`\nSpotify authorization failed: ${message}`);
  } finally {
    server.close();
  }
});

server.listen(Number(redirectUrl.port), redirectUrl.hostname, () => {
  console.log("Spotify authorization helper is ready.\n");
  console.log(`1. Register this exact redirect URI in the Spotify dashboard:\n   ${redirectUri}\n`);
  console.log(`2. Open this URL and approve access:\n   ${authorizeUrl.toString()}\n`);
  console.log("Waiting for Spotify to redirect back…");
});
