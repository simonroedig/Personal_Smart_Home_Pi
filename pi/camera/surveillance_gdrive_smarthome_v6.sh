#!/bin/bash
# Only captures when camera state is "on"
# Polls the Next.js API every POLL_INTERVAL seconds

# ---------------- Config ----------------
API_BASE="https://simons99xf-smarthome.vercel.app"   # your Vercel deployment
STATE_ENDPOINT="$API_BASE/api/picam"
REMOTE="gdrive:Surveillance"
MAX_CLOUD_GB=10
TEMP_DIR="/home/xfecid/cam_temp"
PHOTO_SLEEP=0               # delay between photos while active (seconds)
PHOTO_WIDTH=1280
PHOTO_HEIGHT=720
PHOTO_QUALITY=50
SCRIPT_VERSION="v6"
MAX_DELETE_FILES=500
CHECK_INTERVAL=200          # uploads before checking cloud size
POLL_INTERVAL=300           # seconds between polling API for camera state
VERBOSE=1                   # set 0 to quiet

PI_AUTH_KEY="soOnlyICanRequestServer_ObviouslyUserealAuthKeyOnPi"
# ---------------------------------------

mkdir -p "$TEMP_DIR"
UPLOAD_COUNT=0
LAST_TARGET="off"
LAST_POLL=0

log(){ [ "$VERBOSE" = "1" ] && echo "[$(date '+%H:%M:%S')] $*"; }

# Poll the Next.js API for the camera state
poll_target(){
  local json tgt
  json=$(curl -fsS -H "x-pi-auth-key: $PI_AUTH_KEY" "$STATE_ENDPOINT" 2>/dev/null) || return 1
  tgt=$(echo "$json" | grep -o '"camera":"[a-z]*"' | head -n1 | cut -d '"' -f4)
  if [ "$tgt" != "on" ] && [ "$tgt" != "off" ]; then
    return 2
  fi
  echo "$tgt"
  return 0
}

# Capture a photo and upload to Google Drive
capture_and_upload(){
  local DATE_STR EPOCH LOCAL_FILE
  DATE_STR=$(date +"%d-%m-%Y_%H-%M-%S")
  EPOCH=$(date +%s)
  LOCAL_FILE="$TEMP_DIR/${DATE_STR}_${EPOCH}_${SCRIPT_VERSION}.jpg"

  rpicam-jpeg -o "$LOCAL_FILE" -v 0 --width $PHOTO_WIDTH --height $PHOTO_HEIGHT --quality $PHOTO_QUALITY || return 1
  rclone copy "$LOCAL_FILE" "$REMOTE/" && rm "$LOCAL_FILE"
  return 0
}

# Check cloud size and prune old files if needed
check_cloud_size(){
  local size limit
  size=$(rclone size "$REMOTE" --json 2>/dev/null | grep TotalSize | awk '{print $2}')
  [ -z "$size" ] && return 0
  limit=$((MAX_CLOUD_GB * 1024 * 1024 * 1024))
  if [ "$size" -gt "$limit" ]; then
    log "Cloud size exceeds limit; pruning older files"
    rclone delete "$REMOTE" --min-age 1h --order-by name,ascending --max-delete $MAX_DELETE_FILES || true
  fi
}

log "Starting smart-home surveillance loop (v5)"
while true; do
  now=$(date +%s)

  # Poll API if POLL_INTERVAL seconds passed or on first run
  if (( now - LAST_POLL >= POLL_INTERVAL )) || [ -z "$LAST_TARGET" ]; then
    newTarget=$(poll_target)
    if [ $? -eq 0 ]; then
      LAST_TARGET="$newTarget"
      log "Polled camera state: $LAST_TARGET"
    else
      log "Failed to poll API, keeping last known state: $LAST_TARGET"
    fi
    LAST_POLL=$now
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
    sleep "$PHOTO_SLEEP"  # frame rate while active
  else
    # Camera is off, sleep to reduce CPU usage
    sleep "$POLL_INTERVAL"
  fi

done
