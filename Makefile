.PHONY: run stop clean logs dev

run:
	docker compose up --build -d
	@echo ""
	@echo "✅ Global Food Security Monitor backend is starting..."
	@echo "   API:       http://localhost:8000  (JSON API — no UI)"
	@echo "   Health:    http://localhost:8000/health"
	@echo "   MySQL:     localhost:3307 (root / root_password_123)"
	@echo ""
	@echo "   The frontend is a separate app — run it with:"
	@echo "     cd frontend && npm run dev"
	@echo ""
	@echo "   Run 'make logs' to follow logs, 'make stop' to shut down."

dev:
	cd backend && npm install && npm run dev

stop:
	docker compose down

clean:
	docker compose down -v

logs:
	docker compose logs -f
