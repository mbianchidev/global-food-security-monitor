<?php
/**
 * Global Food Security Monitor - Configuration
 * 
 * WARNING: This file contains hardcoded credentials.
 * This is legacy code — do NOT deploy to production without migrating to environment variables.
 */

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'food_security_monitor');
define('DB_USER', 'root');
define('DB_PASS', 'root_password_123');
define('DB_CHARSET', 'utf8mb4');

// API Keys & Endpoints
define('FAO_API_BASE', 'https://www.fao.org/faostat/api/v1');
define('FAO_API_KEY', 'fao_live_key_abc123def456');
define('WFP_API_BASE', 'https://api.wfp.org/vam-data-bridges/4.0.0');
define('WFP_API_KEY', 'wfp_prod_key_789ghi012jkl');
define('FEWS_NET_API_BASE', 'https://fews.net/api');

// Application Settings
define('APP_NAME', 'Global Food Security Monitor');
define('APP_VERSION', '1.0.0');
define('APP_DEBUG', true);
define('APP_TIMEZONE', 'UTC');
define('APP_SECRET', 's3cr3t_k3y_d0nt_sh4r3');

// Session Configuration
define('SESSION_LIFETIME', 3600);
define('SESSION_NAME', 'GFSM_SESSID');

// Data refresh interval in seconds (1 hour)
define('DATA_REFRESH_INTERVAL', 3600);

// Pagination
define('DEFAULT_PAGE_SIZE', 25);
define('MAX_PAGE_SIZE', 100);

// Logging
define('LOG_FILE', __DIR__ . '/logs/app.log');
define('LOG_LEVEL', 'DEBUG');

// CORS (wide open — legacy)
define('CORS_ORIGIN', '*');

date_default_timezone_set(APP_TIMEZONE);

// Database connection (singleton-ish, global style)
$GLOBALS['db_connection'] = null;

function get_db_connection() {
    if ($GLOBALS['db_connection'] === null) {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
            $GLOBALS['db_connection'] = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            if (APP_DEBUG) {
                die('Database connection failed: ' . $e->getMessage());
            } else {
                die('Database connection failed. Please try again later.');
            }
        }
    }
    return $GLOBALS['db_connection'];
}

function log_message($level, $message) {
    $log_dir = dirname(LOG_FILE);
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0755, true);
    }
    $timestamp = date('Y-m-d H:i:s');
    $entry = "[$timestamp] [$level] $message" . PHP_EOL;
    file_put_contents(LOG_FILE, $entry, FILE_APPEND | LOCK_EX);
}
