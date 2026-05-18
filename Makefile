export DOCKER_BUILDKIT     := 1
export COMPOSE_DOCKER_CLI_BUILD := 1

DOCK_COMP = docker compose -p transcendence -f srcs/docker-compose.yml

all: build up

build:
	$(DOCK_COMP) build --parallel

up:
	$(DOCK_COMP) up -d

upfg:
	$(DOCK_COMP) up

rebuild:
	$(DOCK_COMP) build --parallel --no-cache

down:
	$(DOCK_COMP) down --remove-orphans

logs:
	$(DOCK_COMP) logs -f

ps:
	@echo "-------------------------SERVICES--------------------------------------------------------------------------------------------------------------"
	@docker ps -a --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
	@sleep 4

status: ps
	@echo "-------------------------VOLUMES--------------------------------------------------------------------------------------------------------------"
	@docker volume ls --format "table {{.Name}}\t{{.Mountpoint}}"
	@echo "-------------------------IMAGES--------------------------------------------------------------------------------------------------------------"
	@docker image ls --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
	@echo "-------------------------NETWORKS--------------------------------------------------------------------------------------------------------------"
	@docker network ls --format "table {{.Name}}\t{{.Driver}}"
	@echo "---------------------------------------------------------------------------------------------------------------------------------------"
	@sleep 2

clean:
	$(DOCK_COMP) down --volumes --remove-orphans

fclean: clean
	@docker system prune -af
	@docker volume prune -f

restart: down up

re: fclean all

fclean_status: fclean status

re_status: fclean_status all

.PHONY: all build up upfg down logs status clean fclean restart rebuild re fclean_status re_status ps
