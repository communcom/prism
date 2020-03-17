#/bin/bash
set -euo pipefail

IMAGETAG="dev-${BUILDKITE_BRANCH}-${BUILDKITE_BUILD_NUMBER}"

if [[ "${BUILDKITE_TAG}" != "" ]]; then
    docker login -u=$DHUBU -p=$DHUBP
    docker pull commun/prism:${IMAGETAG}
    docker tag commun/prism:${IMAGETAG} commun/prism:${BUILDKITE_TAG}
    docker push commun/prism:${BUILDKITE_TAG}
fi
