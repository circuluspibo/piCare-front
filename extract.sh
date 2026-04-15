#!/bin/bash
set -e

DEST="/home/picare/git/piCare-front/dist"
HOME_DIR="/home/picare/git/piCare-front"

# tar 파일 지정 (인자 없으면 ~/front-*.tar 중 최신 파일 자동 선택)
if [ -n "$1" ]; then
  ARCHIVE="$1"
else
  ARCHIVE=$(ls -t "${HOME_DIR}"/front-*.tar 2>/dev/null | head -1)
  if [ -z "$ARCHIVE" ]; then
    echo "오류: ~/front-*.tar 파일을 찾을 수 없습니다."
    exit 1
  fi
fi

echo "[1/3] 기존 dist 삭제: ${DEST}"
rm -rf "${DEST}"

echo "[2/3] 압축 해제: ${ARCHIVE} → ${DEST%/dist}"
tar -xf "${ARCHIVE}" -C "${DEST%/dist}"

echo "[3/3] tar 파일 삭제: ${ARCHIVE}"
rm -f "${ARCHIVE}"

echo "완료: $(basename "$ARCHIVE") → ${DEST}"
