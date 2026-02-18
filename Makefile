DOCK_COMP = docker compose -p transcendence -f srcs/docker-compose.yml
PATH_VOLUMES = ./srcs/data

all:  up

up:
	$(DOCK_COMP) up --build

down:
	$(DOCK_COMP) down

logs:
	$(DOCK_COMP) logs -f

ports:
	$(DOCK_COMP) ps

clean:
	$(DOCK_COMP) down --volumes

fclean: clean
	@docker system prune -af
	rm -rf  $(PATH_VOLUMES)

restart:
	@$(DOCK_COMP) down
	@$(DOCK_COMP) up --build --force-recreate

.PHONY: all up down logs ports clean fclean restart