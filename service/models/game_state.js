import { THROW_ERROR } from "../constants.js";
import User from "./user.js";

const STATE = {
  Starting: 0,
  Selecting: 1,
  Painting: 2,
  Intermission: 3,
  Ended: 4
}
export const GAME_EVENTS = {
  Selecting: 'selecting',
  Painting: 'painting',
  PaintHint: 'paint_hint',
  Intermission: 'intermission',
  CorrectGuess: 'user_correct',
  Ended: 'ended'
}

// STARTING - 3 second startup time
// ==== loop for each round x3
// SELECTING - current painter is selecting a word
// PAINTING - current painter is painting
// INTERMISSION - round summary information, data presentation
// ==== end loop
// ENDED - no more actions

const LETTER_REGEX = /[a-zA-Z]/g;

/**
 * @param {[int]} users array of users
 */
export default function GameState(users, {hintCount, rounds, timer, wordChoiceCount}, eventHandler) {
  if (users.length === 0) throw Error(THROW_ERROR.GAME.SETUP.NO_USERS);

  /**
   * Game state memos.
   * @private
   */
  this._current = {
    /** Current game state. @type {STATE} */
    state: STATE.Starting,

    /** Current game round. Starting from 1. @type {int} */
    round: 1,

    /**
     * Current game painter.
     * If undefined, game hasn't started or it ended.
     * @type {User?} User painter or undefined if no painter
     */
    painter: undefined,

    /** Current set of users guessing. @type {[User]} */
    guessers: [...users],

    /** Memo of `_current.wordChoice`. */
    _wordChoice: undefined,
    /**
     * Painter's word selection. If undefined, painter is selecting.
     * This should only contain letters and spaces.
     * @type {string?}
     */
    get wordChoice() {
      return this._wordChoice;
    },
    set wordChoice(word) {
      if (word === undefined) {
        this._wordChoice = undefined;
        this.wordHint = undefined;
        this.hintsGiven = undefined;
      } else {
        this._wordChoice = word;
        this.hintsGiven = 0;
        this.wordHint = word.replaceAll(LETTER_REGEX, '_');
      }
    },

    /**
     * Guesser's hint of painter's selected word. Letters from `_current.wordChoice` are
     * replaced with underscores and hints replace underscores with letters from selected word.
     * @type {string}
     */
    wordHint: undefined,

    /** Number of letters revealed in this round. @type {int?} if undefined, not in painting state */
    hintsGiven: undefined,

    /** Painter's word options. If undefined, painter is not selecting. @type {[string]?} */
    wordChoices: undefined,

    /** @type {[User]} Array of users in game order.  */
    users: [...users],

    /** @type {int} users with correct answer */
    correctUsers: [],

    /** Start time of painting phase. If undefined, not painting. @type {int?} */
    paintingStartTime: undefined
  }

  /** Tracks user points for this game. */
  this._current.userPoints = {};
  users.forEach(user => this._current.userPoints[user.displayName] = 0)

  this._data = {
    /** Set at initialization. @type {int} total number of rounds */
    rounds: rounds,

    /** Number of letters revealed from `_current.wordChoice`. Revealed at equal intervals. */
    hintCount: hintCount,

    /** TODO - Note and avoid used words */
    // usedWords: [],

    /**
     * @type {[string]} All available words.
     *
     * !!! Each word should only use letters and spaces.
     */
    wordChoices: [
      'The Big Apple', 'My Pocket Banana', 'The Ugly Orange', 'A Tiny Kiwi', 'Oh Fango Mango'
    ],

    /** @type {int} Number of words painter can select from */
    wordChoiceCount: wordChoiceCount,

    /** Called when game events occur. */
    eventHandler: eventHandler,
  }

  const TIMING_START_DELAY = 3000;
  const TIMING_SELECTING = 5000;
  const TIMING_PAINTING = timer;
  const TIMING_INTERMISSION = 3000;

  /** @type {Timeout} For game state machine next state check */
  this._advanceTimer;
  /** @type {Timeout} For painting stage hint reveals */
  this._wordHintTimer;

  /** Game state machine tick */
  this._advanceGame = () => {
    clearTimeout(this._advanceTimer);
    if (this._current.state === STATE.Ended) throw Error(THROW_ERROR.GAME.ADVANCE.ENDED)

    const selectingState = () => {
      this._nextPainter();
      this._generateWordChoices();

      // State updates
      this._current.state = STATE.Selecting;
      this._data.eventHandler(GAME_EVENTS.Selecting, {
        painter: this._current.painter,
        guessers: this._current.guessers,
        wordChoices: this._current.wordChoices,
        timeRemaining: TIMING_SELECTING
      });
      this._advanceTimer = setTimeout(this._advanceGame.bind(this), TIMING_SELECTING);
    }

    if (this._current.state === STATE.Starting) {
      selectingState();
      return;
    }

    if (this._current.state === STATE.Selecting) {
      if (this._current.wordChoices === undefined || this._current.wordChoices.length === 0) throw Error(THROW_ERROR.GAME.SELECT_WORD.NO_WORDS);

      // Check if user did not select a word - select one randomly
      if (this._current.wordChoice == undefined) {
        this._current.wordChoice = this._current.wordChoices[Math.floor(Math.random() * this._current.wordChoices.length)].toLowerCase().trim();
      }
      this._current.wordChoices = undefined; // Not retaining choices after selection phase
      this._current.paintingStartTime = Date.now();

      // State updates
      this._current.state = STATE.Painting;
      this._data.eventHandler(GAME_EVENTS.Painting, {
        painter: this._current.painter,
        guessers: this._current.guessers,
        wordChoice: this._current.wordChoice,
        wordHint: this._current.wordHint,
        timeRemaining: TIMING_PAINTING
      });
      this._advanceTimer = setTimeout(this._advanceGame.bind(this), TIMING_PAINTING);
      if (this._data.hintCount > 0) {
        let hintInterval = TIMING_PAINTING / (this._data.hintCount + 1);
        const sendNextHint = _ => {
          this._current.hintsGiven += 1;

          // Select random letter to reveal
          let underscoreIndices = [];
          for (let i = 0; i < this._current.wordHint.length; i++) {
            if (this._current.wordHint[i] === '_') {
              underscoreIndices.push(i);
            }
          }
          if (underscoreIndices.length <= 1) return; // Dont reveal last letter... TODO limit hints more...
          let revealIndex = underscoreIndices[Math.floor(Math.random() * underscoreIndices.length)];
          this._current.wordHint = this._current.wordHint.slice(0, revealIndex) + this._current.wordChoice[revealIndex] + this._current.wordHint.slice(revealIndex + 1);

          this._data.eventHandler(GAME_EVENTS.PaintHint, {
            painter: this._current.painter,
            guessers: this._current.guessers,
            wordHint: this._current.wordHint
          });
          if (this._current.hintsGiven < this._data.hintCount) {
            this._wordHintTimer = setTimeout(sendNextHint, hintInterval);
          }
        }
        this._wordHintTimer = setTimeout(sendNextHint, hintInterval);
      }
      return;
    }

    if (this._current.state === STATE.Painting) {
      this._current.correctUsers = []; // Reset correct users
      this._current.paintingStartTime = undefined;
      clearTimeout(this._wordHintTimer); // In case we skip ahead to Intermission

      // State updates
      this._current.state = STATE.Intermission;
      this._data.eventHandler(GAME_EVENTS.Intermission, {
        timeRemaining: TIMING_INTERMISSION
      });
      this._advanceTimer = setTimeout(this._advanceGame.bind(this), TIMING_INTERMISSION);
      return;
    }

    if (this._current.state === STATE.Intermission) {
      // Game over
      if (this._current.round >= this._data.rounds && this._current.painter === this._current.users[this._current.users.length - 1]) {
        this._current.painter = undefined;
        // State updates
        this._current.state = STATE.Ended;
        this._data.eventHandler(GAME_EVENTS.Ended, { userPoints: this._current.userPoints });
        //   No timer set here, game loop ended
      } else {
        selectingState();
      }
      return;
    }

    throw Error(THROW_ERROR.GAME.ADVANCE.UNKNOWN);
  }

  // GAME LOOP start
  this._advanceTimer = setTimeout(this._advanceGame.bind(this), TIMING_START_DELAY);

  /** Builds serializable game state object. */
  this.gameInfo = function() {
    let info = {
      painterId: this._current.painter.id,
      round: this._current.round,
      state: this._current.state,
      userPoints: this._current.userPoints,
      wordChoice: this._current.wordChoice
    };
    // Get remaining time for painting
    if (this._current.state === STATE.Painting) {
      info.timeRemaining = this._getRemainingPaintTime();
    }
    return info;
  }

  /** Move to next painter in this._current.users, or set to first user if no painter yet. */
  this._nextPainter = function() {
    if (this._current.painter === undefined) {
      this._current.painter = this._current.users[0];
      this._current.guessers.splice(0, 1);
      return;
    }
    let i = this._current.users.indexOf(this._current.painter);
    let iNext = (i + 1) % this._current.users.length;
    this._current.guessers.splice(i, 0, this._current.painter);
    this._current.guessers.splice(iNext, 1);
    this._current.painter = this._current.users[iNext];
    // When finished with all users, go to next round
    if (iNext === 0) {
      this._current.round += 1;
    }
  }

  /** Populate current.wordChoices and clear current.wordChoice */
  this._generateWordChoices = () => {
    if (this._data.wordChoices.length < this._data.wordChoiceCount) {
      this._current.wordChoices = this._data.wordChoices;
      this._current.wordChoice = undefined;
      return;
    }

    let currentWordChoiceIndexes = [];

    wordGen: for (let i = 0; i < this._data.wordChoiceCount; i++) {
      let random = Math.floor(Math.random() * this._data.wordChoices.length);

      let MAX_COLLISION_RESOLUTION = 1000;
      collision: for (let collisionLoop = 0; collisionLoop < MAX_COLLISION_RESOLUTION; collisionLoop++) {
        if (currentWordChoiceIndexes.includes(random)) {
          random = (random + 1) % this._data.wordChoices.length;
          continue collision;
        }
        currentWordChoiceIndexes.push(random);
        continue wordGen;
      }

      throw Error(THROW_ERROR.GAME.WORD_GEN);
    }

    this._current.wordChoices = currentWordChoiceIndexes.map(i => this._data.wordChoices[i]);
    this._current.wordChoice = undefined;
  }

  // Join game in-progress
  this.addUser = function(user) {
    // TODO - wait for current state to end
  }

  //
  this.removeUser = function(user) {
    // End game if no users remain
    if (this._current.users.length === 1) {
      clearTimeout(this._advanceTimer);
      // TODO - Shouldnt be manually setting state, have to then remember to clear timeouts
      clearTimeout(this._wordHintTimer);
      this._current.state = STATE.Ended;
      this._data.eventHandler(GAME_EVENTS.Ended, { userPoints: {} });
      return;
    }

    if (user === this._current.painter && [STATE.Selecting, STATE.Painting].includes(this._current.state)) {
      this._current.state = STATE.Intermission; // We shouldn't be setting _current.state outside of _advanceGame function
      clearTimeout(this._wordHintTimer); // Since we manually set state, clear word hint Timeout
      this._advanceGame();

      // TODO - cheat vector
      // If a user leaves midway through paintinig, it should undo paints distributed to guessers
    }
    if (this._current.state !== STATE.Ended) {
      // Remove user from mem.
      this._current.users.splice(this._current.users.indexOf(user), 1);
      this._current.guessers.splice(this._current.guessers.indexOf(user), 1);
      delete this._current.userPoints[user.displayName];
    }
  }

  this.selectWord = function(source, word) {
    if (source !== this._current.painter) throw Error(THROW_ERROR.GAME.SELECT_WORD.NOT_PAINTER);
    if (this._current.state !== STATE.Selecting) throw Error(THROW_ERROR.GAME.SELECT_WORD.NOT_SELECTING);
    if (this._current.wordChoices === undefined ||
        this._current.wordChoices.length === 0) throw Error(THROW_ERROR.GAME.SELECT_WORD.NO_WORDS);
    if (!this._current.wordChoices.map(word => word.toLowerCase()).includes(word.trim().toLowerCase())) throw Error(THROW_ERROR.GAME.SELECT_WORD.NOT_WORD);

    this._current.wordChoice = word.trim().toLowerCase();

    // Skip remaining selection phase
    this._advanceGame();
  }

  this.guessWord = function(source, word) {
    if (!this._current.users.includes(source)) throw Error(THROW_ERROR.GAME.GUESS_WORD.NOT_USER);
    if (this._current.painter === source) throw Error(THROW_ERROR.GAME.GUESS_WORD.NOT_GUESSER);
    if (this._current.state !== STATE.Painting) throw Error(THROW_ERROR.GAME.STATE.NOT_PAINTING);
    if (this._current.correctUsers.includes(source)) throw Error(THROW_ERROR.GAME.GUESS_WORD.ALREADY_GUESSED);
    if (this._current.wordChoice === undefined) throw Error(THROW_ERROR.GAME.STATE.NO_WORD);

    if (word.trim().toLowerCase() === this._current.wordChoice) {
      // Word guessed!
      let awardPoints = this._getPointAwards();
      this._current.userPoints[source.displayName] += awardPoints;
      // Give painter a percent of points based on number of guessers
      if (this._current.guessers.length > 1) {
        this._current.userPoints[this._current.painter.displayName] += awardPoints * (1 / (this._current.guessers.length))
      }

      this._current.correctUsers.push(source);
      this._data.eventHandler(GAME_EVENTS.CorrectGuess, {
        userPoints: this._current.userPoints,
        guesser: source
      });

      // Skip remaining painting phase if all users guessed
      if (this._current.users.length - 1 === this._current.correctUsers.length) {
        this._advanceGame();
      }
    }
  }

  /**
   * Gets time into paint phase.
   * @throws {Error} if not in paint phase or paint start time has not bee recorded.
   * @returns {int} milliseconds of time painting as been going
   */
  this._getPaintTimeElapsed = () => {
    if (this._current.state !== STATE.Painting) throw Error(THROW_ERROR.GAME.STATE.NOT_PAINTING);
    if (this._current.paintingStartTime === undefined) throw Error(THROW_ERROR.GAME.NO_PAINT_START);

    return Date.now() - this._current.paintingStartTime;
  }

  /**
   * Gets remaining time to paint.
   * @returns {int} milliseconds of time remaining
   */
  this._getRemainingPaintTime = () => {
    return (TIMING_PAINTING - this._getPaintTimeElapsed());
  }

  /** Calculate reward for correct guess. */
  this._getPointAwards = function() {
    if (this._current.state !== STATE.Painting) throw Error(THROW_ERROR.GAME.STATE.NOT_PAINTING);

    const MAX_POINTS = 300;
    const MIN_POINTS = 20;
    // Goes from 1 to 0 based on total painting time and time since painting started
    let timePercent = this._getRemainingPaintTime() / TIMING_PAINTING;
    return Math.floor(MIN_POINTS + (MAX_POINTS - MIN_POINTS) * timePercent);
  }
}
