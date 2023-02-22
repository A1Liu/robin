#!/bin/bash
set -eo pipefail

cd "$(dirname $0)/.."

# Validate target channel
TARGET_CHANNEL="$1"
if test -z "$TARGET_CHANNEL"; then
    echo "Usage: $0 <target-channel>"
    exit 1
fi
if test "$TARGET_CHANNEL" != "stable" && test "$TARGET_CHANNEL" != "beta" && test "$TARGET_CHANNEL" != "nightly"; then
    echo "Invalid target channel: $TARGET_CHANNEL"
    exit 1
fi

# Check dependencies exist
if ! test -e "../frontend/out"; then
    echo "frontend must be built first"
    exit 1
fi
if ! which s3cmd &>/dev/null; then
    echo "s3cmd is not installed"
    exit 1
fi
if test "$TARGET_CHANNEL" == "stable" && ! which jq &>/dev/null; then
    echo "jq is not installed"
    exit 1
fi

# Verify that s3cmd is configured correctly
if ! s3cmd ls "s3://robinplatform/releases/${TARGET_CHANNEL}" &>/dev/null; then
    echo "s3cmd is not configured, or the target channel does not exist: $TARGET_CHANNEL"
    exit 1
fi

# Generation is not platform specific, so we will just generate once
go generate -tags prod -x ./...

# Figure out release version
echo ""
ROBIN_VERSION=`git describe --tags --always`
echo "Building version: $ROBIN_VERSION"

buildDir=`mktemp -d`

echo "Temporary build directory: $buildDir"
echo ""

for platform in darwin linux windows; do
    for arch in amd64 arm64; do
        ext=""
        if test "$platform" = "windows"; then
            ext=".exe"
        fi

        if [ -t 1 ]; then
            echo -n "Building for: ${platform}/${arch}"
        fi

        platformDir="${buildDir}/${platform}-${arch}"
        mkdir -p "${platformDir}"

        cp ../LICENSE ${platformDir}
        mkdir ${platformDir}/bin

        GOOS=$platform GOARCH=$arch go build \
            -o "${platformDir}/bin/robin${ext}" \
            -tags prod \
            -ldflags "-X robinplatform.dev/internal/config.robinVersion=${ROBIN_VERSION}" \
            ./cmd/cli

        cd "${platformDir}"

        tar czf "../robin-${platform}-${arch}.tar.gz" .

        binSize=`du -h "${platformDir}/bin/robin${ext}" | awk '{print $1}'`
        size=`du -h "../robin-${platform}-${arch}.tar.gz" | awk '{print $1}'`

        echo -e "\rBuilt: robin-${platform}-${arch}.tar.gz (size: ${size}, binary size: ${binSize})"

        cd $OLDPWD
        rm -rf "${platformDir}"
    done
done

echo ""
echo "Publishing assets to CDN ..."
echo ""

cd "$buildDir"
s3cmd put * "s3://robinplatform/releases/${TARGET_CHANNEL}/" --acl-public

echo ""
echo "Released to $TARGET_CHANNEL"
echo ""
