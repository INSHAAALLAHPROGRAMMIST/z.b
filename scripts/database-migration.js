/**
 * Database Migration and Backup Strategy
 * Handles Firestore data migrations and backups for production deployments
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

class DatabaseMigrationManager {
    constructor() {
        this.projectId = process.env.VITE_FIREBASE_PROJECT_ID;
        this.backupDir = path.join(process.cwd(), 'database-backups');
        this.migrationsDir = path.join(process.cwd(), 'database-migrations');
        
        // Initialize Firebase Admin
        this.initializeFirebase();
        
        // Ensure directories exist
        this.ensureDirectories();
    }

    initializeFirebase() {
        try {
            // Initialize with service account (in production)
            if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                this.app = initializeApp({
                    credential: cert(serviceAccount),
                    projectId: this.projectId
                });
            } else {
                // Initialize with default credentials (for local development)
                this.app = initializeApp({
                    projectId: this.projectId
                });
            }
            
            this.db = getFirestore(this.app);
            console.log('✅ Firebase Admin initialized successfully');
        } catch (error) {
            console.error('❌ Firebase Admin initialization failed:', error);
            throw error;
        }
    }

    ensureDirectories() {
        [this.backupDir, this.migrationsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Created directory: ${dir}`);
            }
        });
    }

    /**
     * Create full database backup
     */
    async createBackup(backupName = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = backupName || `backup-${timestamp}.json`;
        const backupPath = path.join(this.backupDir, backupFileName);
        
        console.log('🔄 Starting database backup...');
        
        try {
            const backup = {
                timestamp: new Date().toISOString(),
                projectId: this.projectId,
                collections: {}
            };

            // Define collections to backup
            const collections = [
                'books',
                'authors', 
                'genres',
                'users',
                'orders',
                'cartItems',
                'wishlistItems',
                'notifications',
                'analytics'
            ];

            // Backup each collection
            for (const collectionName of collections) {
                console.log(`📋 Backing up collection: ${collectionName}`);
                
                const collectionRef = this.db.collection(collectionName);
                const snapshot = await collectionRef.get();
                
                backup.collections[collectionName] = {
                    count: snapshot.size,
                    documents: {}
                };
                
                snapshot.forEach(doc => {
                    backup.collections[collectionName].documents[doc.id] = {
                        data: doc.data(),
                        createTime: doc.createTime,
                        updateTime: doc.updateTime
                    };
                });
                
                console.log(`✅ Backed up ${snapshot.size} documents from ${collectionName}`);
            }

            // Save backup to file
            fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
            
            console.log(`✅ Database backup completed: ${backupPath}`);
            
            // Create backup metadata
            const metadataPath = path.join(this.backupDir, 'backup-metadata.json');
            const metadata = this.loadBackupMetadata();
            metadata.backups.push({
                filename: backupFileName,
                timestamp: backup.timestamp,
                size: fs.statSync(backupPath).size,
                collections: Object.keys(backup.collections),
                documentCounts: Object.fromEntries(
                    Object.entries(backup.collections).map(([name, data]) => [name, data.count])
                )
            });
            
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            
            return {
                success: true,
                backupPath,
                metadata: metadata.backups[metadata.backups.length - 1]
            };
            
        } catch (error) {
            console.error('❌ Database backup failed:', error);
            throw error;
        }
    }

    /**
     * Restore database from backup
     */
    async restoreFromBackup(backupFileName, options = {}) {
        const backupPath = path.join(this.backupDir, backupFileName);
        
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }
        
        console.log(`🔄 Starting database restore from: ${backupFileName}`);
        
        try {
            const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            const { dryRun = false, collectionsToRestore = null } = options;
            
            if (dryRun) {
                console.log('🔍 DRY RUN MODE - No changes will be made');
            }
            
            const collectionsToProcess = collectionsToRestore || Object.keys(backup.collections);
            
            for (const collectionName of collectionsToProcess) {
                const collectionData = backup.collections[collectionName];
                
                if (!collectionData) {
                    console.warn(`⚠️ Collection ${collectionName} not found in backup`);
                    continue;
                }
                
                console.log(`📋 Restoring collection: ${collectionName} (${collectionData.count} documents)`);
                
                if (!dryRun) {
                    const collectionRef = this.db.collection(collectionName);
                    
                    // Batch write for better performance
                    const batch = this.db.batch();
                    let batchCount = 0;
                    
                    for (const [docId, docData] of Object.entries(collectionData.documents)) {
                        const docRef = collectionRef.doc(docId);
                        batch.set(docRef, docData.data);
                        batchCount++;
                        
                        // Commit batch every 500 documents (Firestore limit)
                        if (batchCount >= 500) {
                            await batch.commit();
                            console.log(`  ✅ Committed batch of ${batchCount} documents`);
                            batchCount = 0;
                        }
                    }
                    
                    // Commit remaining documents
                    if (batchCount > 0) {
                        await batch.commit();
                        console.log(`  ✅ Committed final batch of ${batchCount} documents`);
                    }
                }
                
                console.log(`✅ Restored collection: ${collectionName}`);
            }
            
            if (!dryRun) {
                console.log('✅ Database restore completed successfully');
            } else {
                console.log('✅ Dry run completed - restore would be successful');
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Database restore failed:', error);
            throw error;
        }
    }

    /**
     * Run database migrations
     */
    async runMigrations() {
        console.log('🔄 Running database migrations...');
        
        try {
            const migrationFiles = this.getMigrationFiles();
            const appliedMigrations = await this.getAppliedMigrations();
            
            const pendingMigrations = migrationFiles.filter(
                file => !appliedMigrations.includes(file)
            );
            
            if (pendingMigrations.length === 0) {
                console.log('✅ No pending migrations');
                return { success: true, migrationsRun: 0 };
            }
            
            console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
            
            for (const migrationFile of pendingMigrations) {
                console.log(`🔄 Running migration: ${migrationFile}`);
                
                const migrationPath = path.join(this.migrationsDir, migrationFile);
                const migration = await import(migrationPath);
                
                // Run the migration
                await migration.up(this.db);
                
                // Record migration as applied
                await this.recordMigration(migrationFile);
                
                console.log(`✅ Migration completed: ${migrationFile}`);
            }
            
            console.log(`✅ All migrations completed (${pendingMigrations.length} applied)`);
            
            return { 
                success: true, 
                migrationsRun: pendingMigrations.length,
                migrations: pendingMigrations
            };
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    /**
     * Create pre-deployment backup
     */
    async createPreDeploymentBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `pre-deployment-${timestamp}.json`;
        
        console.log('🔄 Creating pre-deployment backup...');
        
        const result = await this.createBackup(backupName);
        
        // Also create a "latest" backup for quick rollback
        const latestBackupPath = path.join(this.backupDir, 'latest-pre-deployment.json');
        fs.copyFileSync(result.backupPath, latestBackupPath);
        
        console.log('✅ Pre-deployment backup created');
        
        return result;
    }

    /**
     * Rollback to previous backup
     */
    async rollbackToPreviousBackup() {
        const latestBackupPath = path.join(this.backupDir, 'latest-pre-deployment.json');
        
        if (!fs.existsSync(latestBackupPath)) {
            throw new Error('No pre-deployment backup found for rollback');
        }
        
        console.log('🔄 Rolling back to pre-deployment backup...');
        
        await this.restoreFromBackup('latest-pre-deployment.json');
        
        console.log('✅ Rollback completed');
    }

    /**
     * Helper methods
     */
    getMigrationFiles() {
        if (!fs.existsSync(this.migrationsDir)) {
            return [];
        }
        
        return fs.readdirSync(this.migrationsDir)
            .filter(file => file.endsWith('.js'))
            .sort();
    }

    async getAppliedMigrations() {
        try {
            const migrationsRef = this.db.collection('_migrations');
            const snapshot = await migrationsRef.get();
            
            return snapshot.docs.map(doc => doc.id);
        } catch (error) {
            console.warn('Could not fetch applied migrations:', error.message);
            return [];
        }
    }

    async recordMigration(migrationFile) {
        const migrationsRef = this.db.collection('_migrations');
        await migrationsRef.doc(migrationFile).set({
            appliedAt: new Date(),
            version: migrationFile
        });
    }

    loadBackupMetadata() {
        const metadataPath = path.join(this.backupDir, 'backup-metadata.json');
        
        if (fs.existsSync(metadataPath)) {
            return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        }
        
        return {
            created: new Date().toISOString(),
            backups: []
        };
    }

    /**
     * Clean old backups
     */
    async cleanOldBackups(keepCount = 10) {
        console.log(`🧹 Cleaning old backups (keeping ${keepCount} most recent)...`);
        
        const metadata = this.loadBackupMetadata();
        const backupsToDelete = metadata.backups
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(keepCount);
        
        for (const backup of backupsToDelete) {
            const backupPath = path.join(this.backupDir, backup.filename);
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
                console.log(`🗑️ Deleted old backup: ${backup.filename}`);
            }
        }
        
        // Update metadata
        metadata.backups = metadata.backups
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, keepCount);
        
        const metadataPath = path.join(this.backupDir, 'backup-metadata.json');
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        
        console.log(`✅ Cleanup completed (deleted ${backupsToDelete.length} old backups)`);
    }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const manager = new DatabaseMigrationManager();
    const command = process.argv[2];
    
    try {
        switch (command) {
            case 'backup':
                await manager.createBackup();
                break;
                
            case 'restore':
                const backupFile = process.argv[3];
                if (!backupFile) {
                    console.error('Please specify backup file name');
                    process.exit(1);
                }
                await manager.restoreFromBackup(backupFile);
                break;
                
            case 'migrate':
                await manager.runMigrations();
                break;
                
            case 'pre-deploy':
                await manager.createPreDeploymentBackup();
                break;
                
            case 'rollback':
                await manager.rollbackToPreviousBackup();
                break;
                
            case 'cleanup':
                await manager.cleanOldBackups();
                break;
                
            default:
                console.log('Available commands:');
                console.log('  backup - Create full database backup');
                console.log('  restore <filename> - Restore from backup');
                console.log('  migrate - Run pending migrations');
                console.log('  pre-deploy - Create pre-deployment backup');
                console.log('  rollback - Rollback to pre-deployment backup');
                console.log('  cleanup - Clean old backups');
        }
    } catch (error) {
        console.error('Command failed:', error);
        process.exit(1);
    }
}

export default DatabaseMigrationManager;