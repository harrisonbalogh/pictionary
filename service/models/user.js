import Lobby from './lobby.js';

export default function User(socket) {
  /** Lobby member @type {Lobby} */
  this.lobby = undefined;
  /** Identifier @type {string} */
  this.id = getUniqueID();
  /** WS Socket @type {Socket} */
  this.socket = socket;
  /** Display Name. Policy: Must be set by message from client before proceeding. @type {string} */
  this.displayName = undefined;
}

function getUniqueID() {
  function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return `${s4()}${s4()}-${s4()}`;
};
