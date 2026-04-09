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
	@sleep 4
	@echo "-------------------------SERVICES--------------------------------------------------------------------------------------------------------------"
	@docker ps -a --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

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


restart:
	@$(DOCK_COMP) down --remove-orphans
	@$(DOCK_COMP) up -d --build


rebuild:
	@$(DOCK_COMP) down --remove-orphans
	@$(DOCK_COMP) up -d --build --force-recreate
	@docker image prune -f

re: fclean all

fclean_status: fclean status

re_status: fclean_status all

.PHONY: all up upfg down logs status clean fclean restart rebuild re fclean_status re_status