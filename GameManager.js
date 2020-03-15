class GameManager {
  constructor(max_players){
    this.max_players = max_players;
    this.players = [];
    this.player_names = [];
    this.dict_player_names = {}; // players -> name
    this.voters = [];
    this.drawings = {}; // subjects -> [name, img]
    this.state = 0;
    this.votes = {};
    this.voted = 0;
  }

  startGame(){
    this.players.forEach(
      (value) => {
        this.drawings[value] = [];
        value.send(JSON.stringify({about: 'state', state_id: 'drawing'}));
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
      user.send(JSON.stringify({about: 'op_return', success: false, reason: 'ERROR_GAME_IN_PROGRESS'}))
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
        this.voters.forEach(
          (voter) => {
            voter.send(JSON.stringify({about: 'votes', content: this.drawings, player_names: this.player_names}));
          }
        );
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
            }
          );
          this.voters.forEach(
            (voter) => {
              voter.send(JSON.stringify({about: 'end_game', result: this.votes}));
            }
          );
        }
    }
  }
}

module.exports = GameManager
