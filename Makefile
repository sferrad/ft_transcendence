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

ports:
	$(DOCK_COMP) ps

clean:
	$(DOCK_COMP) down --volumes --remove-orphans

fclean: clean
	@docker system prune -af
	docker volume rm -rf  $(docker volume ls -q)

restart:
	@$(DOCK_COMP) down --remove-orphans
	@$(DOCK_COMP) up -d --build --force-recreate

re: fclean all

.PHONY: all up upfg down logs ports clean fclean restart