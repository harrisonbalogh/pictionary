import * as Controller from './controller.js'
import { SERVER_MESSAGE_IN } from '@harxer/painter-lib';


/** Handled inbound socket messages. */
const messageHandler = {
    [SERVER_MESSAGE_IN.DisplayName]: Controller.displayName,
    [SERVER_MESSAGE_IN.Stroke]: Controller.stroke,
    [SERVER_MESSAGE_IN.StrokeEnd]: Controller.strokeEnd,
    [SERVER_MESSAGE_IN.StrokeClear]: Controller.strokeClear,
    [SERVER_MESSAGE_IN.StrokeSettings]: Controller.strokeSettings,
    [SERVER_MESSAGE_IN.LobbyJoin]: Controller.joinLobby,
    [SERVER_MESSAGE_IN.LobbyExit]: Controller.exitLobby,
    [SERVER_MESSAGE_IN.LobbyCreate]: Controller.createLobby,
}

export function socketMessage(user, msg) {
  msg = JSON.parse(msg);

  // Policy: User has to submit displayName before proceeding
  if (user.displayName === undefined && msg.type !== SERVER_MESSAGE_IN.DisplayName) {
    return Controller.fail(user, 'Display name not sent');
  }

  if (!messageHandler[msg.type]) {
    return Controller.fail(user, `Unexpected message type ${msg.type}`)
  }
  messageHandler[msg.type](user, msg.data);
}
