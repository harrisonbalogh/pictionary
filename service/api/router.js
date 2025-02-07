import * as Controller from './controller.js'
import { SERVER_MESSAGE_IN } from '@harxer/painter-lib';


/** Handled inbound socket messages. */
const messageHandler = {
    [SERVER_MESSAGE_IN.Stroke]: Controller.stroke,
    [SERVER_MESSAGE_IN.StrokeEnd]: Controller.strokeEnd,
    [SERVER_MESSAGE_IN.StrokeClear]: Controller.strokeClear,
    [SERVER_MESSAGE_IN.StrokeSettings]: Controller.strokeSettings,
}

export function socketMessage(id, msg) {
  msg = JSON.parse(msg);
  if (!messageHandler[msg.type]) {
    return Controller.fail(id, `Unexpected message type ${msg.type}`)
  }
  messageHandler[msg.type](id, msg.data);
}
