export const THROW_ERROR = {
  GAME: {
    STARTED: 'Game already started',
    WORD_GEN: 'Error getting word selection',
    SETUP: {
      NO_USERS: 'No users provided'
    },
    SELECT_WORD: {
      NOT_PAINTER: 'Only painter can select word',
      NOT_WORD: 'Not an available word',
      NOT_SELECTING: 'Not in selection phase',
      NO_WORDS: 'No words generated',
    },
    GUESS_WORD: {
      NOT_GUESSER: 'Only guesser can guess word',
      NOT_USER: 'User not in game',
      NOT_PAINTING: 'Not in painting phase',
      ALREADY_GUESSED: 'Already guessed word',
    },
    STATE: {
      NOT_PAINTING: 'Not in painting phase',
      NO_WORD: 'No word selected for painting',
    },
    ADVANCE: {
      UNKNOWN: 'Unknown game state',
      ENDED: 'Game ended'
    },
    NO_PAINT_START: 'Missing paint start time'
  }
}
