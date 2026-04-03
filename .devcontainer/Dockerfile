FROM mcr.microsoft.com/devcontainers/base:2-bookworm@sha256:4d49e42a3eda8a8fd8437ecd8830d50a9113dc0f3623226db5e5c10a2b156f1e

ARG USERNAME=vscode
WORKDIR /workspace

ENV VOLTA_HOME=/home/${USERNAME}/.volta
ENV PATH=${VOLTA_HOME}/bin:${PATH}

# basic tools
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  xz-utils \
  ca-certificates \
  curl \
  git \
  dos2unix \
  ripgrep && \
  rm -rf /var/lib/apt/lists/*

# volume-persisted directories
RUN mkdir -p \
  /home/$USERNAME/.codex \
  /home/$USERNAME/.claude \
  /home/$USERNAME/.elan \
  /home/$USERNAME/.cache/uv \
  /home/$USERNAME/.local \
  /home/$USERNAME/.volta && \
  chown -R $USERNAME:$USERNAME \
  /home/$USERNAME/.codex \
  /home/$USERNAME/.claude \
  /home/$USERNAME/.elan \
  /home/$USERNAME/.cache \
  /home/$USERNAME/.local \
  /home/$USERNAME/.volta

# Used to persist bash history as per https://code.visualstudio.com/remote/advancedcontainers/persist-bash-history
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  && mkdir /commandhistory \
  && touch /commandhistory/.bash_history \
  && chown -R $USERNAME /commandhistory \
  && echo "$SNIPPET" >> "/home/$USERNAME/.bashrc"

# Install Volta (but not Node/npm yet)
RUN mkdir -p "${VOLTA_HOME}" && \
  chown -R "${USERNAME}:${USERNAME}" "${VOLTA_HOME}" && \
  su - "${USERNAME}" -c "curl https://get.volta.sh | bash"

# We need to set a default global node/npm version so that Claude Code installation succeeds
RUN su - "${USERNAME}" -c "volta install node@24.14.1"

# Install Codex
RUN wget https://github.com/openai/codex/releases/download/rust-v0.116.0/codex-x86_64-unknown-linux-musl.tar.gz -O /tmp/codex.tar.gz && \
  tar -xvf /tmp/codex.tar.gz -C /usr/local/bin/ && \
  rm /tmp/codex.tar.gz && \
  mv /usr/local/bin/codex-x86_64-unknown-linux-musl /usr/local/bin/codex && \
  chmod +x /usr/local/bin/codex

# Use with caution.
# The devcontainer will contain Claude/Codex credentials so this is not entirely safe.
RUN echo "alias claude-yolo='claude --dangerously-skip-permissions'" >> /etc/bash.bashrc
RUN echo "alias codex-yolo='codex --dangerously-bypass-approvals-and-sandbox'" >> /etc/bash.bashrc
