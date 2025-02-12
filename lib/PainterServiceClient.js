/// App ServiceClient for Painter Service.
///
/// Author: Harrison Balogh (2025)

import { CLIENT_MESSAGE_IN, CLIENT_MESSAGE_OUT } from "./MsgTypes.js";

/** Relay server socket connection. */
let serverSocket;

const supportsWebSocket = _ => ("WebSocket" in window)
const socketOpen = _ => (serverSocket && serverSocket.readyState === serverSocket.OPEN)

/** Notifier functions. */
let notify = {
    lobbyJoined: () => {},
    lobbyExited: () => {},

    close: () => {},
    connected: () => {},

    gameStart: () => {},
    gameEventSelecting: () => {},
    gameEventPainting: () => {},
    gameEventIntermission: () => {},
    gameEventEnded: () => {},
    gameEventCorrectGuess: () => {},
    gameState: () => {},
    stroke: () => {},
    strokeEnd: () => {},
    strokeClear: () => {},
    strokeSettings: () => {},
}
/** TODO */
export const setNotifyLobbyJoined = callback => notify.lobbyJoined = callback
/** TODO */
export const setNotifyLobbyExited = callback => notify.lobbyExited = callback
/** TODO */
export const setNotifyClose = callback => notify.close = callback
/** TODO */
export const setNotifyGameStart = callback => notify.gameStart = callback
/** TODO */
export const setNotifyGameEventSelecting = callback => notify.gameEventSelecting = callback
/** TODO */
export const setNotifyGameEventPainting = callback => notify.gameEventPainting = callback
/** TODO */
export const setNotifyGameEventIntermission = callback => notify.gameEventIntermission = callback
/** TODO */
export const setNotifyGameEventEnded = callback => notify.gameEventEnded = callback
/** TODO */
export const setNotifyGameEventCorrectGuess = callback => notify.gameEventCorrectGuess = callback
/** TODO */
export const setNotifyGameState = callback => notify.gameState = callback
/** TODO */
export const setNotifyStroke = callback => notify.stroke = callback
/** TODO */
export const setNotifyStrokeClear = callback => notify.strokeClear = callback
/** TODO */
export const setNotifyStrokeEnd = callback => notify.strokeEnd = callback
/** TODO */
export const setNotifyStrokeSettings = callback => notify.strokeSettings = callback

/**
 * Opens a WebSocket to Signal server.
 * @param {function} onConnect callback for successful connection with GUID assignment
 * @returns boolean indicating onConnect attached to socket open
 */
export function connect(url, displayName, onConnect, onError = () => {}) {
    if (!supportsWebSocket()) {
        console.error("WebSocket not supported.")
        throw new Error("WebSocket not supported.")
    }

    if (serverSocket) disconnect()

    serverSocket = new WebSocket(url) // TODO: Can pass in 'json' as 2nd arg for auto parsing?

    notify.connected = onConnect

    serverSocket.onmessage = msg => {
        msg = JSON.parse(msg.data)
        if (!messageHandler[msg.type]) {
            console.log(`Unexpected message type ${msg.type}`);
        }
        messageHandler[msg.type](msg.data)
    }
    serverSocket.onopen = _ => {
        // Policy: User submits displayName after connecting to receive GUID
        send(CLIENT_MESSAGE_OUT.DisplayName, { displayName });
    }
    serverSocket.onclose = _ => {
        serverSocket = undefined;
        notify.close();
    }
    serverSocket.onerror = onError
}

/** Closes the socket connection to the relay server. */
export function disconnect() {
    if (serverSocket) serverSocket.close()
    serverSocket = undefined
}

/**
 * Sends a data package to the Relay server. Requires an open Relay socket connection.
 * @param {SEND_TYPE} type - A string enum denoting type of message.
 * @param {*} target - A peer set to receive the package.
 * @param {*} data - JSON for target to receive.
 */
