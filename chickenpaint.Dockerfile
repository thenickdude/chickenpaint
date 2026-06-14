# syntax=docker/dockerfile:1.7

FROM ubuntu:24.04

ENV CI=true

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates \
    build-essential \
    make \
    nodejs \
    git \
    curl wget \
    imagemagick librsvg2-bin optipng cairosvg \
  && rm -rf /var/lib/apt/lists/*

RUN wget -qO- https://get.pnpm.io/install.sh | ENV="$HOME/.bashrc" \
                                               SHELL="$(which bash)" \
                                               PNPM_VERSION="11.6.0" bash -

RUN SHELL="$(which bash)" /root/.local/share/pnpm/bin/pnpm setup

ENV PATH "$PATH:/root/.local/share/pnpm/bin"

RUN pnpm config set --global ignoreScripts true \
    pnpm config set --global ignorePnpmfile true \
    pnpm config set --global ignoreDepScripts true \
    pnpm config set --global minimumReleaseAge 43200 # 30 days
