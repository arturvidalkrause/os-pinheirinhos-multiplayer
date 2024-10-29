const WebSocket = require('ws');

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

class Server {
	constructor(port) {
		this.port = port;
		this.rooms = {}; // Salas de jogo
		this.wss = new WebSocket.Server({ port: this.port });

		this.wss.on('connection', this.onConnection.bind(this));
		console.log(`Servidor rodando na porta ${this.port}`);
	}

	onConnection(ws) {
		let playerId = Date.now().toString(); // Gera um ID único para cada cliente
		let roomId = null;

		ws.on('message', (message) => {
			const data = JSON.parse(message);

			// Quando um cliente entra em uma sala
			if (data.joinRoom) {
				roomId = data.joinRoom;
				ws.roomId = roomId; // Associa o roomId ao WebSocket do cliente

				if (!this.rooms[roomId]) {
					this.rooms[roomId] = new Room(roomId);
					console.log(`Nova sala criada: ${roomId}`);
				}

				// Cria um novo jogador e o adiciona à sala
				const player = new Player(playerId, data.x || 50, data.y || 50, data.color || 'blue');
				this.rooms[roomId].addPlayer(player);

				// Envia o estado inicial da sala para o novo cliente
				ws.send(JSON.stringify({ init: this.rooms[roomId].getState() }));

				// Notifica todos os jogadores na sala sobre o novo jogador
				this.broadcastToRoom(roomId);
			}

			// Atualiza a posição do jogador e retransmite o estado da sala
			if (data.updatePosition && roomId) {
				const room = this.rooms[roomId];
				room.updatePlayer(playerId, data.updatePosition.x, data.updatePosition.y);
				this.broadcastToRoom(roomId); // Envia o estado atualizado da sala
			}
		});

		ws.on('close', () => {
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

		// Envia o estado atualizado para todos os clientes na sala
		this.wss.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN && client.roomId === roomId) {
				client.send(JSON.stringify({ stateUpdate: state }));
			}
		});
	}
}

// Inicia o servidor
const port = process.env.PORT || 3001;  // Usa a variável PORT do Glitch
const server = new Server(port);