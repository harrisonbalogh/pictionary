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
  WORD_CHOICE_COUNT: 3
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
    wordChoiceCount: GAME_SETTINGS_DEFAULT.WORD_CHOICE_COUNT
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
      owner: this.owner.displayName
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
    this.users.forEach(user => send(user, SERVER_MESSAGE_OUT.GameStart, { rounds: this.gameSettings.rounds }));
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
      // Clear paint
      this.users.forEach(user => send(user, SERVER_MESSAGE_OUT.StrokeClear));
    } else
    if (event === GAME_EVENTS.Painting) {
      let { painter, guessers, wordChoice, timeRemaining } = data;
      this.painter = painter; // Memo
      this.guessers = guessers; // Memo
      let selectingData = {
        guessers: guessers.map(guesser => guesser.displayName),
        painter: painter.displayName,
        timeRemaining
      }
      guessers.forEach(guesser => send(guesser, SERVER_MESSAGE_OUT.GameEventPainting, selectingData));
      // Only painter can see wordChoice
      selectingData.wordChoice = wordChoice;
      send(painter, SERVER_MESSAGE_OUT.GameEventPainting, selectingData)
    } else
    if (event === GAME_EVENTS.CorrectGuess) {
      let { userPoints, guesser } = data;
      this.users.forEach(user => send(user, SERVER_MESSAGE_OUT.GameEventCorrectGuess, { userPoints, guesser: guesser.displayName }));
    } else
    if (event === GAME_EVENTS.Intermission) {
      this.painter = undefined; // Clear memo
      this.guessers = undefined; // Clear memo
      let { timeRemaining } = data;
      this.users.forEach(user => send(user, SERVER_MESSAGE_OUT.GameEventIntermission, { timeRemaining }));
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
}

function getUniqueID() {
  function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return `${s4()}${s4()}-${s4()}`;
};
