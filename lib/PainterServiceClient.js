/// App ServiceClient for Painter Service.
///
/// Author: Harrison Balogh (2025)

import { CLIENT_MESSAGE_IN as MSG_IN, CLIENT_MESSAGE_OUT as MSG_OUT } from "./MsgTypes.js";

const supportsWebSocket = _ => ("WebSocket" in window)

export default class PainterServerSocket extends EventTarget {
    constructor(url, displayName, onConnect, onError = () => {}) {
        super(); // Event Target

        if (!supportsWebSocket()) {
            console.error("WebSocket not supported.")
            throw new Error("WebSocket not supported.")
        }

        /** Relay server socket connection. */
        this.serverSocket = new WebSocket(url) // TODO: Can pass in 'json' as 2nd arg for auto parsing?

        this.addEventListener(MSG_IN.Connected, onConnect);

        this.serverSocket.onmessage = msg => {
            msg = JSON.parse(msg.data);
            this.dispatchEvent(new CustomEvent(msg.type, { detail: msg.data }));
        }

        // Policy: User submits displayName after connecting to receive GUID
        this.serverSocket.onopen = _ => this._message(MSG_OUT.DisplayName, { displayName });

        this.serverSocket.onclose = _ => {
            this.serverSocket = undefined;
            this.dispatchEvent(new CustomEvent("close"));
        }

        this.serverSocket.onerror = onError
    }

    socketOpen() {
        return (this.serverSocket && this.serverSocket.readyState === this.serverSocket.OPEN);
    }

    disconnect() {
        if (this.serverSocket) this.serverSocket.close()
        this.serverSocket = undefined
    }

    _message(type, data) {
        if (type === undefined) throw Error("RelayClient error. _message type is undefined.")
        if (!this.socketOpen()) return;
        this.serverSocket.send(JSON.stringify({type, data}))
    }

    sendGameSettings(settings) {
        this._message(MSG_OUT.GameSettings, { settings });
    }
    sendGameStart() {
        this._message(MSG_OUT.GameStart);
    }
    sendGameGuessWord(word) {
        this._message(MSG_OUT.GameGuessWord, { word });
    }
    sendStroke(x, y) {
        this._message(MSG_OUT.Stroke, { x, y });
    }
    sendStrokeEnd(x, y) {
        this._message(MSG_OUT.StrokeEnd, { x, y });
    }
    sendStrokeClear() {
        this._message(MSG_OUT.StrokeClear);
    }
    sendStrokeSettings(color, size) {
        this._message(MSG_OUT.StrokeSettings, { color, size });
    }
    sendLobbyJoin(id) {
        this._message(MSG_OUT.LobbyJoin, { id });
    }
    sendLobbyExit() {
        this._message(MSG_OUT.LobbyExit);
    }
    sendLobbyKick() {
        this._message(MSG_OUT.LobbyKick);
    }
    sendLobbyCreate() {
        this._message(MSG_OUT.LobbyCreate);
    }
}
