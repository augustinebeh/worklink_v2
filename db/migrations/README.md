# Database Migrations

This directory contains database migration files for WorkLink v2.

## Migration Files

Future migration files should be placed here with the naming convention:
- `001_migration_name.js`
- `002_another_migration.js`

Each migration file should export functions for:
- `up()` - Apply the migration
- `down()` - Rollback the migration

## Current Approach

Currently, migrations are handled in `schema.js` using try-catch blocks around `ALTER TABLE` statements. This ensures backward compatibility when columns are added to existing tables.

## Future Enhancement

A proper migration system with versioning and rollbacks can be implemented here when needed.