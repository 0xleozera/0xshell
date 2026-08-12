#!/usr/bin/env sh
# Installs the latest sshell release into a directory on the PATH.
#
#   curl -fsSL https://raw.githubusercontent.com/0xleozera/sshell/main/install.sh | sh
#
# Env overrides:
#   SSHELL_INSTALL_DIR  where to place the binary (default: /usr/local/bin, falls
#                        back to $HOME/.local/bin when not writable)
#   SSHELL_OS / SSHELL_ARCH  override `uname -s` / `uname -m` detection (testing only)
set -eu

repo="0xleozera/sshell"

os="${SSHELL_OS:-$(uname -s)}"
arch="${SSHELL_ARCH:-$(uname -m)}"

case "$os" in
  Darwin) platform_os="darwin" ;;
  Linux) platform_os="linux" ;;
  *)
    echo "error: unsupported platform: $os ($arch). sshell only publishes builds for darwin/arm64 and linux/x64." >&2
    exit 1
    ;;
esac

case "$arch" in
  arm64 | aarch64) platform_arch="arm64" ;;
  x86_64 | amd64) platform_arch="x64" ;;
  *)
    echo "error: unsupported platform: $os ($arch). sshell only publishes builds for darwin/arm64 and linux/x64." >&2
    exit 1
    ;;
esac

if [ "$platform_os" = "darwin" ] && [ "$platform_arch" != "arm64" ]; then
  echo "error: unsupported platform: darwin/$platform_arch. sshell only publishes a darwin/arm64 build." >&2
  exit 1
fi

if [ "$platform_os" = "linux" ] && [ "$platform_arch" != "x64" ]; then
  echo "error: unsupported platform: linux/$platform_arch. sshell only publishes a linux/x64 build." >&2
  exit 1
fi

asset="sshell-${platform_os}-${platform_arch}"
url="https://github.com/${repo}/releases/latest/download/${asset}"

install_dir="${SSHELL_INSTALL_DIR:-}"
if [ -z "$install_dir" ]; then
  if [ -w /usr/local/bin ] 2>/dev/null; then
    install_dir=/usr/local/bin
  else
    install_dir="$HOME/.local/bin"
  fi
fi

mkdir -p "$install_dir"
if [ ! -w "$install_dir" ]; then
  echo "error: cannot write to $install_dir. Re-run with SSHELL_INSTALL_DIR set to a writable directory." >&2
  exit 1
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

echo "Downloading ${asset}..."
if ! curl -fsSL "$url" -o "$tmp"; then
  echo "error: failed to download $url" >&2
  exit 1
fi

install -m 755 "$tmp" "$install_dir/sshell"
echo "sshell installed to $install_dir/sshell"

case ":$PATH:" in
  *":$install_dir:"*) ;;
  *)
    echo "warning: $install_dir is not on your PATH. Add it with:"
    echo "  export PATH=\"$install_dir:\$PATH\""
    ;;
esac
