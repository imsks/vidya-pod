.PHONY: up stop migrate migrate-prod

up:
	@test -f .env || (echo "Run: cp .env.example .env" && exit 1)
	docker compose up --build -d

stop:
	docker compose down

migrate:
	@set -a; \
	if [ -f .env ]; then . ./.env; \
	elif [ -f .env.local ]; then . ./.env.local; \
	else echo "Copy .env.example to .env or .env.local first."; exit 1; fi; \
	set +a; \
	DATABASE_URL=$$(printf '%s' "$$DATABASE_URL" | sed 's/@db:/@localhost:/'); \
	export DATABASE_URL; \
	npm run db:migrate

migrate-prod:
	@test -f .env.production || (echo ".env.production not found." && exit 1)
	@set -a; . ./.env.production; set +a; \
	npm run db:migrate
