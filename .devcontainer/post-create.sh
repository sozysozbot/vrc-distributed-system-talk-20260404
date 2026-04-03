#!/bin/bash
set -eux

# Install uv for MCP server
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="${HOME}/.local/bin:${PATH}"
echo 'export PATH="${HOME}/.local/bin:${PATH}"' >> "${HOME}/.bashrc"

# Pre-download lean-lsp-mcp from PyPI (uvx will cache it)
# This makes the first MCP run faster
"${HOME}/.local/bin/uvx" --version > /dev/null 2>&1 || true
"${HOME}/.local/bin/uvx" lean-lsp-mcp --help > /dev/null 2>&1 || true

# Clone lean4-skills repository
SKILLS_TEMP_DIR=$(mktemp -d)
cd "${SKILLS_TEMP_DIR}"
git clone https://github.com/cameronfreer/lean4-skills.git
cd lean4-skills

# Create skills directory if it doesn't exist. Codex will see this.
mkdir -p "${HOME}/.agents/skills"
cp -r plugins/lean4/skills/lean4 "${HOME}/.agents/skills/lean4"

# Install lean-lsp-mcp to Codex
codex mcp add lean-lsp -- uvx lean-lsp-mcp

# Install lean-lsp-mcp + lean4-skills to Claude Code
claude plugin marketplace add cameronfreer/lean4-skills
claude plugin install lean4
claude mcp add --transport stdio --scope user lean-lsp -- uvx lean-lsp-mcp

# Clean up
cd /
rm -rf "${SKILLS_TEMP_DIR}"

# Install elan + Lean toolchain
curl https://elan.lean-lang.org/elan-init.sh -sSf | sh -s -- -y
source "${HOME}/.elan/env"
echo 'source "${HOME}/.elan/env"' >> "${HOME}/.bashrc"
cd /workspace/lean-proofs && elan show

# Update and fetch mathlib cache. This will take time!!
cd /workspace/lean-proofs && lake exe cache get
