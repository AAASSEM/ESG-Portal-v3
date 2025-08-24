#!/usr/bin/env python3
import http.server
import socketserver
import os
from urllib.parse import urlparse

class ReactRouterHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Parse the URL
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # If it's a file request (has extension) or static assets, serve normally
        if '.' in path.split('/')[-1] or path.startswith('/static'):
            super().do_GET()
            return
        
        # For all other routes (React routes), serve index.html
        self.path = '/index.html'
        super().do_GET()

if __name__ == "__main__":
    PORT = 7702
    Handler = ReactRouterHandler
    
    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            httpd.shutdown()