function send(type, data) {
    if (type === undefined) throw Error("RelayClient error. Type is undefined.")
    if (!socketOpen()) return
    serverSocket.send(JSON.stringify({type, data}))
}

/** Handled inbound socket messages. */
const messageHandler = {
    [CLIENT_MESSAGE_IN.Connected]: ({displayName}) => notify.connected(displayName),
    [CLIENT_MESSAGE_IN.Fail]: ({error}) => console.error('Failure response', error),
    [CLIENT_MESSAGE_IN.LobbyJoined]: ({id, users, owner, painter}) => notify.lobbyJoined(id, users, owner, painter),
    [CLIENT_MESSAGE_IN.LobbyExited]: _ => notify.lobbyExited(),

    [CLIENT_MESSAGE_IN.GameStart]: ({ rounds }) => notify.gameStart(rounds),
    [CLIENT_MESSAGE_IN.GameEventSelecting]: ({ guessers, painter, timeRemaining, wordChoices }) => notify.gameEventSelecting(guessers, painter, timeRemaining, wordChoices),
    [CLIENT_MESSAGE_IN.GameEventPainting]: ({ guessers, painter, timeRemaining, wordChoice }) => notify.gameEventPainting(guessers, painter, timeRemaining, wordChoice),
    [CLIENT_MESSAGE_IN.GameEventIntermission]: ({ timeRemaining }) => notify.gameEventIntermission(timeRemaining),
    [CLIENT_MESSAGE_IN.GameEventEnded]: _ => notify.gameEventEnded(),
    [CLIENT_MESSAGE_IN.GameEventCorrectGuess]: ({ userPoints, guesser }) => notify.gameEventCorrectGuess(userPoints, guesser),

    [CLIENT_MESSAGE_IN.Stroke]: ({x, y}) => notify.stroke(x, y),
    [CLIENT_MESSAGE_IN.StrokeEnd]: _ => notify.strokeEnd(),
    [CLIENT_MESSAGE_IN.StrokeClear]: _ => notify.strokeClear(),
    [CLIENT_MESSAGE_IN.StrokeSettings]: ({color, size}) => notify.strokeSettings(color, size),
}

/**
 * Outbound socket message commands.
 * @usage `send.Stroke();`
 * @usage `send.StrokeEnd();`
 * @usage `send.StrokeClear();`
 * @usage `send.StrokeSettings();`
*/
export const message = {
    /** */
    [CLIENT_MESSAGE_OUT.GameStart]: _ => send(CLIENT_MESSAGE_OUT.GameStart),
    /** */
    [CLIENT_MESSAGE_OUT.GameGuessWord]: (word) => send(CLIENT_MESSAGE_OUT.GameGuessWord, { word }),
    /** */
    [CLIENT_MESSAGE_OUT.Stroke]: (x, y) => send(CLIENT_MESSAGE_OUT.Stroke, {x, y}),
    /** */
    [CLIENT_MESSAGE_OUT.StrokeEnd]: (x, y) => send(CLIENT_MESSAGE_OUT.StrokeEnd, {x, y}),
    /** */
    [CLIENT_MESSAGE_OUT.StrokeClear]: _ => send(CLIENT_MESSAGE_OUT.StrokeClear),
    /** */
    [CLIENT_MESSAGE_OUT.StrokeSettings]: (color, size) => send(CLIENT_MESSAGE_OUT.StrokeSettings, {color, size}),
    /** */
    [CLIENT_MESSAGE_OUT.LobbyJoin]: (id) => send(CLIENT_MESSAGE_OUT.LobbyJoin, {id}),
    /** */
    [CLIENT_MESSAGE_OUT.LobbyExit]: _ => send(CLIENT_MESSAGE_OUT.LobbyExit),
    /** */
    [CLIENT_MESSAGE_OUT.LobbyCreate]: _ => send(CLIENT_MESSAGE_OUT.LobbyCreate),
}
