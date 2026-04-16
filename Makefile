.PHONY: run stop clean logs

run:
	docker compose up --build -d
	@echo ""
	@echo "✅ Global Food Security Monitor is starting..."
	@echo "   Dashboard: http://localhost:8000"
	@echo "   MySQL:     localhost:3307 (root / root_password_123)"
	@echo ""
	@echo "   Run 'make logs' to follow logs, 'make stop' to shut down."

stop:
	docker compose down

clean:
	docker compose down -v

logs:
	docker compose logs -f
