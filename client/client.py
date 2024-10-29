import pygame
import websocket
import json
import _thread
import random

# Configurações do cliente WebSocket
server_url = "wss://os-pinheirinhos-multiplayer.up.railway.app"
room_id = input("Digite o nome da sala para entrar ou criar: ")

# Configurações do pygame
pygame.init()
width, height = 500, 500
win = pygame.display.set_mode((width, height))
pygame.display.set_caption("Multiplayer Game")
clock = pygame.time.Clock()

# Define uma cor aleatória para o jogador
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

def on_message(ws, message):
    global players
    data = json.loads(message)
    if "init" in data:
        players = {pid: Player(pid, pdata['x'], pdata['y'], pdata['color']) for pid, pdata in data['init'].items()}
    elif "stateUpdate" in data:
        for pid, pdata in data["stateUpdate"].items():
            if pid in players:
                players[pid].update_position(pdata["x"], pdata["y"])
                players[pid].color = pdata["color"]  # Atualiza a cor recebida
            else:
                players[pid] = Player(pid, pdata["x"], pdata["y"], pdata["color"])

def on_open(ws):
    print(f"Conectado ao servidor WebSocket. Entrando na sala '{room_id}'")
    ws.send(json.dumps({"updatePosition": {"x": x, "y": y}}))

ws = websocket.WebSocketApp(server_url, on_message=on_message, on_open=on_open)
_thread.start_new_thread(ws.run_forever, ())

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
    data = {"updatePosition": {"x": x, "y": y}}  # Inclui a cor ao enviar
    try:
        ws.send(json.dumps(data))
    except websocket.WebSocketConnectionClosedException:
        print("Conexão fechada pelo servidor. Saindo do jogo...")
        run = False

    redraw_window()

    # Verifica se o jogador quer sair
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            run = False

pygame.quit()
