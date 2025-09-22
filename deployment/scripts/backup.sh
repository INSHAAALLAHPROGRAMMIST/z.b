#!/bin/bash

# Enhanced Admin Dashboard Backup Script
# This script creates backups of all important data and configurations

set -e

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="admin_dashboard_backup_${DATE}"
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Create backup directory
mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"

log "Starting backup process..."

# Backup Redis data
log "Backing up Redis data..."
if [ -d "/backup/redis" ]; then
    cp -r /backup/redis "${BACKUP_DIR}/${BACKUP_NAME}/redis"
    log "Redis data backed up successfully"
else
    warn "Redis data directory not found"
fi

# Backup Grafana data
log "Backing up Grafana data..."
if [ -d "/backup/grafana" ]; then
    cp -r /backup/grafana "${BACKUP_DIR}/${BACKUP_NAME}/grafana"
    log "Grafana data backed up successfully"
else
    warn "Grafana data directory not found"
fi

# Backup Prometheus data
log "Backing up Prometheus data..."
if [ -d "/backup/prometheus" ]; then
    # Only backup recent data (last 7 days) to save space
    find /backup/prometheus -name "*.db" -mtime -7 -exec cp {} "${BACKUP_DIR}/${BACKUP_NAME}/prometheus/" \;
    log "Prometheus data backed up successfully"
else
    warn "Prometheus data directory not found"
fi

# Create backup metadata
log "Creating backup metadata..."
cat > "${BACKUP_DIR}/${BACKUP_NAME}/backup_info.txt" << EOF
Backup Information
==================
Backup Name: ${BACKUP_NAME}
Backup Date: $(date)
Backup Type: Full System Backup
Components:
- Redis Data
- Grafana Dashboards and Configuration
- Prometheus Metrics (Last 7 days)

System Information:
- Hostname: $(hostname)
- OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)
- Disk Usage: $(df -h / | tail -1 | awk '{print $5}')
- Memory Usage: $(free -h | grep Mem | awk '{print $3"/"$2}')
EOF

# Compress backup
log "Compressing backup..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"

# Calculate backup size
BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
log "Backup compressed successfully. Size: ${BACKUP_SIZE}"

# Verify backup integrity
log "Verifying backup integrity..."
if tar -tzf "${BACKUP_NAME}.tar.gz" > /dev/null 2>&1; then
    log "Backup integrity verified successfully"
else
    error "Backup integrity check failed!"
    exit 1
fi

# Clean up old backups
log "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "admin_dashboard_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
CLEANED_COUNT=$(find "${BACKUP_DIR}" -name "admin_dashboard_backup_*.tar.gz" -mtime +${RETENTION_DAYS} | wc -l)
log "Cleaned up ${CLEANED_COUNT} old backup(s)"

# Generate backup report
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "admin_dashboard_backup_*.tar.gz" | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)

cat > "${BACKUP_DIR}/backup_report.txt" << EOF
Enhanced Admin Dashboard Backup Report
======================================
Date: $(date)
Latest Backup: ${BACKUP_NAME}.tar.gz
Backup Size: ${BACKUP_SIZE}
Total Backups: ${TOTAL_BACKUPS}
Total Backup Directory Size: ${TOTAL_SIZE}
Retention Policy: ${RETENTION_DAYS} days

Backup Status: SUCCESS
EOF

log "Backup completed successfully!"
log "Backup file: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
log "Backup size: ${BACKUP_SIZE}"

# Optional: Send notification (uncomment if needed)
# curl -X POST -H 'Content-type: application/json' \
#     --data "{\"text\":\"✅ Admin Dashboard backup completed successfully\nFile: ${BACKUP_NAME}.tar.gz\nSize: ${BACKUP_SIZE}\"}" \
#     "${SLACK_WEBHOOK_URL}"

exit 0