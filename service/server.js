import ws from 'ws';
import * as Router from './api/router.js';
import * as LobbyController from './api/lobby_controller.js';
import { SERVER_MESSAGE_OUT, ERROR_MESSAGES, WS_SOCKET_CLOSE_CODE_NORMAL } from '@harrisonbalogh/painter-lib';
import UserModel from './models/user.js';

const _users = [/** UserModel */];

const SOCKET_OPEN = ws.OPEN
const MESSAGE_OUT_TYPES = Object.values(SERVER_MESSAGE_OUT);

const WebSocketServer = ws.Server
const WEBSOCKET_PORT = process.env.PORT || 10004;

/** Amount of time user has to send displayName @type {int} in milliseconds */
const INIT_RESPONSE_TIMER = 3000;

/**
 * Send data packet to given socket.
 * @param {User} user Message target.
 * @param {string} type Allowed server out message.
 * @param {{*}} msg JSON-stringifiable object.
 */
export function send(user, type, data) {
  if (user.socket.readyState !== SOCKET_OPEN) {
    console.log(`Attempted to send '${type}' message to closed socket: ${user.id}`);
    return;
  };
  if (!MESSAGE_OUT_TYPES.includes(type)) {
    console.log(`Attempted to send unknown message type: ${type}`);
    return;
  }

  user.socket.send(JSON.stringify({type, data}));
}

/**
 * Send fail message to msg source socket.
 * @param {User} user Message target.
 * @param {string?} error - OPTIONAL Error message sent with message.
 */
export function fail(user, error = ERROR_MESSAGES.Unspecified) {
  send(user, SERVER_MESSAGE_OUT.Fail, { error });
}

/** Check if a display name is unused. @return {boolean}  */
export function nameAvailable(name) {
  return _users.every(user => user.displayName !== name.toLowerCase().trim());
}

let socketServer = new WebSocketServer({port: WEBSOCKET_PORT});
socketServer.on('connection', (socket, req) => {

  // Inform new client of its GUID
  let user = new UserModel(socket);
  _users.push(user);
  // Policy: ID isn't shared until displayName is sent
  console.log(`${new Date()} - Connected client (${_users.length}) with ID(${user.id})`)

  // Policy: Must set displayName. Timer for checking displayName
  let initTimer = setTimeout(_ => {
    if (user.displayName !== undefined) return;
    socket.close(WS_SOCKET_CLOSE_CODE_NORMAL, ERROR_MESSAGES.DisplayName.NotSet);
  }, INIT_RESPONSE_TIMER)

  socket.on('message', msg => Router.socketMessage(user, msg))
  socket.on('close', _ => {
    if (user.lobby !== undefined) LobbyController.exit(user);
    _users.splice(_users.indexOf(user), 1);

    // Cleanup timer
    clearTimeout(initTimer);

    console.log(`${new Date()} - Disconnect client (${_users.length}) with ID(${user.id})`)
  });
})

console.log(`${new Date()} - Painter service started. Port(${WEBSOCKET_PORT})`);
