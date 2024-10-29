import pygame
import socketio
import json
import random

# Configurações do cliente Socket.IO
server_url = "https://os-pinheirinhos-multiplayer.up.railway.app"
room_id = input("Digite o nome da sala para entrar ou criar: ")

# Configurações do pygame
pygame.init()
width, height = 500, 500
win = pygame.display.set_mode((width, height))
pygame.display.set_caption("Multiplayer Game")
clock = pygame.time.Clock()

# Define uma cor aleatória para o jogador (só precisa ser enviada uma vez)
color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
x, y = 50, 50
vel = 5
players = {}

class Player:
    def __init__(self, player_id, x, y, color):
        self.player_id = player_id
        self.x = x
        self.y = y
        self.color = color

    def update_position(self, x, y):
        self.x = x
        self.y = y

def redraw_window():
    win.fill((0, 0, 0))  # Limpa a tela
    for player in players.values():
        pygame.draw.rect(win, player.color, (player.x, player.y, 20, 20))
    pygame.display.update()

# Configura o cliente Socket.IO
sio = socketio.Client()

# Evento ao conectar ao servidor
@sio.event
def connect():
    print(f"Conectado ao servidor Socket.IO. Entrando na sala '{room_id}'")
    # Envia a mensagem de entrada na sala
    sio.emit("joinRoom", {
        "room": room_id,
        "x": x,
        "y": y,
        "color": color  # Envia a cor apenas uma vez na entrada da sala
    })

# Evento ao receber o estado inicial da sala
@sio.on("init")
def on_init(data):
    global players
    players = {pid: Player(pid, pdata['x'], pdata['y'], tuple(pdata['color'])) for pid, pdata in data.items()}
    print("Estado inicial recebido:", data)

# Evento ao receber uma atualização de estado da sala
@sio.on("stateUpdate")
def on_state_update(data):
    for pid, pdata in data.items():
        if pid in players:
            players[pid].update_position(pdata["x"], pdata["y"])
        else:
            players[pid] = Player(pid, pdata["x"], pdata["y"], tuple(pdata["color"]))

# Evento ao desconectar
@sio.event
def disconnect():
    print("Desconectado do servidor")

# Conecta ao servidor Socket.IO
sio.connect(server_url)

# Loop principal do Pygame
run = True
while run:
    clock.tick(60)  # Limita o loop para 60 FPS

    # Movimento local do jogador
    keys = pygame.key.get_pressed()
    if keys[pygame.K_LEFT] and x > vel:
        x -= vel
    if keys[pygame.K_RIGHT] and x < width - 20 - vel:
        x += vel
    if keys[pygame.K_UP] and y > vel:
        y -= vel
    if keys[pygame.K_DOWN] and y < height - 20 - vel:
        y += vel

    # Envia a posição atual para o servidor
    data = {"room": room_id, "x": x, "y": y}
    sio.emit("updatePosition", data)

    # Redesenha a janela
    redraw_window()

    # Verifica se o jogador quer sair
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            run = False

# Fecha o Pygame e desconecta o cliente Socket.IO
pygame.quit()
sio.disconnect()
