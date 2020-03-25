// players.state {hand: [bool], played: [bool], revealed: [bool], score: int, passed: bool}
// state.numFlowers int
// state.numSkulls int
// state.bidPlayer ?int
// state.bid int
// state.numFlipped int
// state.preplace bool

$(document).ready(function() {
	$("#start_over").click(prepare);
	$("#bid_form").submit(bid);
	$("#pass").click(pass);
});

var oldAdvanceTurn = advanceTurn;
advanceTurn = function() {
	while (true) {
		oldAdvanceTurn();
		var player = current().state;
		if (player.passed) continue;
		if (player.hand.length > 0 || player.played.length > 0) break;
	}
};

var oldIsMyTurn = isMyTurn;
isMyTurn = function() {
	if (state.preplace) return needsToPreplace(me());
	return oldIsMyTurn();
};

function needsToPreplace(player) {
	return player.state.played.length === 0 && player.state.hand.length > 0;
}

function bid() {
	setTimeout(function() {
		if (!isMyTurn()) return alert("not your turn");
		var bidAmount = Number.parseInt($("#bid_input").val());
		if (isNaN(bidAmount) || bidAmount <= 0) return alert("invalid bid");
		var maxBid = 0;
		for (var i = 0; i < state.players.length; i++) {
			maxBid += state.players[i].state.played.length;
		}
		if (bidAmount > maxBid) return alert("bid too high");
		state.bid = bidAmount;
		state.bidPlayer = myIndex;
		var message = "bid " + bidAmount;
		if (bidAmount === maxBid || allPassed()) {
			message += " - starting flip";
			state.numFlipped = 0;
		} else {
			advanceTurn();
		}
		sendState(message);
	});
	return false;
}

function pass() {
	if (isMyTurn() && state.bidPlayer !== null) {
		me().state.passed = true;
		var message = "passed";
		if (allPassed()) {
			message +=
				" - [" +
				state.players[state.bidPlayer].name +
				"] starting flip";
			state.currentPlayer = state.bidPlayer;
			state.numFlipped = 0;
		} else {
			advanceTurn();
		}
		sendState(message);
	}
	return false;
}

function flip() {
	if (!isMyTurn() || state.numFlipped === null) return alert("cant flip");
	var index = $(this).attr("data-index");
	if (index !== myIndex && me().state.played.length !== 0)
		return alert("need to flip own tiles first");
	var player = state.players[index];
	var playerState = player.state;
	if (playerState.played.length === 0)
		return alert("player has no played tiles");
	var revealed = playerState.played.pop();
	playerState.revealed.push(revealed);
	var message = "flipped - [" + player.name + "] - ";
	if (revealed) {
		message += "FLOWER";
		if (++state.numFlipped === state.bid) {
			me().state.points++;
			message += " - point awarded";
			finishRound();
		}
	} else {
		message += "SKULL";
		finishRound();
		var myState = me().state;
		if (myState.hand.length === 1 || index !== myIndex) {
			shuffleArray(myState.hand);
			myState.hand.pop();
			myState.hand.sort();
			message += " - and loses a card";
		} else {
			state.numFlipped = -1;
		}
	}
	sendState(message);
}

function finishRound() {
	for (var i = 0; i < state.players.length; i++) {
		var playerState = state.players[i].state;
		playerState.hand.push(...playerState.played.splice(0));
		playerState.hand.push(...playerState.revealed.splice(0));
	}
	resetBid();
}

function allPassed() {
	for (var i = 0; i < state.players.length; i++) {
		if (i === state.bidPlayer) continue;
		if (!state.players[i].passed) return false;
	}
	return true;
}

function play() {
	if (isMyTurn() && state.bidPlayer === null) {
		var index = $(this).attr("data-index");
		me().state.played.push(me().state.hand.splice(index, 1)[0]);
		var message = "placed a tile";
		if (state.preplace) {
			if (allHavePreplaced()) {
				message += " - starting round";
				state.preplace = false;
			}
		} else {
			advanceTurn();
		}
		sendState(message);
	}
}

function allHavePreplaced() {
	for (var i = 0; i < state.players.length; i++) {
		if (needsToPreplace(state.players[i])) return false;
	}
	return true;
}

function prepare() {
	state.currentPlayer = myIndex;
	state.numFlowers = Number.parseInt($("#num_flowers").val());
	state.numSkulls = Number.parseInt($("#num_skulls").val());
	for (var i = 0; i < state.players.length; i++) {
		state.players[i].state = newState();
	}
	resetBid();
	sendState("prepare");
}

function newState() {
	var playerState = {
		points: 0,
		played: [],
		hand: [],
		revealed: []
	};
	for (var i = 0; i < state.numFlowers; i++) {
		playerState.hand.push(true);
	}
	for (var i = 0; i < state.numSkulls; i++) {
		playerState.hand.push(false);
	}
	return playerState;
}

function resetBid() {
	state.bidPlayer = null;
	state.bid = 0;
	state.numFlipped = null;
	for (var i = 0; i < state.players.length; i++) {
		var playerState = state.players[i].state;
		playerState.passed = false;
		playerState.hand.sort();
	}
	state.preplace = true;
}

function penalty() {
	if (!isMyTurn() || state.numFlipped !== -1)
		return alert("cannot pay penalty");
	x = this;
	var index = $(this).attr("data-index");
	me().state.hand.splice(index, 1);
	state.numFlipped = null;
	sendState("discarded a tile");
}

function update() {
	$("#num_flowers").val(state.numFlowers);
	$("#num_skulls").val(state.numSkulls);
	$("#hand").empty();
	for (var i = 0; i < me().state.hand.length; i++) {
		var tile = me().state.hand[i];
		$("<div>")
			.attr("data-index", i)
			.text(tile ? "FLOWER" : "SKULL")
			.addClass("tile")
			.addClass("bubble")
			.addClass("inline")
			.appendTo("#hand");
	}
	$("#players_state").empty();
	for (var i = 0; i < state.players.length; i++) {
		var player = state.players[i];
		$("<div>")
			.attr("data-index", i)
			.addClass("player_state")
			.addClass("bubble")
			.addClass("inline")
			.append($("<p>").text(player.name))
			.append($("<p>").text("points: " + player.state.points))
			.append($("<p>").text("hand: " + player.state.hand.length))
			.append($("<p>").text("played: " + player.state.played.length))
			.append($("<p>").text("revealed: " + player.state.revealed.length))
			.appendTo("#players_state");
	}
	if (isMyTurn() && state.numFlipped === null) {
		var playingFirstTile = state.preplace && me().state.played.length === 0;
		$(".bid_control").prop("disabled", playingFirstTile);
		if (state.bidPlayer === null) {
			$(".tile")
				.addClass("hover_pointer")
				.click(play);
			$("#pass").prop("disabled", true);
		}
	} else {
		$(".bid_control").prop("disabled", true);
		if (isMyTurn()) {
			if (state.numFlipped === -1) {
				$(".tile")
					.addClass("hover_pointer")
					.click(penalty);
				setTimeout(function() {
					alert("select a tile to discard");
				});
			} else {
				$(".player_state")
					.addClass("hover_pointer")
					.click(flip);
			}
		}
	}
}
