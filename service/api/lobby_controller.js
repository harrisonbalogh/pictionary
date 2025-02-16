
import { SERVER_MESSAGE_OUT, ERROR_MESSAGES, WS_SOCKET_CLOSE_CODE_NORMAL } from '@harxer/painter-lib';
import { send, fail, nameAvailable } from '../server.js';
import Lobby from '../models/lobby.js';
import User from '../models/user.js';

/** @type {[Lobby]} */
const _lobbies = [];
const findLobby = id => _lobbies.find(lobby => lobby.id === id);

/** Send stroke to all non-painters. @param {User} source Socket ID source. */
export function displayName(source, { displayName }) {
  if (source.displayName !== undefined) return fail(source, ERROR_MESSAGES.DisplayName.Unmodifiable);
  if (typeof displayName !== 'string') {
    // Policy: protocol failed to send valid name
    return source.socket.close(WS_SOCKET_CLOSE_CODE_NORMAL, ERROR_MESSAGES.DisplayName.Invalid);
  }

  // Policy: trimmed white space, only alpha-numeric
  displayName = displayName.trim().replace(/[^a-zA-Z0-9]/g, "").replace(/<[^>]*>/g, "");
  if (displayName.length === 0 || displayName.length > 24) {
    // Policy: protocol failed to send valid name
    return source.socket.close(WS_SOCKET_CLOSE_CODE_NORMAL, ERROR_MESSAGES.DisplayName.Invalid);
  }
  if (!nameAvailable(displayName)) {
    // Policy: protocol failed to send valid name
    return source.socket.close(WS_SOCKET_CLOSE_CODE_NORMAL, ERROR_MESSAGES.DisplayName.Unavailable);
  }

  source.displayName = displayName;
  send(source, SERVER_MESSAGE_OUT.Connected, { displayName });
}

export function joinLobby(source, { id: lobbyId }) {
  if (source.lobby !== undefined) return fail(source, ERROR_MESSAGES.Lobby.AlreadyIn);
  let lobby = findLobby(lobbyId);
  if (lobby === undefined) return fail(source, ERROR_MESSAGES.Lobby.NotFound);

  // TODO improve coupling
  lobby.addUser(source);
  source.lobby = lobby;

  // Notify all lobby members
  lobby.users.forEach(user =>
    send(user, SERVER_MESSAGE_OUT.LobbyJoined, lobby.lobbyInfo())
  );
}

export function exitLobby(source) {
  let lobby = source.lobby;
  if (lobby === undefined) return fail(source, ERROR_MESSAGES.Lobby.NotIn);

  // TODO improve coupling
  lobby.removeUser(source);
  source.lobby = undefined;

  // Policy: Remove empty lobbies
  if (lobby.users.length === 0) {
    _lobbies.splice(_lobbies.indexOf(lobby), 1);
    console.log(`Closed lobby (${_lobbies.length}) with ID(${lobby.id}).`);
  }

  // Notify all lobby members
  lobby.users.forEach(user =>
    send(user, SERVER_MESSAGE_OUT.LobbyJoined, lobby.lobbyInfo())
  );
  // Notify source
  send(source, SERVER_MESSAGE_OUT.LobbyExited)
}

export function createLobby(source) {
  if (source.lobby !== undefined) return fail(source, ERROR_MESSAGES.Lobby.AlreadyIn);

  // Policy: anyone can create a lobby, no limits
  let lobby = new Lobby();
  _lobbies.push(lobby)
  // TEMP logging
  console.log(`Created lobby (${_lobbies.length}) with ID(${lobby.id}).`)

  // TODO improve coupling
  lobby.addUser(source);
  source.lobby = lobby;

  // Notify source
  send(source, SERVER_MESSAGE_OUT.LobbyJoined, lobby.lobbyInfo())
}
