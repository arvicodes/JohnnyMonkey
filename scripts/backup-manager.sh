#!/bin/bash

# Database Backup Manager Script
# This script manages database backups and integrates with git

set -e

# Configuration
MAX_BACKUPS=10
BACKUP_DIR="."
DB_PATH="server/prisma/basis.db"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to create backup
create_backup() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local commit_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    local backup_name="backup_commit_${commit_hash}_${timestamp}.db"
    
    print_status "Creating database backup: $backup_name"
    
    if [ ! -f "$DB_PATH" ]; then
        print_error "Database file not found at $DB_PATH"
        exit 1
    fi
    
    # Create backup
    if cp "$DB_PATH" "$BACKUP_DIR/$backup_name"; then
        print_success "Backup created: $backup_name"
        
        # Update latest backup
        local latest_backup="backup_latest.db"
        cp "$DB_PATH" "$BACKUP_DIR/$latest_backup"
        print_success "Latest backup updated: $latest_backup"
        
        # Add to git if in git repository
        if git rev-parse --git-dir > /dev/null 2>&1; then
            git add "$backup_name" "$latest_backup" 2>/dev/null || true
            print_status "Backup files added to git staging area"
        fi
        
        return 0
    else
        print_error "Failed to create backup"
        return 1
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    print_status "Cleaning up old backups (keeping $MAX_BACKUPS most recent)"
    
    # Find all backup files and sort by modification time
    local backup_files=($(find "$BACKUP_DIR" -name "backup_*.db" -o -name "backup_*.sqlite3" | grep -v "backup_latest" | xargs ls -t 2>/dev/null || true))
    
    if [ ${#backup_files[@]} -le $MAX_BACKUPS ]; then
        print_status "No cleanup needed (${#backup_files[@]} backups <= $MAX_BACKUPS)"
        return 0
    fi
    
    local files_to_remove=${backup_files[@]:$MAX_BACKUPS}
    
    for file in $files_to_remove; do
        if [ -f "$file" ]; then
            rm "$file"
            print_status "Removed old backup: $(basename "$file")"
        fi
    done
    
    print_success "Cleanup completed"
}

# Function to list backups
list_backups() {
    print_status "Available database backups:"
    
    local backup_files=($(find "$BACKUP_DIR" -name "backup_*.db" -o -name "backup_*.sqlite3" | sort))
    
    if [ ${#backup_files[@]} -eq 0 ]; then
        print_warning "No backup files found"
        return 0
    fi
    
    for file in "${backup_files[@]}"; do
        local filename=$(basename "$file")
        local size=$(du -h "$file" 2>/dev/null | cut -f1 || echo "unknown")
        local date=$(stat -f "%Sm" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null || echo "unknown")
        
        if [[ "$filename" == "backup_latest"* ]]; then
            echo -e "  ${GREEN}📁 $filename${NC} ($size) - $date [LATEST]"
        else
            echo -e "  📁 $filename ($size) - $date"
        fi
    done
}

# Function to restore backup
restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        print_error "Please specify a backup file to restore"
        echo "Usage: $0 restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will overwrite the current database!"
    read -p "Are you sure you want to restore from $backup_file? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Restoring database from $backup_file"
        
        # Create a backup of current database before restoring
        local timestamp=$(date +"%Y%m%d_%H%M%S")
        local pre_restore_backup="backup_pre_restore_${timestamp}.db"
        
        if [ -f "$DB_PATH" ]; then
            cp "$DB_PATH" "$BACKUP_DIR/$pre_restore_backup"
            print_status "Current database backed up as: $pre_restore_backup"
        fi
        
        # Restore the backup
        if cp "$backup_file" "$DB_PATH"; then
            print_success "Database restored from $backup_file"
        else
            print_error "Failed to restore database"
            exit 1
        fi
    else
        print_status "Restore cancelled"
    fi
}

# Function to show help
show_help() {
    echo "Database Backup Manager"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  create     Create a new database backup"
    echo "  cleanup    Remove old backups (keep $MAX_BACKUPS most recent)"
    echo "  list       List all available backups"
    echo "  restore    Restore database from a backup file"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 create"
    echo "  $0 cleanup"
    echo "  $0 list"
    echo "  $0 restore backup_commit_abc123_20241201_143022.db"
    echo ""
}

# Main script logic
case "${1:-help}" in
    "create")
        create_backup
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "list")
        list_backups
        ;;
    "restore")
        restore_backup "$2"
        ;;
    "help"|*)
        show_help
        ;;
esac
