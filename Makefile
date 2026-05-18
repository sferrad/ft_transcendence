export DOCKER_BUILDKIT     := 1
export COMPOSE_DOCKER_CLI_BUILD := 1

DOCK_COMP = docker compose -p transcendence -f srcs/docker-compose.yml

CERTS_DIR = srcs/certs/internal

all: certs build up

certs: $(CERTS_DIR)/ca.crt $(CERTS_DIR)/internal.crt

$(CERTS_DIR)/ca.crt $(CERTS_DIR)/ca.key:
	@mkdir -p $(CERTS_DIR)
	openssl genrsa -out $(CERTS_DIR)/ca.key 4096
	openssl req -new -x509 -days 3650 -key $(CERTS_DIR)/ca.key \
		-out $(CERTS_DIR)/ca.crt \
		-subj "/C=FR/ST=IDF/L=Paris/O=ft_transcendence/OU=InternalTLS/CN=internal-ca"

$(CERTS_DIR)/internal.crt $(CERTS_DIR)/internal.key: $(CERTS_DIR)/ca.crt $(CERTS_DIR)/ca.key
	openssl genrsa -out $(CERTS_DIR)/internal.key 4096
	openssl req -new -key $(CERTS_DIR)/internal.key \
		-out $(CERTS_DIR)/internal.csr \
		-config $(CERTS_DIR)/openssl-san.cnf
	openssl x509 -req -days 3650 \
		-in $(CERTS_DIR)/internal.csr \
		-CA $(CERTS_DIR)/ca.crt -CAkey $(CERTS_DIR)/ca.key -CAcreateserial \
		-out $(CERTS_DIR)/internal.crt \
		-extensions req_ext -extfile $(CERTS_DIR)/openssl-san.cnf
	@rm -f $(CERTS_DIR)/internal.csr

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
	@rm -f $(CERTS_DIR)/ca.crt $(CERTS_DIR)/ca.key \
		$(CERTS_DIR)/internal.crt $(CERTS_DIR)/internal.key \
		$(CERTS_DIR)/internal.csr $(CERTS_DIR)/ca.srl

restart: down up

re: fclean all

fclean_status: fclean status

re_status: fclean_status all

.PHONY: all certs build up upfg down logs status clean fclean restart rebuild re fclean_status re_status ps
