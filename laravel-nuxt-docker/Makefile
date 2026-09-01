SHELL := /bin/sh

DOCKER_COMPOSE := docker compose
BACKEND := $(DOCKER_COMPOSE) exec backend
BACKEND_TTY_OFF := $(DOCKER_COMPOSE) exec -T backend

.DEFAULT_GOAL := help

.PHONY: help setup env-check build up down restart ps logs shell \
	composer composer-install artisan key-generate wait-db migrate \
	migrate-status migrate-rollback migrate-fresh seed test test-filter \
	pint pint-test routes tinker queue-work cache-clear optimize db \
	detective-export

help: ## Hiển thị danh sách lệnh
	@awk 'BEGIN {FS = ":.*## "; printf "Backend commands:\n\n"} /^[a-zA-Z0-9_-]+:.*## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: env-check build up wait-db composer-install migrate ## Cài đặt và khởi chạy dự án lần đầu
	$(BACKEND_TTY_OFF) php artisan optimize:clear
	@printf '\nBackend đã sẵn sàng. Mở ứng dụng tại http://localhost\n'

env-check: ## Kiểm tra backend/.env
	@test -f backend/.env || (printf 'Thiếu backend/.env\n' && exit 1)

build: ## Build lại image PHP backend
	$(DOCKER_COMPOSE) build backend

up: env-check ## Khởi chạy các container
	$(DOCKER_COMPOSE) up -d

down: ## Dừng các container
	$(DOCKER_COMPOSE) down

restart: ## Khởi động lại backend
	$(DOCKER_COMPOSE) restart backend

ps: ## Xem trạng thái container
	$(DOCKER_COMPOSE) ps

logs: ## Theo dõi log backend
	$(DOCKER_COMPOSE) logs -f backend

shell: ## Mở shell trong container backend
	$(BACKEND) sh

composer: ## Chạy Composer, ví dụ: make composer CMD="require package/name"
	@test -n "$(CMD)" || (printf 'Hãy truyền CMD, ví dụ: make composer CMD="update"\n' && exit 1)
	$(BACKEND) composer $(CMD)

composer-install: ## Cài dependency PHP
	$(BACKEND_TTY_OFF) composer install --no-interaction

artisan: ## Chạy Artisan, ví dụ: make artisan CMD="route:list"
	@test -n "$(CMD)" || (printf 'Hãy truyền CMD, ví dụ: make artisan CMD="about"\n' && exit 1)
	$(BACKEND) php artisan $(CMD)

key-generate: env-check ## Tạo APP_KEY mới
	$(BACKEND) php artisan key:generate

wait-db: ## Chờ MySQL sẵn sàng
	@$(DOCKER_COMPOSE) exec -T mysql sh -c 'until mysqladmin ping -h 127.0.0.1 -uroot -p"$$MYSQL_ROOT_PASSWORD" --silent; do sleep 2; done'

migrate: wait-db ## Chạy database migrations
	$(BACKEND) php artisan migrate --force

migrate-status: ## Xem trạng thái migrations
	$(BACKEND) php artisan migrate:status

migrate-rollback: ## Rollback batch migration gần nhất
	$(BACKEND) php artisan migrate:rollback

migrate-fresh: wait-db ## Xóa bảng, migrate lại và seed dữ liệu
	$(BACKEND) php artisan migrate:fresh --seed --force

seed: wait-db ## Chạy database seeders
	$(BACKEND) php artisan db:seed --force

detective-export: ## Đồng bộ các file case TypeScript sang dữ liệu seed JSON
	node scripts/export-detective-cases.mjs

test: ## Chạy toàn bộ backend tests
	$(BACKEND) php artisan test

test-filter: ## Chạy test theo tên, ví dụ: make test-filter FILTER=LoginTest
	@test -n "$(FILTER)" || (printf 'Hãy truyền FILTER, ví dụ: make test-filter FILTER=LoginTest\n' && exit 1)
	$(BACKEND) php artisan test --filter=$(FILTER)

pint: ## Tự động format mã PHP
	$(BACKEND) vendor/bin/pint

pint-test: ## Kiểm tra format PHP mà không sửa file
	$(BACKEND) vendor/bin/pint --test

routes: ## Hiển thị danh sách routes
	$(BACKEND) php artisan route:list

tinker: ## Mở Laravel Tinker
	$(BACKEND) php artisan tinker

queue-work: ## Chạy queue worker
	$(BACKEND) php artisan queue:work --tries=3

cache-clear: ## Xóa toàn bộ cache Laravel
	$(BACKEND) php artisan optimize:clear

optimize: ## Tạo cache cấu hình, route và view
	$(BACKEND) php artisan optimize

db: ## Mở MySQL CLI
	$(DOCKER_COMPOSE) exec mysql mysql -uuser123 -proot laravel_nuxt
