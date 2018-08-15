#!/usr/bin/env bash
set -e
DEVOPS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

"$DEVOPS_DIR/run_ansible_playbook.sh" production provision_webserver.yml
