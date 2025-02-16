import { SERVER_MESSAGE_OUT, ERROR_MESSAGES } from '@harxer/painter-lib';
import { send, fail } from '../server.js';
import User from '../models/user.js';

/** Send stroke to all non-painters. @param {User} source Socket ID source. */
export function stroke(source, { x, y }) {
  let lobby = source.lobby;
  if (lobby === undefined) return fail(source, ERROR_MESSAGES.Lobby.NotIn);
  if (source !== lobby.painter) return fail(source, ERROR_MESSAGES.Lobby.NotPainter);

  lobby.guessers.forEach(user => send(user, SERVER_MESSAGE_OUT.Stroke, { x, y }));
}

/** Send stroke end to all non-painters. @param {User} source Socket ID source. */
export function strokeEnd(source) {
  let lobby = source.lobby;
  if (lobby === undefined) return fail(source, ERROR_MESSAGES.Lobby.NotIn);
  if (source !== lobby.painter) return fail(source, ERROR_MESSAGES.Lobby.NotPainter);

  lobby.guessers.forEach(user => send(user, SERVER_MESSAGE_OUT.StrokeEnd));
}

/** Send stroke clear to all non-painters. @param {User} source Socket ID source. */
export function strokeClear(source) {
  let lobby = source.lobby;
  if (lobby === undefined) return fail(source, ERROR_MESSAGES.Lobby.NotIn);
  if (source !== lobby.painter) return fail(source, ERROR_MESSAGES.Lobby.NotPainter);

  lobby.guessers.forEach(user => send(user, SERVER_MESSAGE_OUT.StrokeClear));
}

/** Store then send stroke settings to all non-painters. @param {User} source Socket ID source. */
export function strokeSettings(source, { size, color }) {
  let lobby = source.lobby;
  if (lobby === undefined) return fail(source, ERROR_MESSAGES.Lobby.NotIn);
  if (source !== lobby.painter) return fail(source, ERROR_MESSAGES.Lobby.NotPainter);

  lobby.strokeSettings.size = size;
  lobby.strokeSettings.color = color;
  lobby.guessers.forEach(user => send(user, SERVER_MESSAGE_OUT.StrokeSettings, { size, color }));
}

export function startGame(source) {
  let lobby = source.lobby;
  if (lobby === undefined) return fail(source, ERROR_MESSAGES.Lobby.NotIn);
  if (source !== lobby.owner) return fail(source, ERROR_MESSAGES.Lobby.NotOwner);

  lobby.startGame();
}

export function guessWord(source, { word }) {
  let lobby = source.lobby;
  if (lobby === undefined) return fail(source, ERROR_MESSAGES.Lobby.NotIn);

  lobby.guessWord(source, word);
}
