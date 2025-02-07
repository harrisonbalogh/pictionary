import ws from 'ws';
import * as Router from './api/router.js';
import { SERVER_MESSAGE_OUT } from '@harxer/painter-lib';
import LobbyModel from './models/lobby.js';

const _userMap = {/** id: Socket */};
const _sockets = [/** Socket */];

const SOCKET_OPEN = ws.OPEN
const MESSAGE_OUT_TYPES = Object.values(SERVER_MESSAGE_OUT);

// TEMP: singleton lobby
export const lobby = new LobbyModel()
// exports.lobbies = []; // {gameModel.users: []}

const WebSocketServer = ws.Server
const WEBSOCKET_PORT = process.env.PORT || 8082;

/**
 * Send data packet to given socket.
 * @param {string} id Socket ID message target.
 * @param {string} type Allowed server out message.
 * @param {{*}} msg JSON-stringifiable object.
 */
export function send(id, type, data) {
  let socket = _userMap[id];
  if (socket === undefined) {
    console.log(`Attempted to send '${type}' message to unknown ID: ${id}`);
    return;
  }
  if (socket.readyState !== SOCKET_OPEN) {
    console.log(`Attempted to send '${type}' message to closed socket: ${id}`);
    return;
  };
  if (!MESSAGE_OUT_TYPES.includes(type)) {
    console.log(`Attempted to send unknown message type: ${type}`);
    return;
  }

  socket.send(JSON.stringify({type, data}));
}

let socketServer = new WebSocketServer({port: WEBSOCKET_PORT});
socketServer.on('connection', (socket, req) => {

  // Inform new client of its GUID
  _sockets.push(socket);
  let id = getUniqueID();
  _userMap[id] = socket;
  send(id, SERVER_MESSAGE_OUT.Connected, { guid: id });
  console.log(`${new Date()} - Connected client (${lobby.users.length}) with ID(${id}) from IP(${req.headers['x-real-ip']}).`)

  // TEMP: Forced join singleton lobby
  lobby.addUser(id)
  // TEMP: Forced join singleton lobby
  lobby.users.forEach(id => send(id, SERVER_MESSAGE_OUT.LobbyJoined, { users: lobby.users, owner: lobby.owner }))

  socket.on('message', msg => Router.socketMessage(id, msg))
  socket.on('close', _ => {
    lobby.removeUser(id)
    lobby.users.forEach(id => send(id, SERVER_MESSAGE_OUT.LobbyJoined, { users: lobby.users, owner: lobby.owner }))
    delete _userMap[id];
  })
})

function getUniqueID() {
  function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return `${s4()}${s4()}-${s4()}`;
};

console.log(`${new Date()} - Painter service started. Port(${WEBSOCKET_PORT})`);
