const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

class Player {
	constructor(id, x = 50, y = 50, color = 'blue') {
		this.id = id;
		this.x = x;
		this.y = y;
		this.color = color;
	}

	updatePosition(newX, newY) {
		this.x = newX;
		this.y = newY;
	}
}

class Room {
	constructor(roomId) {
		this.roomId = roomId;
		this.players = {}; // Armazena os jogadores na sala
	}

	addPlayer(player) {
		this.players[player.id] = player;
		console.log(`Novo player conectado ${player.id}`);
	}

	removePlayer(playerId) {
		delete this.players[playerId];
	}

	updatePlayer(playerId, newX, newY) {
		if (this.players[playerId]) {
			this.players[playerId].updatePosition(newX, newY);
		}
	}

	getState() {
		const state = {};
		for (let playerId in this.players) {
			const player = this.players[playerId];
			state[playerId] = { x: player.x, y: player.y, color: player.color };
		}
		return state;
	}
}

class GameServer {
	constructor(io) {
		this.rooms = {}; // Salas de jogo
		this.io = io;

		this.io.on('connection', (socket) => this.onConnection(socket));
		console.log('Servidor Socket.IO rodando');
	}

	onConnection(socket) {
		let playerId = socket.id; // Usa o ID do socket como ID do jogador
		let roomId = null;

		console.log(`Novo cliente conectado: ${playerId}`);

		socket.on('joinRoom', (data) => {
			roomId = data.room;
			socket.join(roomId); // Adiciona o cliente à sala do Socket.IO

			// Cria a sala se ainda não existir
			if (!this.rooms[roomId]) {
				this.rooms[roomId] = new Room(roomId);
				console.log(`Nova sala criada: ${roomId}`);
			}

			// Cria um novo jogador e o adiciona à sala
			const player = new Player(playerId, data.x || 50, data.y || 50, data.color || 'blue');
			this.rooms[roomId].addPlayer(player);

			// Envia o estado inicial da sala para o novo cliente
			socket.emit('init', this.rooms[roomId].getState());

			// Notifica todos os jogadores na sala sobre o novo jogador
			this.broadcastToRoom(roomId);
		});

		// Atualiza a posição do jogador e retransmite o estado da sala
		socket.on('updatePosition', (data) => {
			if (roomId && this.rooms[roomId]) {
				const room = this.rooms[roomId];
				room.updatePlayer(playerId, data.x, data.y);
				this.broadcastToRoom(roomId); // Envia o estado atualizado da sala
			}
		});

		socket.on('disconnect', () => {
			console.log(`Cliente desconectado: ${playerId}`);
			if (roomId && this.rooms[roomId]) {
				const room = this.rooms[roomId];
				room.removePlayer(playerId);

				// Remove a sala se estiver vazia
				if (Object.keys(room.players).length === 0) {
					delete this.rooms[roomId];
				} else {
					this.broadcastToRoom(roomId); // Atualiza a sala restante
				}
			}
		});
	}

	broadcastToRoom(roomId) {
		const room = this.rooms[roomId];
		if (!room) return; // Verifica se a sala existe

		const state = room.getState(); // Estado atualizado da sala

		// Emite o estado atualizado para todos os clientes na sala
		this.io.to(roomId).emit('stateUpdate', state);
	}
}

// Configuração do Express e do Servidor HTTP
const app = express();
const server = http.createServer(app);
const io = new Server(server); // Inicia o Socket.IO com o servidor HTTP

// Inicializa o servidor Socket.IO
new GameServer(io);

// Inicia o servidor HTTP na porta definida
const port = process.env.PORT || 3000;
server.listen(port, () => {
	console.log(`Servidor rodando na porta ${port}`);
});
