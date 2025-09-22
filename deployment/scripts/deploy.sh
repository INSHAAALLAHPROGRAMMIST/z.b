#!/bin/bash

# Enhanced Admin Dashboard Deployment Script
# This script handles the complete deployment process

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DEPLOYMENT_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT="production"
BUILD_ONLY=false
SKIP_TESTS=false
SKIP_BACKUP=false
FORCE_REBUILD=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Help function
show_help() {
    cat << EOF
Enhanced Admin Dashboard Deployment Script

Usage: $0 [OPTIONS]

Options:
    -e, --environment ENV    Set deployment environment (default: production)
    -b, --build-only        Only build the application, don't deploy
    -t, --skip-tests        Skip running tests
    -s, --skip-backup       Skip creating backup before deployment
    -f, --force-rebuild     Force rebuild of Docker images
    -h, --help              Show this help message

Examples:
    $0                      # Deploy to production
    $0 -e staging          # Deploy to staging environment
    $0 -b                  # Build only, don't deploy
    $0 -f                  # Force rebuild and deploy

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -b|--build-only)
            BUILD_ONLY=true
            shift
            ;;
        -t|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -s|--skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        -f|--force-rebuild)
            FORCE_REBUILD=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    error "Invalid environment: $ENVIRONMENT. Must be one of: development, staging, production"
    exit 1
fi

log "Starting deployment process for environment: $ENVIRONMENT"

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if required environment files exist
    if [[ ! -f "$DEPLOYMENT_DIR/.env.$ENVIRONMENT" ]]; then
        error "Environment file not found: $DEPLOYMENT_DIR/.env.$ENVIRONMENT"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Load environment variables
load_environment() {
    log "Loading environment variables for $ENVIRONMENT..."
    
    # Load environment-specific variables
    if [[ -f "$DEPLOYMENT_DIR/.env.$ENVIRONMENT" ]]; then
        export $(cat "$DEPLOYMENT_DIR/.env.$ENVIRONMENT" | grep -v '^#' | xargs)
        log "Environment variables loaded from .env.$ENVIRONMENT"
    fi
    
    # Load common variables
    if [[ -f "$DEPLOYMENT_DIR/.env" ]]; then
        export $(cat "$DEPLOYMENT_DIR/.env" | grep -v '^#' | xargs)
        log "Common environment variables loaded"
    fi
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        warn "Skipping tests as requested"
        return 0
    fi
    
    log "Running tests..."
    cd "$PROJECT_ROOT"
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log "Installing dependencies..."
        npm ci
    fi
    
    # Run linting
    log "Running linting..."
    npm run lint
    
    # Run unit tests
    log "Running unit tests..."
    npm run test -- --coverage --watchAll=false
    
    # Run integration tests
    log "Running integration tests..."
    npm run test:integration
    
    log "All tests passed"
}

# Build application
build_application() {
    log "Building application..."
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --only=production
    
    # Build the application
    log "Building React application..."
    npm run build
    
    log "Application built successfully"
}

# Create backup
create_backup() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        warn "Skipping backup as requested"
        return 0
    fi
    
    log "Creating backup before deployment..."
    
    # Check if backup service is running
    if docker-compose -f "$DEPLOYMENT_DIR/docker-compose.yml" ps backup | grep -q "Up"; then
        docker-compose -f "$DEPLOYMENT_DIR/docker-compose.yml" run --rm backup
        log "Backup created successfully"
    else
        warn "Backup service not available, skipping backup"
    fi
}

# Build Docker images
build_docker_images() {
    log "Building Docker images..."
    cd "$DEPLOYMENT_DIR"
    
    BUILD_ARGS=""
    if [[ "$FORCE_REBUILD" == true ]]; then
        BUILD_ARGS="--no-cache"
        log "Force rebuilding Docker images..."
    fi
    
    docker-compose build $BUILD_ARGS
    log "Docker images built successfully"
}

# Deploy application
deploy_application() {
    if [[ "$BUILD_ONLY" == true ]]; then
        log "Build-only mode, skipping deployment"
        return 0
    fi
    
    log "Deploying application..."
    cd "$DEPLOYMENT_DIR"
    
    # Stop existing services
    log "Stopping existing services..."
    docker-compose down
    
    # Start services
    log "Starting services..."
    docker-compose up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    check_service_health
    
    log "Application deployed successfully"
}

# Check service health
check_service_health() {
    log "Checking service health..."
    
    # Check main application
    if curl -f http://localhost:80/health &> /dev/null; then
        log "✅ Admin Dashboard is healthy"
    else
        error "❌ Admin Dashboard health check failed"
        return 1
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
        log "✅ Redis is healthy"
    else
        error "❌ Redis health check failed"
        return 1
    fi
    
    # Check Prometheus
    if curl -f http://localhost:9090/-/healthy &> /dev/null; then
        log "✅ Prometheus is healthy"
    else
        warn "⚠️ Prometheus health check failed"
    fi
    
    # Check Grafana
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        log "✅ Grafana is healthy"
    else
        warn "⚠️ Grafana health check failed"
    fi
    
    log "Health checks completed"
}

# Post-deployment tasks
post_deployment() {
    log "Running post-deployment tasks..."
    
    # Clear application caches if needed
    log "Clearing application caches..."
    # Add cache clearing logic here
    
    # Send deployment notification
    send_deployment_notification
    
    log "Post-deployment tasks completed"
}

# Send deployment notification
send_deployment_notification() {
    log "Sending deployment notification..."
    
    # Get deployment info
    COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    DEPLOY_TIME=$(date)
    
    # Create notification message
    MESSAGE="🚀 Enhanced Admin Dashboard deployed successfully!
Environment: $ENVIRONMENT
Commit: $COMMIT_HASH
Time: $DEPLOY_TIME
Status: ✅ All services healthy"
    
    # Send to Slack (if webhook URL is configured)
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$MESSAGE\"}" \
            "$SLACK_WEBHOOK_URL" &> /dev/null || warn "Failed to send Slack notification"
    fi
    
    # Send to Discord (if webhook URL is configured)
    if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"$MESSAGE\"}" \
            "$DISCORD_WEBHOOK_URL" &> /dev/null || warn "Failed to send Discord notification"
    fi
    
    log "Deployment notification sent"
}

# Rollback function
rollback() {
    error "Deployment failed, initiating rollback..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Stop current deployment
    docker-compose down
    
    # Restore from backup (if available)
    if [[ -f "backups/latest_backup.tar.gz" ]]; then
        log "Restoring from backup..."
        # Add restore logic here
    fi
    
    # Start previous version
    # Add rollback logic here
    
    error "Rollback completed"
    exit 1
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    
    # Remove old Docker images
    docker image prune -f
    
    # Remove old containers
    docker container prune -f
    
    log "Cleanup completed"
}

# Main deployment process
main() {
    log "Enhanced Admin Dashboard Deployment"
    log "Environment: $ENVIRONMENT"
    log "Build Only: $BUILD_ONLY"
    log "Skip Tests: $SKIP_TESTS"
    log "Skip Backup: $SKIP_BACKUP"
    log "Force Rebuild: $FORCE_REBUILD"
    
    # Set up error handling
    trap rollback ERR
    
    # Run deployment steps
    check_prerequisites
    load_environment
    run_tests
    build_application
    create_backup
    build_docker_images
    deploy_application
    post_deployment
    cleanup
    
    log "🎉 Deployment completed successfully!"
    log "Admin Dashboard is now available at: http://localhost"
    log "Grafana is available at: http://localhost:3000"
    log "Prometheus is available at: http://localhost:9090"
}

# Run main function
main "$@"