import * as LobbyController from './lobby_controller.js'
import * as GameController from './game_controller.js'
import { fail } from '../server.js';
import { SERVER_MESSAGE_IN, ERROR_MESSAGES } from '@harrisonbalogh/painter-lib';

/** Handled inbound socket messages. */
const messageHandler = {
    [SERVER_MESSAGE_IN.DisplayName]: LobbyController.displayName,
    [SERVER_MESSAGE_IN.KeepAlive]: _ => {/* noop */},

    [SERVER_MESSAGE_IN.GameSettings]: GameController.gameSettings,
    [SERVER_MESSAGE_IN.GameStart]: GameController.startGame,
    [SERVER_MESSAGE_IN.GameGuessWord]: GameController.guessWord,

    [SERVER_MESSAGE_IN.StrokeStart]: GameController.strokeStart,
    [SERVER_MESSAGE_IN.Stroke]: GameController.stroke,
    [SERVER_MESSAGE_IN.StrokeEnd]: GameController.strokeEnd,
    [SERVER_MESSAGE_IN.StrokeClear]: GameController.strokeClear,
    [SERVER_MESSAGE_IN.StrokeSettings]: GameController.strokeSettings,

    [SERVER_MESSAGE_IN.LobbyJoin]: LobbyController.join,
    [SERVER_MESSAGE_IN.LobbyExit]: LobbyController.exit,
    [SERVER_MESSAGE_IN.LobbyCreate]: LobbyController.create,
    [SERVER_MESSAGE_IN.LobbyKick]: LobbyController.kick,
}

export function socketMessage(user, msg) {
  msg = JSON.parse(msg);

  // Policy: User has to submit displayName before proceeding
  if (user.displayName === undefined && msg.type !== SERVER_MESSAGE_IN.DisplayName) {
    return fail(user, ERROR_MESSAGES.DisplayName.NotSet);
  }

  if (!messageHandler[msg.type]) {
    return fail(user, ERROR_MESSAGES.UnknownType)
  }
  messageHandler[msg.type](user, msg.data);
}
