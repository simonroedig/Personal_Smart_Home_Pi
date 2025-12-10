#!/bin/bash
# Smart Home Surveillance – folder structured by day + 2h blocks

# ---------------- Config ----------------
API_BASE="https://simons99xf-smarthome.vercel.app"
STATE_ENDPOINT="$API_BASE/api/picam"
REMOTE="gdrive:Surveillance"
MAX_CLOUD_GB=10
TEMP_DIR="/home/xfecid/cam_temp"
PHOTO_SLEEP=0
PHOTO_WIDTH=1280
PHOTO_HEIGHT=720
PHOTO_QUALITY=50
SCRIPT_VERSION="v7"
CHECK_INTERVAL=200
POLL_INTERVAL=300
VERBOSE=1

PI_AUTH_KEY="changeThisToRealAuthKey"
# ---------------------------------------

mkdir -p "$TEMP_DIR"
UPLOAD_COUNT=0
LAST_TARGET="off"
LAST_POLL=0

log(){ [ "$VERBOSE" = "1" ] && echo "[$(date '+%H:%M:%S')] $*"; }


# ----------- Helpers -------------------

# Get weekday abbreviation
weekday() {
  date +"%a"    # Mon Tue Wed etc.
}

# Determine 2-hour block folder string like 00-02, 02-04, ..., 22-24
two_hour_block() {
  local hour=$(date +%H)
  local block_start=$(( 10#$hour - (10#$hour % 2) ))
  local block_end=$(( block_start + 2 ))
  printf "%02d-%02d" "$block_start" "$block_end"
}

# Poll Next.js server for on/off camera state
poll_target(){
  local json tgt
  json=$(curl -fsS -H "x-pi-auth-key: $PI_AUTH_KEY" "$STATE_ENDPOINT" 2>/dev/null) || return 1
  tgt=$(echo "$json" | grep -o '"camera":"[a-z]*"' | head -n1 | cut -d '"' -f4)
  if [[ "$tgt" != "on" && "$tgt" != "off" ]]; then
    return 2
  fi
  echo "$tgt"
  return 0
}


# ----------- Capture + Upload -----------

capture_and_upload(){
  local WDAY DATE_STR EPOCH FOLDER_DAY FOLDER_BLOCK FULL_REMOTE LOCAL_FILE

  WDAY=$(weekday)                                # Tue
  DATE_STR=$(date +"%d-%m-%Y_%H-%M-%S")          # 16-12-2025_18-33-40
  EPOCH=$(date +%s)

  # Daily folder: Tue_16-12-2025
  FOLDER_DAY="${WDAY}_$(date +'%d-%m-%Y')"

  # 2h time-window folder: Tue_16-12-2025_18-20
  local BLOCK=$(two_hour_block)
  FOLDER_BLOCK="${FOLDER_DAY}_${BLOCK}"

  # File name with weekday prefix:
  local FILE_NAME="${WDAY}_${DATE_STR}_${EPOCH}_${SCRIPT_VERSION}.jpg"

  # Build remote folder path
  FULL_REMOTE="${REMOTE}/${FOLDER_DAY}/${FOLDER_BLOCK}"

  LOCAL_FILE="${TEMP_DIR}/${FILE_NAME}"

  # Capture
  rpicam-jpeg -o "$LOCAL_FILE" -v 0 --width "$PHOTO_WIDTH" --height "$PHOTO_HEIGHT" --quality "$PHOTO_QUALITY" || return 1

  # Upload to Google Drive
  rclone copy "$LOCAL_FILE" "$FULL_REMOTE/" && rm "$LOCAL_FILE"

  return 0
}


# ----------- Cloud Size + Folder Pruning -----------

check_cloud_size(){
  local size limit days

  size=$(rclone size "$REMOTE" --json 2>/dev/null | grep TotalSize | awk '{print $2}')
  [ -z "$size" ] && return 0

  limit=$((MAX_CLOUD_GB * 1024 * 1024 * 1024))

  if (( size > limit )); then
    log "Cloud limit exceeded → deleting oldest day folders"

    # List day folders sorted oldest → newest
    days=$(rclone lsf "$REMOTE" --dirs-only --format=p --order-by=name,ascending)

    # Delete oldest day folders until under limit
    while (( size > limit )); do
      oldest=$(echo "$days" | head -n1)

      [ -z "$oldest" ] && {
        log "No folders left to delete!"
        return
      }

      log "Deleting day folder: $oldest"
      rclone purge "${REMOTE}/${oldest}" || true

      # Recalculate size
      size=$(rclone size "$REMOTE" --json | grep TotalSize | awk '{print $2}')
      days=$(echo "$days" | tail -n +2)
    done
  fi
}


# ------------- Main Loop --------------

log "Starting smart-home surveillance (structured folders)"

while true; do
  now=$(date +%s)

  # Periodically poll API
  if (( now - LAST_POLL >= POLL_INTERVAL )) || [ -z "$LAST_TARGET" ]; then
    newTarget=$(poll_target)
    if [ $? -eq 0 ]; then
      LAST_TARGET="$newTarget"
      log "Polled camera state: $LAST_TARGET"
    else
      log "Failed to poll API, keeping last state: $LAST_TARGET"
    fi
    LAST_POLL=$now
  fi

  # If camera is ON → capture frames
  if [ "$LAST_TARGET" = "on" ]; then
    if capture_and_upload; then
      ((UPLOAD_COUNT++))
      if (( UPLOAD_COUNT % CHECK_INTERVAL == 0 )); then
        check_cloud_size
      fi
    else
      log "Capture failed"
    fi
    sleep "$PHOTO_SLEEP"
  else
    sleep "$POLL_INTERVAL"
  fi

done
