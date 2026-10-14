'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function initDatabase(customDbPath) {
  const dbPath = customDbPath || process.env.DB_PATH || path.join(__dirname, '..', 'data', 'colorfit.db');

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Sauvegarde préventive automatique si la base existe déjà avant migration
    if (fs.existsSync(dbPath) && process.env.NODE_ENV !== 'test') {
      const backupDir = path.join(dir, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupFile = path.join(backupDir, `colorfit-backup-${Date.now()}.db`);
      try {
        fs.copyFileSync(dbPath, backupFile);
      } catch (err) {
        console.warn('[DB] Avertissement sauvegarde préventive :', err.message);
      }
    }
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  runMigrations(db);
  return db;
}

function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email_verified INTEGER NOT NULL DEFAULT 0,
      verification_token_hash TEXT,
      verification_expires_at INTEGER,
      plan TEXT NOT NULL DEFAULT 'free',
      single_analysis_credits INTEGER NOT NULL DEFAULT 0,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      subscription_status TEXT NOT NULL DEFAULT 'none',
      subscription_updated_at INTEGER NOT NULL DEFAULT 0,
      preferences_json TEXT NOT NULL DEFAULT '{}',
      privacy_settings_json TEXT NOT NULL DEFAULT '{"saveHistory":true,"analyticsConsent":false,"marketingConsent":false}',
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      csrf_token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS color_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      season_id TEXT NOT NULL,
      season_name TEXT NOT NULL,
      secondary_season_id TEXT,
      secondary_season_name TEXT,
      confidence_score INTEGER NOT NULL,
      confidence_label TEXT NOT NULL,
      metrics_json TEXT NOT NULL,
      palette_json TEXT NOT NULL,
      quality_warnings_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wardrobe_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      primary_color_hex TEXT NOT NULL,
      primary_color_name TEXT NOT NULL,
      secondary_color_hex TEXT,
      style TEXT NOT NULL DEFAULT 'Casual',
      season_tag TEXT NOT NULL DEFAULT 'Toutes saisons',
      brand TEXT,
      size TEXT,
      price REAL,
      image_data_url TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stripe_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      event_created INTEGER NOT NULL,
      processed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_analyses_user ON color_analyses(user_id);
    CREATE INDEX IF NOT EXISTS idx_wardrobe_user ON wardrobe_items(user_id);
  `);
}

module.exports = { initDatabase };
