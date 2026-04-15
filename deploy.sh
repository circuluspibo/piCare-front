#!/bin/bash
set -e

# 대상 IP 입력
if [ -z "$1" ]; then
  read -p "배포 대상 IP: " TARGET_IP
else
  TARGET_IP="$1"
fi

TIMESTAMP=$(date +"%y%m%d%H%M%S")
ARCHIVE="front-${TIMESTAMP}.tar"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[1/4] 기존 dist 삭제"
rm -rf "${SCRIPT_DIR}/dist"

echo "[2/4] 프로젝트 빌드"
cd "${SCRIPT_DIR}"
npm run build

echo "[3/4] dist 압축 → ${ARCHIVE}"
tar -cf "${SCRIPT_DIR}/${ARCHIVE}" -C "${SCRIPT_DIR}" dist

echo "[4/4] ${TARGET_IP}로 전송"
scp "${SCRIPT_DIR}/${ARCHIVE}" "picare@${TARGET_IP}:/home/picare/git/piCare-front/"

echo "완료: ${ARCHIVE} → ${TARGET_IP}"
