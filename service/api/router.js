import * as LobbyController from './lobby_controller.js'
import * as GameController from './game_controller.js'
import { SERVER_MESSAGE_IN, ERROR_MESSAGES } from '@harxer/painter-lib';

/** Handled inbound socket messages. */
const messageHandler = {
    [SERVER_MESSAGE_IN.DisplayName]: LobbyController.displayName,

    [SERVER_MESSAGE_IN.GameStart]: GameController.startGame,
    [SERVER_MESSAGE_IN.GameGuessWord]: GameController.guessWord,

    [SERVER_MESSAGE_IN.Stroke]: GameController.stroke,
    [SERVER_MESSAGE_IN.StrokeEnd]: GameController.strokeEnd,
    [SERVER_MESSAGE_IN.StrokeClear]: GameController.strokeClear,
    [SERVER_MESSAGE_IN.StrokeSettings]: GameController.strokeSettings,

    [SERVER_MESSAGE_IN.LobbyJoin]: LobbyController.joinLobby,
    [SERVER_MESSAGE_IN.LobbyExit]: LobbyController.exitLobby,
    [SERVER_MESSAGE_IN.LobbyCreate]: LobbyController.createLobby,
}

export function socketMessage(user, msg) {
  msg = JSON.parse(msg);

  // Policy: User has to submit displayName before proceeding
  if (user.displayName === undefined && msg.type !== SERVER_MESSAGE_IN.DisplayName) {
    return Controller.fail(user, ERROR_MESSAGES.DisplayName.NotSet);
  }

  if (!messageHandler[msg.type]) {
    return Controller.fail(user, ERROR_MESSAGES.UnknownType)
  }
  messageHandler[msg.type](user, msg.data);
}
