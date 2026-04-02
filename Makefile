DOCK_COMP = docker compose -p transcendence -f srcs/docker-compose.yml

all:  up

up:
	$(DOCK_COMP) up -d --build

upfg:
	$(DOCK_COMP) up --build

down:
	$(DOCK_COMP) down --remove-orphans

logs:
	$(DOCK_COMP) logs -f

ps:
	@docker ps -a --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

clean:
	$(DOCK_COMP) down --volumes --remove-orphans

fclean: clean
	@docker system prune -af
	@docker volume prune -f

restart:
	@$(DOCK_COMP) down --remove-orphans
	@$(DOCK_COMP) up -d --build


rebuild:
	@$(DOCK_COMP) down --remove-orphans
	@$(DOCK_COMP) up -d --build --force-recreate
	@docker image prune -f

re: fclean all

.PHONY: all up upfg down logs ps clean fclean restart rebuild re