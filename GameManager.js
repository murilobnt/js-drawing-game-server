class GameManager {
  constructor(max_players, rounds){
    this.max_players = max_players;
    this.rounds = rounds;
    this.possible_subjects = [
      'smiley face',
      'house',
      'tree',
      'boat',
      'computer',
      'flower',
      'cat',
      'dog',
      'lake',
      'desert',
      'snowy mountain',
      'bird',
      'celebrity',
      'cowboy',
      'car',
      'plane',
      'cool person',
      'skater',
      'silly face',
      'vampire',
      'zombie'
    ]
    this.initialState();
  }

  initialState(){
    this.started = false;
    this.players = [];
    this.player_names = [];
    this.dict_player_names = {}; // players -> name
    this.voters = [];
    this.drawings = {}; // subjects -> [name, img]
    this.votes = {};
    this.voted = 0;
    this.subjects = [];
  }

// from: https://stackoverflow.com/questions/19269545/how-to-get-n-no-elements-randomly-from-an-array
  getRandom(arr, n) {
    var result = new Array(n),
        len = arr.length,
        taken = new Array(len);
    if (n > len)
        throw new RangeError("getRandom: more elements taken than available");
    while (n--) {
        var x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
  }

  startGame(){
    this.started = true;
    this.subjects = this.getRandom(this.possible_subjects, this.rounds);
    this.players.forEach(
      (value) => {
        this.drawings[value] = [];
        value.send(JSON.stringify({about: 'start_drawing', state_id: 'drawing', subjects: this.subjects}));
      }
    );
  }

  joinPlayers(user, name, cli_hash){
    if(this.players.length < this.max_players){
      this.dict_player_names[cli_hash] = name;
      this.players.push(user);
      this.player_names.push(name);
      user.send(JSON.stringify({success: true}));
      if(this.players.length == this.max_players){
        this.player_names.forEach((player) => {
          this.votes[player] = 0;
        });
        this.startGame();
      }
    } else {
      user.send(JSON.stringify({about: 'abort_game', reason: 'Game in progress'}))
    }
  }

  resetGame(reason){
    this.players.forEach(
      (player) => {
        player.send(JSON.stringify({about: 'abort_game', reason: reason}));
      }
    );
    this.voters.forEach(
      (voter) => {
        voter.send(JSON.stringify({about: 'abort_game', reason: reason}));
      }
    );
    this.initialState();
  }

  onDisconnect(user){
    if(this.voters.indexOf(user) > -1){
      this.voters.splice(this.voters.indexOf(user), 1);
    } else if(this.players.indexOf(user) > -1) {
      if(this.started){
        this.resetGame("A player disconnected");
      } else {
        this.players.splice(this.players.indexOf(user), 1);
      }
    }
  }

  handleMessage(user, message_json){
    switch(message_json.action){
      case 'join_players':
        this.joinPlayers(user, message_json.name, message_json.cli_hash)
      break;
      case 'join_voters':
        this.voters.push(user);
        user.send(JSON.stringify({success: true}));
      break;
      case 'send_drawing':
        if ( typeof this.drawings[message_json.subject] == 'undefined' || !this.drawings[message_json.subject] ){
          this.drawings[message_json.subject] = []
        }
        this.drawings[message_json.subject].push({from: this.dict_player_names[message_json.cli_hash], img: message_json.img});
        if(this.drawings[message_json.subject].length == this.max_players){
          this.players.forEach(
            (player) => {
              player.send(JSON.stringify({about: 'next_drawing'}));
            }
          );
        }
      break;
      case 'ready_for_votes':
        if(this.voters.length == 0) {
          user.send(JSON.stringify({about: 'abort_game', reason: 'No voters'}));
          this.initialState();
        } else {
          this.voters.forEach(
            (voter) => {
              voter.send(JSON.stringify({about: 'votes', content: this.drawings, player_names: this.player_names}));
            }
          );
        }
      break;
      case 'end_votes':
        this.player_names.forEach((player) => {
          this.votes[player] = this.votes[player] + message_json.votes[player];
        });
        this.voted = this.voted + 1;
        if(this.voted == this.voters.length ){
          this.players.forEach(
            (player) => {
              player.send(JSON.stringify({about: 'end_game', result: this.votes}));
              player.close();
            }
          );
          this.voters.forEach(
            (voter) => {
              voter.send(JSON.stringify({about: 'end_game', result: this.votes}));
              voter.close();
            }
          );
          this.initialState();
        }
    }
  }
}

module.exports = GameManager
