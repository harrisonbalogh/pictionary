
import { SERVER_MESSAGE_OUT } from '@harxer/painter-lib';
import { send, nameAvailable} from '../server.js';
import Lobby from '../models/lobby.js';
import User from '../models/user.js';

/** @type {[Lobby]} */
const _lobbies = [];
const findLobby = id => _lobbies.find(lobby => lobby.id === id);

/**
 * Send fail message to msg source socket.
 * @param {User} user Message target.
 * @param {*} error - OPTIONAL Error message sent with message.
 */
export function fail(user, error = 'Unspecified failure') {
  send(user, SERVER_MESSAGE_OUT.Fail, { error });
}

/** Send stroke to all non-painters. @param {User} source Socket ID source. */
export function displayName(source, { displayName }) {
  if (source.displayName !== undefined) return fail(source, "Display name already set");

  if (typeof displayName !== 'string') return fail(source, "Invalid display name");

  // Policy: no white space, only alpha-numeric
  displayName = displayName.trim().replace(/[^a-zA-Z0-9 ]/g, "").replace(/<[^>]*>/g, "");
  if (displayName.length === 0) return fail(source, "Invalid display name");
  if (!nameAvailable(displayName)) return fail(source, "Unavailable display name");

  source.displayName = displayName;
  send(source, SERVER_MESSAGE_OUT.Connected, { displayName });
}

/** Send stroke to all non-painters. @param {User} source Socket ID source. */
export function stroke(source, { x, y }) {
  let lobby = source.lobby;
  if (lobby === undefined) return fail(source, "Not in lobby");
  if (source !== lobby.painter) return fail(source, "Not painter");

  lobby.peers.forEach(user => send(user, SERVER_MESSAGE_OUT.Stroke, { x, y }));
}

/** Send stroke end to all non-painters. @param {User} source Socket ID source. */
export function strokeEnd(source) {
  let lobby = source.lobby;
  if (lobby === undefined) return fail(source, "Not in lobby");
  // TEMP: lobby policy. Owner is considered painter
  if (source !== lobby.painter) return fail(source, "Not painter");

  lobby.peers.forEach(user => send(user, SERVER_MESSAGE_OUT.StrokeEnd));
}

/** Send stroke clear to all non-painters. @param {User} source Socket ID source. */
export function strokeClear(source) {
  let lobby = source.lobby;
  if (lobby === undefined) return fail(source, "Not in lobby");
  // TEMP: lobby policy. Owner is considered painter
  if (source !== lobby.painter) return fail(source, "Not painter");

  lobby.peers.forEach(user => send(user, SERVER_MESSAGE_OUT.StrokeClear));
}

/** Store then send stroke settings to all non-painters. @param {User} source Socket ID source. */
export function strokeSettings(source, { size, color }) {
  let lobby = source.lobby;
  if (lobby === undefined) return fail(source, "Not in lobby");
  // TEMP: lobby policy. Owner is considered painter
  if (source !== lobby.painter) return fail(source, "Not painter");

  lobby.strokeSettings.size = size;
  lobby.strokeSettings.color = color;
  lobby.peers.forEach(user => send(user, SERVER_MESSAGE_OUT.StrokeSettings, { size, color }));
}

export function joinLobby(source, { id: lobbyId }) {
  if (source.lobby !== undefined) return fail(source, "Already in lobby");
  let lobby = findLobby(lobbyId);
  if (lobby === undefined) return fail(source, 'Unknown lobby');

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
  if (lobby === undefined) return fail(source, "Not in lobby");

  // TODO improve coupling
  lobby.removeUser(source);
  source.lobby = undefined;

  // Policy: Remove empty lobbies
  if (lobby.users.length === 0) {
    _lobbies.splice(_lobbies.indexOf(lobby), 1)
  }

  // Notify all lobby members
  lobby.users.forEach(user =>
    send(user, SERVER_MESSAGE_OUT.LobbyJoined, lobby.lobbyInfo())
  );
  // Notify source
  send(source, SERVER_MESSAGE_OUT.LobbyExited)
}

export function createLobby(source) {
  if (source.lobby !== undefined) return fail(source, "Already in lobby");

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
