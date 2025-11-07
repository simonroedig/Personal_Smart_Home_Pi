#!/bin/bash

# ---------------- Config ----------------
REMOTE="gdrive:Surveillance"
MAX_CLOUD_GB=12
TEMP_DIR="/home/xfecid/cam_temp"
PHOTO_SLEEP=0             # seconds between pictures
PHOTO_WIDTH=1280
PHOTO_HEIGHT=720
PHOTO_QUALITY=50
SCRIPT_VERSION="v3"
MAX_DELETE_FILES=500      # files to delete at once
CHECK_INTERVAL=200        # check cloud size every N uploads
# ---------------------------------------

mkdir -p "$TEMP_DIR"
UPLOAD_COUNT=0

while true; do
    DATE_STR=$(date +"%d-%m-%Y_%H-%M-%S")
    EPOCH=$(date +%s)
    LOCAL_FILE="$TEMP_DIR/${DATE_STR}_${EPOCH}_${SCRIPT_VERSION}.jpg"

    # Take compressed photo
    rpicam-jpeg -o "$LOCAL_FILE" -v 0 --width $PHOTO_WIDTH --height $PHOTO_HEIGHT --quality $PHOTO_QUALITY

    # Upload to Google Drive (no --progress)
    rclone copy "$LOCAL_FILE" "$REMOTE/"

    # Delete local file immediately
    rm "$LOCAL_FILE"

    # Increment counter and check cloud size every CHECK_INTERVAL uploads
    ((UPLOAD_COUNT++))
    if (( UPLOAD_COUNT % CHECK_INTERVAL == 0 )); then
        CLOUD_SIZE=$(rclone size "$REMOTE" --json | grep TotalSize | awk '{print $2}')
        if [ $CLOUD_SIZE -gt $((MAX_CLOUD_GB * 1024 * 1024 * 1024)) ]; then
            rclone delete "$REMOTE" --min-age 1h --order-by name,ascending --max-delete $MAX_DELETE_FILES
        fi
    fi

    sleep $PHOTO_SLEEP
done