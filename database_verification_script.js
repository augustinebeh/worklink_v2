/**
 * BPO Intelligence System - Database Verification Script
 * Comprehensive test suite to verify all database components
 *
 * Tests:
 * 1. Database file existence and permissions
 * 2. Schema validation for all required tables
 * 3. Migration status check
 * 4. Data connectivity and CRUD operations
 * 5. Service integration tests
 * 6. Error handling validation
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class DatabaseVerificationTool {
  constructor() {
    this.results = {
      fileVerification: {},
      schemaValidation: {},
      migrationStatus: {},
      dataConnectivity: {},
      serviceIntegration: {},
      errorHandling: {},
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    // Expected database paths
    this.dbPaths = {
      main: './data/worklink.db',
      gebiz: './database/gebiz_intelligence.db',
      legacy: './db/database.db'
    };

    // Required tables for BPO Intelligence System
    this.requiredTables = {
      // Main worklink database
      main: [
        'candidates', 'jobs', 'deployments', 'clients', 'notifications',
        'messages', 'achievements', 'quests', 'rewards'
      ],

      // GeBiz Intelligence database
      gebiz: [
        'gebiz_historical_tenders', 'gebiz_active_tenders', 'private_sector_jobs',
        'competitor_intelligence', 'competitor_profiles', 'scraping_alerts',
        'scraping_jobs_log', 'data_quality_issues', 'scraping_config',
        'scraping_opt_out'
      ],

      // BPO-specific tables (should be in GeBiz DB after migration)
      bpo: [
        'bpo_tender_lifecycle', 'contract_renewals', 'alert_rules',
        'alert_history', 'user_alert_preferences', 'renewal_engagement_activities',
        'audit_log'
      ]
    };
  }

  log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    if (details) {
      console.log('  Details:', details);
    }

    if (level === 'error') this.results.summary.failed++;
    else if (level === 'warn') this.results.summary.warnings++;
    else if (level === 'pass') this.results.summary.passed++;

    this.results.summary.totalTests++;
  }

  async verifyDatabaseFiles() {
    this.log('info', 'Starting database file verification...');

    for (const [name, dbPath] of Object.entries(this.dbPaths)) {
      const absolutePath = path.resolve(dbPath);

      try {
        // Check if file exists
        const exists = fs.existsSync(absolutePath);
        this.results.fileVerification[name] = { path: absolutePath, exists };

        if (!exists) {
          this.log('error', `Database file not found: ${name}`, { path: absolutePath });
          continue;
        }

        // Check file permissions
        const stats = fs.statSync(absolutePath);
        const permissions = stats.mode & parseInt('777', 8);

        this.results.fileVerification[name] = {
          ...this.results.fileVerification[name],
          size: stats.size,
          permissions: permissions.toString(8),
          lastModified: stats.mtime,
          readable: fs.constants.R_OK & stats.mode ? true : false,
          writable: fs.constants.W_OK & stats.mode ? true : false
        };

        if (stats.size === 0) {
          this.log('warn', `Database file is empty: ${name}`, { path: absolutePath });
        } else {
          this.log('pass', `Database file verified: ${name}`, {
            path: absolutePath,
            size: `${(stats.size / 1024).toFixed(2)} KB`
          });
        }

        // Test basic connectivity
        await this.testDatabaseConnection(absolutePath, name);

      } catch (error) {
        this.log('error', `Failed to verify database file: ${name}`, {
          path: absolutePath,
          error: error.message
        });
        this.results.fileVerification[name] = {
          path: absolutePath,
          error: error.message
        };
      }
    }
  }

  async testDatabaseConnection(dbPath, dbName) {
    try {
      const db = new Database(dbPath, { readonly: true });

      // Test basic query
      const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1").get();
      this.log('pass', `Database connection successful: ${dbName}`);

      db.close();
      return Promise.resolve();
    } catch (error) {
      this.log('error', `Cannot connect to database: ${dbName}`, { error: error.message });
      return Promise.reject(error);
    }
  }

  async validateSchema() {
    this.log('info', 'Starting schema validation...');

    // Check GeBiz Intelligence database schema
    await this.validateDatabaseSchema(
      this.dbPaths.gebiz,
      'gebiz',
      [...this.requiredTables.gebiz, ...this.requiredTables.bpo]
    );

    // Check main worklink database schema
    await this.validateDatabaseSchema(
      this.dbPaths.main,
      'main',
      this.requiredTables.main
    );
  }

  async validateDatabaseSchema(dbPath, dbName, expectedTables) {
    if (!fs.existsSync(dbPath)) {
      this.log('error', `Database not found for schema validation: ${dbName}`, { path: dbPath });
      return;
    }

    try {
      const db = new Database(dbPath, { readonly: true });

      // Get all tables
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();

      const foundTables = tables.map(t => t.name);
      this.results.schemaValidation[dbName] = {
        foundTables,
        expectedTables,
        missingTables: expectedTables.filter(t => !foundTables.includes(t)),
        extraTables: foundTables.filter(t => !expectedTables.includes(t))
      };

      // Check for missing required tables
      const missingTables = expectedTables.filter(t => !foundTables.includes(t));
      if (missingTables.length > 0) {
        this.log('error', `Missing required tables in ${dbName}`, { missing: missingTables });
      } else {
        this.log('pass', `All required tables found in ${dbName}`, { count: expectedTables.length });
      }

      // Validate table structures for critical tables
      await this.validateTableStructures(db, dbName, foundTables);

      db.close();
    } catch (error) {
      this.log('error', `Failed to validate schema in ${dbName}`, { error: error.message });
    }
  }

  async validateTableStructures(db, dbName, tables) {
    const criticalTables = {
      'bpo_tender_lifecycle': ['id', 'tender_no', 'title', 'stage', 'assigned_to'],
      'contract_renewals': ['id', 'agency', 'contract_end_date', 'renewal_probability'],
      'alert_rules': ['id', 'rule_name', 'rule_type', 'conditions', 'active'],
      'alert_history': ['id', 'rule_id', 'alert_title', 'triggered_at'],
      'gebiz_historical_tenders': ['id', 'tender_no', 'supplier_name', 'award_date'],
      'gebiz_active_tenders': ['id', 'tender_no', 'title', 'closing_date']
    };

    for (const [tableName, requiredColumns] of Object.entries(criticalTables)) {
      if (tables.includes(tableName)) {
        await this.validateTableColumns(db, dbName, tableName, requiredColumns);
      }
    }
  }

  async validateTableColumns(db, dbName, tableName, requiredColumns) {
    try {
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();

      const foundColumns = columns.map(c => c.name);
      const missingColumns = requiredColumns.filter(c => !foundColumns.includes(c));

      if (missingColumns.length > 0) {
        this.log('error', `Missing columns in ${tableName}`, {
          table: tableName,
          missing: missingColumns
        });
      } else {
        this.log('pass', `Table structure validated: ${tableName}`, {
          columns: foundColumns.length
        });
      }
    } catch (error) {
      this.log('error', `Failed to get table info for ${tableName} in ${dbName}`, { error: error.message });
    }
  }

  async testDataOperations() {
    this.log('info', 'Starting data connectivity tests...');

    // Test GeBiz database operations
    await this.testGeBizOperations();

    // Test main database operations
    await this.testMainDatabaseOperations();
  }

  async testGeBizOperations() {
    const dbPath = this.dbPaths.gebiz;
    if (!fs.existsSync(dbPath)) {
      this.log('error', 'GeBiz database not found for data operations test');
      return;
    }

    try {
      const db = new Database(dbPath);

      const testData = {
        tenderId: `TEST_${Date.now()}`,
        title: 'Test BPO Tender for Verification',
        agency: 'TEST_AGENCY',
        stage: 'new_opportunity'
      };

      // Check if bpo_tender_lifecycle table exists
      const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bpo_tender_lifecycle'").get();

      if (!tableExists) {
        this.log('warn', 'bpo_tender_lifecycle table not found - may need migration');
        db.close();
        return;
      }

      // Test INSERT into bpo_tender_lifecycle
      const insertSQL = `
        INSERT INTO bpo_tender_lifecycle (id, tender_no, title, agency, stage, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `;

      const insertStmt = db.prepare(insertSQL);
      const insertResult = insertStmt.run(testData.tenderId, testData.tenderId, testData.title, testData.agency, testData.stage);

      if (insertResult.changes > 0) {
        this.log('pass', 'Successfully inserted test data into bpo_tender_lifecycle');

        // Test SELECT
        const selectStmt = db.prepare('SELECT * FROM bpo_tender_lifecycle WHERE id = ?');
        const row = selectStmt.get(testData.tenderId);

        if (row) {
          this.log('pass', 'Successfully retrieved test data from bpo_tender_lifecycle');

          // Test UPDATE
          const updateStmt = db.prepare('UPDATE bpo_tender_lifecycle SET stage = ? WHERE id = ?');
          const updateResult = updateStmt.run('review', testData.tenderId);

          if (updateResult.changes > 0) {
            this.log('pass', 'Successfully updated test data in bpo_tender_lifecycle');
          } else {
            this.log('error', 'Failed to update test data in bpo_tender_lifecycle');
          }

          // Test DELETE (cleanup)
          const deleteStmt = db.prepare('DELETE FROM bpo_tender_lifecycle WHERE id = ?');
          const deleteResult = deleteStmt.run(testData.tenderId);

          if (deleteResult.changes > 0) {
            this.log('pass', 'Successfully cleaned up test data from bpo_tender_lifecycle');
          } else {
            this.log('warn', 'Failed to cleanup test data from bpo_tender_lifecycle');
          }
        } else {
          this.log('error', 'Test data not found in bpo_tender_lifecycle');
        }
      } else {
        this.log('error', 'Failed to insert test data into bpo_tender_lifecycle');
      }

      db.close();
    } catch (error) {
      this.log('error', 'Database operation failed', { error: error.message });
    }
  }

  async testMainDatabaseOperations() {
    const dbPath = this.dbPaths.main;
    if (!fs.existsSync(dbPath)) {
      this.log('error', 'Main database not found for data operations test');
      return;
    }

    try {
      const db = new Database(dbPath, { readonly: true });

      // Test basic queries on main tables
      const testQueries = [
        'SELECT COUNT(*) as count FROM candidates',
        'SELECT COUNT(*) as count FROM jobs',
        'SELECT COUNT(*) as count FROM deployments'
      ];

      for (const sql of testQueries) {
        try {
          const stmt = db.prepare(sql);
          const row = stmt.get();
          this.log('pass', `Query successful: ${sql}`, { result: row });
        } catch (error) {
          this.log('error', `Query failed: ${sql}`, { error: error.message });
        }
      }

      db.close();
    } catch (error) {
      this.log('error', 'Main database operations failed', { error: error.message });
    }
  }

  async testServiceIntegration() {
    this.log('info', 'Testing service database integration...');

    // Test database configuration
    try {
      const config = require('./config/index.js');
      this.log('pass', 'Database configuration loaded successfully', {
        configuredPath: config.database.path
      });
    } catch (error) {
      this.log('error', 'Failed to load database configuration', { error: error.message });
    }

    // Test if database modules can be loaded
    try {
      const database = require('./db/database.js');
      this.log('pass', 'Database module loaded successfully');
    } catch (error) {
      this.log('error', 'Failed to load database module', { error: error.message });
    }

    // Test API service files
    const serviceFiles = [
      './admin/src/shared/services/api/lifecycle.service.js',
      './admin/src/shared/services/api/alert.service.js',
      './admin/src/shared/services/api/tender.service.js'
    ];

    for (const serviceFile of serviceFiles) {
      if (fs.existsSync(serviceFile)) {
        this.log('pass', `Service file exists: ${path.basename(serviceFile)}`);
      } else {
        this.log('warn', `Service file missing: ${serviceFile}`);
      }
    }
  }

  async testErrorHandling() {
    this.log('info', 'Testing database error handling...');

    // Test connection to non-existent database
    try {
      const nonExistentPath = './non_existent_database.db';
      const db = new Database(nonExistentPath, { readonly: true });
      db.close();
      this.log('warn', 'No error thrown for non-existent database');
    } catch (error) {
      this.log('pass', 'Error handling working for invalid database path');
    }

    // Test invalid SQL query
    if (fs.existsSync(this.dbPaths.gebiz)) {
      try {
        const db = new Database(this.dbPaths.gebiz, { readonly: true });
        const stmt = db.prepare('SELECT * FROM non_existent_table');
        const row = stmt.get();
        this.log('warn', 'No error for invalid SQL query');
        db.close();
      } catch (error) {
        this.log('pass', 'Correctly handled invalid SQL query error');
      }
    }
  }

  async checkMigrations() {
    this.log('info', 'Checking migration status...');

    const migrationPath = './database/migrations/001_renewal_alert_system.sql';

    if (!fs.existsSync(migrationPath)) {
      this.log('error', 'Migration file not found', { path: migrationPath });
      return;
    }

    this.log('pass', 'Migration file exists');

    // Check if migration has been applied to GeBiz database
    if (fs.existsSync(this.dbPaths.gebiz)) {
      try {
        const db = new Database(this.dbPaths.gebiz, { readonly: true });
        const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bpo_tender_lifecycle'").get();

        if (row) {
          this.log('pass', 'Migration appears to be applied (bpo_tender_lifecycle table exists)');
        } else {
          this.log('warn', 'Migration may not be applied (bpo_tender_lifecycle table not found)');
        }

        db.close();
      } catch (error) {
        this.log('error', 'Failed to check migration status', { error: error.message });
      }
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      fileVerification: this.results.fileVerification,
      schemaValidation: this.results.schemaValidation,
      migrationStatus: this.results.migrationStatus,
      dataConnectivity: this.results.dataConnectivity,
      serviceIntegration: this.results.serviceIntegration,
      errorHandling: this.results.errorHandling,
      recommendations: this.generateRecommendations()
    };

    // Write report to file
    const reportPath = './database_verification_report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('DATABASE VERIFICATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Warnings: ${report.summary.warnings}`);
    console.log(`\nDetailed report saved to: ${reportPath}`);
    console.log('='.repeat(80));

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    // Check for missing databases
    for (const [name, info] of Object.entries(this.results.fileVerification)) {
      if (!info.exists) {
        recommendations.push(`Create missing database: ${name} at ${info.path}`);
      }
    }

    // Check for missing tables
    for (const [dbName, validation] of Object.entries(this.results.schemaValidation)) {
      if (validation.missingTables && validation.missingTables.length > 0) {
        recommendations.push(`Apply migrations to ${dbName} database to create missing tables: ${validation.missingTables.join(', ')}`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('All database components appear to be working correctly!');
    }

    return recommendations;
  }

  async run() {
    console.log('Starting BPO Intelligence System Database Verification...\n');

    try {
      await this.verifyDatabaseFiles();
      await this.validateSchema();
      await this.checkMigrations();
      await this.testDataOperations();
      await this.testServiceIntegration();
      await this.testErrorHandling();

      return await this.generateReport();
    } catch (error) {
      console.error('Verification failed with error:', error);
      this.log('error', 'Verification process failed', { error: error.message });
      return await this.generateReport();
    }
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  const verifier = new DatabaseVerificationTool();
  verifier.run().then((report) => {
    process.exit(report.summary.failed > 0 ? 1 : 0);
  }).catch((error) => {
    console.error('Failed to run verification:', error);
    process.exit(1);
  });
}

module.exports = DatabaseVerificationTool;