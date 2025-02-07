const _clientIn = true, _serverIn = true;
const _message = (value, io) => ({value, ...io});

/** I/O socket messages definitions. */
const SOCKET_MESSAGES = {
  Connected: _message('connected', {_clientIn}),
  Fail: _message('fail', {_clientIn}),

  // Lobby
  LobbyJoined: _message('lobby_joined', {_clientIn}),

  // Painting
  Stroke: _message('stroke', {_clientIn, _serverIn}),
  StrokeEnd: _message('stroke_end', {_clientIn, _serverIn}),
  StrokeClear: _message('stroke_clear', {_clientIn, _serverIn}),
  StrokeSettings: _message('stroke_settings', {_clientIn, _serverIn}),
}

const CLIENT_MESSAGE_IN = {/* dynamically populated from SOCKET_MESSAGES */};
const CLIENT_MESSAGE_OUT = {/* dynamically populated from SOCKET_MESSAGES */};
const SERVER_MESSAGE_IN = {/* dynamically populated from SOCKET_MESSAGES */};
const SERVER_MESSAGE_OUT = {/* dynamically populated from SOCKET_MESSAGES */};
// Process message settings
for (const type in SOCKET_MESSAGES) {
  const { value, _clientIn, _serverIn } = SOCKET_MESSAGES[type];
  if (_clientIn) {
    CLIENT_MESSAGE_IN[type] = value;
    SERVER_MESSAGE_OUT[type] = value;
  }
  if (_serverIn) {
    SERVER_MESSAGE_IN[type] = value;
    CLIENT_MESSAGE_OUT[type] = value;
  }
}

export {
  CLIENT_MESSAGE_IN,
  CLIENT_MESSAGE_OUT,
  SERVER_MESSAGE_IN,
  SERVER_MESSAGE_OUT
}
