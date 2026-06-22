#!/usr/bin/env python3
"""Simple HTTP server that injects version query strings into script tags."""
import http.server, os, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
VERSION = os.popen('git rev-parse --short HEAD 2>/dev/null || date +%s').read().strip()
ORIG_HTML = None

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        global ORIG_HTML
        if self.path == '/':
            if ORIG_HTML is None:
                with open('index.html') as f:
                    ORIG_HTML = f.read()
            # Inject version into script tags: .js" → .js?v=HASH"
            html = ORIG_HTML.replace('.js"', f'.js?v={VERSION}"')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(html.encode('utf-8'))
        else:
            super().do_GET()

print(f'🚀 Summer Adventure v{VERSION}')
print(f'   http://127.0.0.1:{PORT}')
http.server.test(HandlerClass=Handler, port=PORT)
