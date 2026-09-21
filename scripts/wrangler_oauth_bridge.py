#!/usr/bin/env python3
import base64, hashlib, json, secrets, threading, time, urllib.parse, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

CLIENT_ID = "54d11594-84e4-41aa-b438-e81b8fa78ee7"
REDIRECT = "http://localhost:8976/oauth/callback"
AUTH_URL = "https://dash.cloudflare.com/oauth2/auth"
TOKEN_URL = "https://dash.cloudflare.com/oauth2/token"
SCOPES = " ".join([
    "account:read","user:read","workers:write","workers_kv:write","workers_routes:write",
    "workers_scripts:write","workers_tail:read","d1:write","pages:write","zone:read",
    "ssl_certs:write","ai:write","queues:write","pipelines:write","offline_access",
])
CONFIG = Path.home() / ".config/.wrangler/config/default.toml"
STATE_FILE = Path("/tmp/wrangler-oauth-bridge.json")

def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def main():
    verifier = b64url(secrets.token_bytes(32))
    challenge = b64url(hashlib.sha256(verifier.encode()).digest())
    state = secrets.token_urlsafe(24)
    params = {
        "response_type": "code",
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT,
        "scope": SCOPES,
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    url = AUTH_URL + "?" + urllib.parse.urlencode(params)
    STATE_FILE.write_text(json.dumps({"url": url, "state": state, "verifier": verifier}))
    print("AUTH_URL=" + url, flush=True)

    done = {"code": None, "err": None}

    class H(BaseHTTPRequestHandler):
        def do_GET(self):
            u = urllib.parse.urlparse(self.path)
            if u.path != "/oauth/callback":
                self.send_response(404); self.end_headers(); return
            q = urllib.parse.parse_qs(u.query)
            if q.get("state", [None])[0] != state:
                body = b"Stale Authorize tab. Close it and use the newest link only."
                self.send_response(400); self.end_headers(); self.wfile.write(body)
                return
            if "error" in q:
                done["err"] = q["error"][0]
                self.send_response(400); self.end_headers(); self.wfile.write(b"Denied")
                threading.Thread(target=self.server.shutdown, daemon=True).start()
                return
            done["code"] = q.get("code", [None])[0]
            body = b"<html><body><h1>Wrangler login received.</h1><p>You can close this tab.</p></body></html>"
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(body)
            threading.Thread(target=self.server.shutdown, daemon=True).start()
        def log_message(self, *a):
            pass

    httpd = HTTPServer(("127.0.0.1", 8976), H)
    print("LISTENING=127.0.0.1:8976", flush=True)
    httpd.serve_forever()
    if done["err"] or not done["code"]:
        raise SystemExit(f"oauth failed: {done}")

    body = urllib.parse.urlencode({
        "grant_type": "authorization_code",
        "code": done["code"],
        "redirect_uri": REDIRECT,
        "client_id": CLIENT_ID,
        "code_verifier": verifier,
    }).encode()
    req = urllib.request.Request(
        TOKEN_URL, data=body, method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        tok = json.loads(resp.read().decode())
    if "error" in tok:
        raise SystemExit(tok)
    access = tok["access_token"]
    refresh = tok.get("refresh_token", "")
    expires_in = int(tok.get("expires_in", 3600))
    expiry = time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime(time.time() + expires_in))
    scopes = tok.get("scope", SCOPES).split()
    CONFIG.parent.mkdir(parents=True, exist_ok=True)
    scopes_toml = "[" + ", ".join(json.dumps(s) for s in scopes) + "]"
    CONFIG.write_text(
        f'oauth_token = "{access}"\n'
        f'expiration_time = "{expiry}"\n'
        f'refresh_token = "{refresh}"\n'
        f'scopes = {scopes_toml}\n'
    )
    print("WROTE=" + str(CONFIG), flush=True)
    print("OK", flush=True)

if __name__ == "__main__":
    main()
