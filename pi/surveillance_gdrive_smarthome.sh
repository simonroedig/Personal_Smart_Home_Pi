#!/bin/bash
# Smart Home aware surveillance script (Pattern A)
# Uses /api/state target/actual protocol.
# Reads desired target state (on/off). If target=on, captures and uploads frames.
# Reports actual state back to server so dashboard can display physical status.
# NOTE: Adjust endpoints, intervals, and rclone/camera commands for your environment.

# ---------------- Config ----------------
API_BASE="https://YOUR-DEPLOYED-APP-URL"   # e.g. https://simons-smarthome.vercel.app
STATE_ENDPOINT="$API_BASE/api/picam"
REMOTE="gdrive:Surveillance"
MAX_CLOUD_GB=12
TEMP_DIR="/home/xfecid/cam_temp"
PHOTO_SLEEP=0               # delay between photos while active (seconds)
PHOTO_WIDTH=1280
PHOTO_HEIGHT=720
PHOTO_QUALITY=50
SCRIPT_VERSION="v4-smart-home"
MAX_DELETE_FILES=500
CHECK_INTERVAL=200          # how many uploads before checking cloud size
POLL_INTERVAL=60            # seconds between polling desired state
REPORT_INTERVAL=300         # unused now (no POST heartbeat); keep for reference
VERBOSE=1                   # set 0 to quiet
# ---------------------------------------

mkdir -p "$TEMP_DIR"
UPLOAD_COUNT=0
LAST_TARGET="off"

log(){ [ "$VERBOSE" = "1" ] && echo "[$(date '+%H:%M:%S')] $*"; }

poll_target(){
  # Expect JSON like {"camera":"on"}
  local json
  json=$(curl -fsS "$STATE_ENDPOINT" 2>/dev/null) || return 1
  # crude extraction without jq
  local tgt
  tgt=$(echo "$json" | grep -o '"camera":"[a-z]*"' | head -n1 | cut -d '"' -f4)
  if [ "$tgt" != "on" ] && [ "$tgt" != "off" ]; then
    return 2
  fi
  echo "$tgt"
  return 0
}

capture_and_upload(){
  local DATE_STR EPOCH LOCAL_FILE
  DATE_STR=$(date +"%d-%m-%Y_%H-%M-%S")
  EPOCH=$(date +%s)
  LOCAL_FILE="$TEMP_DIR/${DATE_STR}_${EPOCH}_${SCRIPT_VERSION}.jpg"
  rpicam-jpeg -o "$LOCAL_FILE" -v 0 --width $PHOTO_WIDTH --height $PHOTO_HEIGHT --quality $PHOTO_QUALITY || return 1
  rclone copy "$LOCAL_FILE" "$REMOTE/" && rm "$LOCAL_FILE"
  return 0
}

check_cloud_size(){
  local size
  size=$(rclone size "$REMOTE" --json 2>/dev/null | grep TotalSize | awk '{print $2}')
  [ -z "$size" ] && return 0
  local limit=$((MAX_CLOUD_GB * 1024 * 1024 * 1024))
  if [ "$size" -gt "$limit" ]; then
    log "Cloud size exceeds limit; pruning older files"
    rclone delete "$REMOTE" --min-age 1h --order-by name,ascending --max-delete $MAX_DELETE_FILES || true
  fi
}

log "Starting smart-home surveillance loop (Simple GET polling)"
while true; do
  # 1. Poll desired target periodically (not every frame to reduce load)
  local_now=$(date +%s)
  if [ $((local_now % POLL_INTERVAL)) -eq 0 ] || [ "$LAST_TARGET" = "" ]; then
    newTarget=$(poll_target) && LAST_TARGET="$newTarget"
  fi

  if [ "$LAST_TARGET" = "on" ]; then
    if capture_and_upload; then
      ((UPLOAD_COUNT++))
      if (( UPLOAD_COUNT % CHECK_INTERVAL == 0 )); then
        check_cloud_size
      fi
    else
      log "Capture failed"
    fi
    # Speed loop when active; adjust sleep for frame rate
    sleep "$PHOTO_SLEEP"
  else
    sleep 1
  fi

done
