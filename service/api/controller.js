
import { SERVER_MESSAGE_OUT } from '@harxer/painter-lib';
import { send, lobby } from '../server.js';

/**
 * Send fail message to msg source socket.
 * @param {string} id Socket ID message target.
 * @param {*} error - OPTIONAL Error message sent with message.
 */
export function fail(id, error = 'Unspecified failure') {
  send(id, SERVER_MESSAGE_OUT.Fail, { error });
}

/** Send stroke to all non-painters. @param {string} source Socket ID source. */
export function stroke(source, { x, y }) {
  // TEMP: lobby policy. Owner is considered painter
  if (source !== lobby.owner) return fail(source, "Not painter");

  lobby.peers.forEach(id => send(id, SERVER_MESSAGE_OUT.Stroke, { x, y }));
}

/** Send stroke end to all non-painters. @param {string} source Socket ID source. */
export function strokeEnd(source) {
  // TEMP: lobby policy. Owner is considered painter
  if (source !== lobby.owner) return fail(source, "Not painter");

  lobby.peers.forEach(id => send(id, SERVER_MESSAGE_OUT.StrokeEnd));
}

/** Send stroke clear to all non-painters. @param {string} source Socket ID source. */
export function strokeClear(source) {
  // TEMP: lobby policy. Owner is considered painter
  if (source !== lobby.owner) return fail(source, "Not painter");

  lobby.peers.forEach(id => send(id, SERVER_MESSAGE_OUT.StrokeClear));
}

/** Store then send stroke settings to all non-painters. @param {string} source Socket ID source. */
export function strokeSettings(source, { size, color }) {
  // TEMP: lobby policy. Owner is considered painter
  if (source !== lobby.owner) return fail(source, "Not painter");

  lobby.strokeSettings.size = size;
  lobby.strokeSettings.color = color;
  lobby.peers.forEach(id => send(id, SERVER_MESSAGE_OUT.StrokeSettings, { size, color }));
}
