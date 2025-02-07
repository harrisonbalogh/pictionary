const STROKE_SETTINGS_DEFAULT = {
  COLOR: 'black',
  size: 4
}

export default function Lobby() {
  /** Identifier. @type {string} */
  this.id = getUniqueID();
  /** All lobby users. @type {[User]} */
  this.users = [];
  /** All users excluding the owner. @type {[User]} */
  this.peers = [];
  /** User owner. @type {User} */
  this.owner = undefined;
  /** Current painter. @type {User} */
  this.painter = undefined;

  this.strokeSettings = {
    color: STROKE_SETTINGS_DEFAULT.COLOR,
    size: STROKE_SETTINGS_DEFAULT.SIZE
  }

  /** Add user to lobby @param {User} user to add */
  this.addUser = function(user) {
    this.users.push(user);

    // Expects first one to join is the creator
    if (this.owner === undefined) {
      this.owner = user;
      // TEMP: Owner starts as painter
      this.painter = this.owner;
    } else {
      this.peers.push(user);
    }
  }

  /** Remove user from lobby @param {User} user to remove */
  this.removeUser = function(user) {
    // Shift painter if they leave
    if (user === this.painter) {
      this.nextPainter();
    }

    // Policy: owner is reassigned in sequential fashion if current owner exits
    if (user === this.owner) {
      if (this.users.length === 1) {
        this.owner = undefined;
        this.painter = undefined;
      } else {
        this.peers.splice(0, 1)
        this.owner = this.users[0];
      }
    } else {
      this.peers.splice(this.peers.indexOf(user), 1)
    }

    this.users.splice(this.users.indexOf(user), 1)
  }

  this.nextPainter = function() {
    if (this.users.length === 0) {
      // No users
      return;
    }
    if (this.painter === undefined) {
      // TEMP: Start with owner
      this.painter = this.owner;
      return;
    }
    let i = this.users.indexOf(this.painter);
    let iNext = (i + 1) % this.users.length;
    this.painter = this.users[iNext];
  }

  this.lobbyInfo = function() {
    return {
      id: this.id,
      users: this.users.map(u => u.displayName),
      owner: this.owner.displayName,
      painter: this.painter.displayName
    }
  }
}

function getUniqueID() {
  function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return `${s4()}${s4()}-${s4()}`;
};
