## DreamInsight convenience targets

.PHONY: ai ai-help

# Usage:
#   make ai                      # launch Codex CLI via scripts/ai.sh
#   make ai ARGS="--help"        # pass flags to the underlying CLI

ai:
	@bash ./scripts/ai.sh $(ARGS)

ai-help:
	@bash ./scripts/ai.sh --help || true

