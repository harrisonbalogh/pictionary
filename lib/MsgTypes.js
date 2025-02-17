const _clientIn = true, _serverIn = true;
const _message = (value, io) => ({value, ...io});

export const ERROR_MESSAGES = {
  DisplayName: {
    NotSet: 'Display name not set',
    Invalid: 'Invalid display name',
    Unavailable: 'Display name unavailable',
    Unmodifiable: 'Display name already set'
  },
  Lobby: {
    AlreadyIn: 'Already in lobby',
    NotIn: 'Not in lobby',
    NotOwner: 'Not owner',
    NotPainter: 'Not painter',
    NotFound: 'Unknown lobby',
    UserNotFound: 'Unknown target'
  },
  Unspecified: 'Unspecified failure',
  UnknownType: 'Unexpected message type'
}

export const WS_SOCKET_CLOSE_CODE_NORMAL = 1000;

/** I/O socket messages definitions. */
const SOCKET_MESSAGES = {
  DisplayName: _message('display_name', {_serverIn}),
  Connected: _message('connected', {_clientIn}),
  Fail: _message('fail', {_clientIn}),

  // Lobby
  LobbyCreate: _message('lobby_create', {_serverIn}),
  LobbyJoin: _message('lobby_join', {_serverIn}),
  LobbyJoined: _message('lobby_joined', {_clientIn}),
  LobbyExit: _message('lobby_exit', {_serverIn}),
  LobbyExited: _message('lobby_exited', {_clientIn}),
  LobbyKick: _message('lobby_kick', {_serverIn}),

  // Game loop
  GameSettings: _message('game_settings', {_serverIn}),
  GameStart: _message('game_start', {_serverIn}),
  GameStarted: _message('game_started', {_clientIn}),
  GameState: _message('game_state', {_clientIn}),
  GameGuessWord: _message('game_guess_word', {_serverIn}),
  GameEventSelecting: _message('game_event_selecting', {_clientIn}),
  GameEventPainting: _message('game_event_painting', {_clientIn}),
  GameEventWordHint: _message('game_event_word_hint', {_clientIn}),
  GameEventIntermission: _message('game_event_intermission', {_clientIn}),
  GameEventEnded: _message('game_event_ended', {_clientIn}),
  GameEventCorrectGuess: _message('game_event_correct_guess', {_clientIn}),

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
