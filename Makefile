# Concilium — top-level dev ergonomics. Single command brings up the whole PoC.
#
# Prerequisites (one-time):
#   - Java 21 LTS on JAVA_HOME (e.g. `sdk install java 21-tem && sdk use java 21-tem`)
#   - Docker Desktop (or Colima)
#   - Node 20+ and pnpm (Week 3 only)
#   - DEEPSEEK_API_KEY env var (or activate the ollama profile)

API_DIR := concilium-api
WEB_DIR := concilium-web

.PHONY: help up api web db verify stop clean

help:                       ## Show available targets
	@echo "Concilium PoC — available targets:"
	@echo
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

db:                         ## Start Postgres in Docker
	cd $(API_DIR) && docker compose up -d

api:                        ## Run backend (Spring Boot)
	cd $(API_DIR) && ./mvnw spring-boot:run

web:                        ## Run frontend (Vite dev server) — Week 3
	cd $(WEB_DIR) && pnpm dev

up: db                      ## Bring everything up (api in background, web in foreground)
	cd $(API_DIR) && ./mvnw spring-boot:run &
	cd $(WEB_DIR) && pnpm dev

verify:                     ## Verify a sealed audit record. Usage: make verify SESSION=./data/audit/session-XXX.json
	@test -n "$(SESSION)" || (echo "Usage: make verify SESSION=./data/audit/session-XXX.json" && exit 1)
	cd $(API_DIR) && ./mvnw -q exec:java \
		-Dexec.mainClass=io.concilium.audit.verify.VerifyCli \
		-Dexec.args="$(SESSION)"

test:                       ## Run backend tests (uses Testcontainers Postgres)
	cd $(API_DIR) && ./mvnw test

stop:                       ## Stop everything
	cd $(API_DIR) && docker compose down
	@pkill -f 'spring-boot:run' || true
	@pkill -f 'vite' || true

clean:                      ## Remove build artefacts and local data
	cd $(API_DIR) && ./mvnw -q clean
	rm -rf $(API_DIR)/data
