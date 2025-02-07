const STROKE_SETTINGS_DEFAULT = {
  COLOR: 'black',
  size: 4
}

export default function Lobby() {
  /** Lobby users. @type {[string]} array of user IDs */
  this.users = [];
  /** Excludes the owner. @type {[string]} array of user IDs */
  this.peers = [];
  /** Lobby owner ID. @type {string} ID of user */
  this.owner = undefined;

  this.strokeSettings = {
    color: STROKE_SETTINGS_DEFAULT.COLOR,
    size: STROKE_SETTINGS_DEFAULT.SIZE
  }

  /** Add user to lobby @param {string} id user */
  this.addUser = id => {
    this.users.push(id);

    // TEMP: lobby policy. Assign owner to first joiner if none.
    if (this.owner === undefined) {
      this.owner = id;
    } else {
      this.peers.push(id);
    }
  }

  /** Remove user from lobby @param {string} id user */
  this.removeUser = id => {
    this.users.splice(this.users.indexOf(id), 1)

    // TEMP: lobby policy. Re-assign owner if owner exited
    if (id === this.owner) {
      if (this.users.length === 0) {
        this.owner = undefined;
      } else {
        this.peers.splice(0, 1)
        this.owner = this.users[0];
      }
    } else {
      this.peers.splice(this.peers.indexOf(id), 1)
    }
  }
}
