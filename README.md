# WispCanvasGenerator
Tool for converting Wisp JS Canvas graphics to image files.

## Client

Start web server:

Mac:
> python3 -m http.server --cgi 8080

Windows (requires configuration for JS Mime types):
> python ./run_server.py

## Service

Start API server:

`$env:NODE_ENV="dev";node ./server.js`
