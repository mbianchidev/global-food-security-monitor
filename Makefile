.PHONY: run stop clean logs

run:
	docker compose up --build -d
	@echo ""
	@echo "✅ Global Food Security Monitor is starting..."
	@echo "   Dashboard: http://localhost:$$(docker compose port app 80 | cut -d: -f2)"
	@echo "   MySQL:     localhost:$$(docker compose port db 3306 | cut -d: -f2) (root / root_password_123)"
	@echo ""
	@echo "   Run 'make logs' to follow logs, 'make stop' to shut down."

stop:
	docker compose down

clean:
	docker compose down -v

logs:
	docker compose logs -f
