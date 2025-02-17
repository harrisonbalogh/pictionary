import GameState, { GAME_EVENTS } from "./game_state.js";
import { THROW_ERROR } from "../constants.js";
import { SERVER_MESSAGE_OUT } from '@harxer/painter-lib';
import { send } from '../server.js';

const STROKE_SETTINGS_DEFAULT = {
  COLOR: 'black',
  SIZE: 4
}
const GAME_SETTINGS_DEFAULT = {
  ROUNDS: 3,
  TIMER: 30 * 1000,
  WORD_CHOICE_COUNT: 3,
  HINT_COUNT: 2,
}

/** New UserData obj. */
function UserData() {
  this.points = 0;
}

export default function Lobby() {
  /** Identifier. @type {string} */
  this.id = getUniqueID();
  /** All lobby users. @type {[User]} */
  this.users = [];
  /** User owner. @type {User} */
  this.owner = undefined;

  /** GameState reference. If assigned, game has started. @type {GameState} */
  this._gameState = undefined;
  /** Memo set by _gameState handler for quick painter retrieval to approve stroke messages. */
  this.painter = undefined;
  this.guessers = undefined;

  /** Stores lobby information about a user. Resets when user leaves */
  this.userData = {
    /** [id] : { points: {int} } */
  }
  this.gameSettings = {
    rounds: GAME_SETTINGS_DEFAULT.ROUNDS,
    timer: GAME_SETTINGS_DEFAULT.TIMER,
    wordChoiceCount: GAME_SETTINGS_DEFAULT.WORD_CHOICE_COUNT,
    hintCount: GAME_SETTINGS_DEFAULT.HINT_COUNT,
  }

  this.strokeSettings = {
    color: STROKE_SETTINGS_DEFAULT.COLOR,
    size: STROKE_SETTINGS_DEFAULT.SIZE
  }

  /** Add user to lobby @param {User} user to add */
  this.addUser = function(user) {
    this.users.push(user);

    this.userData[user.id] = new UserData();

    // Inform game state
    this._gameState?.addUser(user.id);

    // Expects first one to join is the creator
    if (this.owner === undefined) {
      this.owner = user;
    }
  }

  /** Remove user from lobby @param {User} user to remove */
  this.removeUser = function(user) {
    delete this.userData[user.id];

    // Inform game state
    this._gameState?.removeUser(user);

    // Policy: owner is reassigned in sequential fashion if current owner exits
    if (user === this.owner) {
      if (this.users.length === 1) {
        this.owner = undefined;
      } else {
        this.owner = this.users[1];
      }
    }

    this.users.splice(this.users.indexOf(user), 1);
  }

  /** JSON sendable lobby information. */
  this.lobbyInfo = function() {
    return {
      id: this.id,
      users: this.users.map(u => u.displayName),
      owner: this.owner.displayName,
      settings: this.gameSettings
    }
  }

  /**
   * Starts a game loop.
   * @throws {Error} if game already started
   */
  this.startGame = function() {
    if (this.isGameStarted()) {
      throw Error(THROW_ERROR.GAME.STARTED)
    }

    this._gameState = new GameState(this.users, this.gameSettings, this.gameEventHandler.bind(this));

    // Clear paint
    this.users.forEach(user => send(user, SERVER_MESSAGE_OUT.GameStarted, { rounds: this.gameSettings.rounds }));
  }

  this.setGameSettings = function(settings) {
    if (this.isGameStarted()) {
      throw Error(THROW_ERROR.GAME.STARTED)
    }
    let { rounds, timer, wordChoiceCount, hintCount } = settings;

    if (rounds !== undefined) {
      // Policy: Max rounds 10, min 1
      rounds = Math.max(Math.min(rounds, 10), 1);
      this.gameSettings.rounds = parseInt(rounds);
    }

    if (timer !== undefined) {
      // Policy: Timer maxed at 10 minutes, min 5 seconds
      timer = Math.max(Math.min(timer, 10*60*1000), 5*1000);
      this.gameSettings.timer = parseInt(timer);
    }

    if (wordChoiceCount !== undefined) {
      wordChoiceCount = Math.max(wordChoiceCount, 1);
      this.gameSettings.wordChoiceCount = parseInt(wordChoiceCount);
    }

    if (hintCount !== undefined) {
      hintCount = Math.max(hintCount, 0);
      this.gameSettings.hintCount = parseInt(hintCount);
    }
  }

  /** Handle game state events. */
  this.gameEventHandler = function(event, data) {
    if (event === GAME_EVENTS.Selecting) {
      let { painter, guessers, timeRemaining, wordChoices } = data;
      let selectingData = {
        guessers: guessers.map(guesser => guesser.displayName),
        painter: painter.displayName,
        timeRemaining
      }
      guessers.forEach(guesser => send(guesser, SERVER_MESSAGE_OUT.GameEventSelecting, selectingData));
      // Only painter can see wordChoices
      selectingData.wordChoices = wordChoices;
      send(painter, SERVER_MESSAGE_OUT.GameEventSelecting, selectingData);
    } else
    if (event === GAME_EVENTS.Painting) {
      let { painter, guessers, wordChoice, timeRemaining, wordHint } = data;
      this.painter = painter; // Memo
      this.guessers = guessers; // Memo
      let selectingData = {
        painter: painter.displayName,
        wordHint,
        timeRemaining
      }
      guessers.forEach(guesser => send(guesser, SERVER_MESSAGE_OUT.GameEventPainting, selectingData));
      // Only painter can see wordChoice and ignores wordHint
      selectingData.wordChoice = wordChoice;
      delete selectingData.wordHint;
      send(painter, SERVER_MESSAGE_OUT.GameEventPainting, selectingData)
    } else
    if (event === GAME_EVENTS.PaintHint) {
      let { guessers, painter, wordHint } = data;
      guessers.forEach(guesser => send(guesser, SERVER_MESSAGE_OUT.GameEventWordHint, {
        painter: painter.displayName,
        wordHint
      }));
    } else
    if (event === GAME_EVENTS.CorrectGuess) {
      let { userPoints, guesser } = data;
      this.guessers.concat(this.painter).forEach(user => send(user, SERVER_MESSAGE_OUT.GameEventCorrectGuess, { userPoints, guesser: guesser.displayName }));
    } else
    if (event === GAME_EVENTS.Intermission) {
      let { timeRemaining } = data;
      this.guessers.concat(this.painter).forEach(user => send(user, SERVER_MESSAGE_OUT.GameEventIntermission, { timeRemaining }));
      this.painter = undefined; // Clear memo
      this.guessers = undefined; // Clear memo
    } else
    if (event === GAME_EVENTS.Ended) {
      this.painter = undefined; // Clear memo
      this.guessers = undefined // Clear memo
      this.users.forEach(user => send(user, SERVER_MESSAGE_OUT.GameEventEnded));
      this._gameState = undefined;
    }
  }

  /** @returns {boolean} true if lobby game is in-progress */
  this.isGameStarted = function () {
    return (this._gameState !== undefined);
  }

  this.guessWord = function (source, word) {
    if (!this.isGameStarted()) return;

    if (source == this._gameState._current.painter) {
      try {
        this._gameState.selectWord(source, word);
      } catch (e) {
        console.log(e)
      }
    } else {
      try {
        this._gameState.guessWord(source, word);
      } catch (e) {
        console.log(e)
      }
    }
  }

  this.resolveDisplayName = function(displayName) {
    return this.users.find(user => user.displayName === displayName);
  }
}

function getUniqueID() {
  function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return `${s4()}`;
};
