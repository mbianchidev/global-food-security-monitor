-- =============================================================================
-- Global Food Security Monitor — Database Schema
-- MySQL 5.7+ / MariaDB 10.3+
--
-- No migrations, no versioning — just run this file to set up the database.
-- DROP statements included for convenience (destructive on re-run).
-- =============================================================================

CREATE DATABASE IF NOT EXISTS food_security_monitor
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE food_security_monitor;

-- -----------------------------------------------------------------------------
-- Users (basic auth, no proper hashing strategy)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('admin', 'analyst', 'viewer') NOT NULL DEFAULT 'viewer',
    full_name VARCHAR(128),
    last_login DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

INSERT INTO users (username, password_hash, email, role, full_name) VALUES
('admin', '$2y$10$XQxBj1NqJ8RUg1yE6xEVFeRvk9v7YkfLqPz1r2z3a4b5c6d7e8f9g', 'admin@foodsecurity.local', 'admin', 'System Administrator'),
('analyst', '$2y$10$ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwx', 'analyst@foodsecurity.local', 'analyst', 'Data Analyst');

-- -----------------------------------------------------------------------------
-- Countries & Regions
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS countries;
CREATE TABLE countries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    iso3 CHAR(3) NOT NULL UNIQUE,
    iso2 CHAR(2) NOT NULL,
    name VARCHAR(128) NOT NULL,
    region VARCHAR(64) NOT NULL,
    sub_region VARCHAR(64),
    population BIGINT,
    gdp_per_capita DECIMAL(12,2),
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO countries (iso3, iso2, name, region, sub_region, population, latitude, longitude) VALUES
('AFG', 'AF', 'Afghanistan', 'Asia', 'Southern Asia', 41128771, 33.9391, 67.7100),
('AGO', 'AO', 'Angola', 'Africa', 'Middle Africa', 35588987, -11.2027, 17.8739),
('BDI', 'BI', 'Burundi', 'Africa', 'Eastern Africa', 12889576, -3.3731, 29.9189),
('BFA', 'BF', 'Burkina Faso', 'Africa', 'Western Africa', 22673762, 12.2383, -1.5616),
('CAF', 'CF', 'Central African Republic', 'Africa', 'Middle Africa', 5990855, 6.6111, 20.9394),
('TCD', 'TD', 'Chad', 'Africa', 'Middle Africa', 17723315, 15.4542, 18.7322),
('COD', 'CD', 'Democratic Republic of the Congo', 'Africa', 'Middle Africa', 102262808, -4.0383, 21.7587),
('ETH', 'ET', 'Ethiopia', 'Africa', 'Eastern Africa', 126527060, 9.1450, 40.4897),
('HTI', 'HT', 'Haiti', 'Americas', 'Caribbean', 11724763, 18.9712, -72.2852),
('KEN', 'KE', 'Kenya', 'Africa', 'Eastern Africa', 55100586, -0.0236, 37.9062),
('MDG', 'MG', 'Madagascar', 'Africa', 'Eastern Africa', 30325732, -18.7669, 46.8691),
('MLI', 'ML', 'Mali', 'Africa', 'Western Africa', 22593590, 17.5707, -3.9962),
('MOZ', 'MZ', 'Mozambique', 'Africa', 'Eastern Africa', 33897354, -18.6657, 35.5296),
('MMR', 'MM', 'Myanmar', 'Asia', 'South-Eastern Asia', 54179306, 21.9162, 95.9560),
('NER', 'NE', 'Niger', 'Africa', 'Western Africa', 26207977, 17.6078, 8.0817),
('NGA', 'NG', 'Nigeria', 'Africa', 'Western Africa', 223804632, 9.0820, 8.6753),
('SOM', 'SO', 'Somalia', 'Africa', 'Eastern Africa', 18143378, 5.1521, 46.1996),
('SSD', 'SS', 'South Sudan', 'Africa', 'Eastern Africa', 11088796, 6.8770, 31.3070),
('SDN', 'SD', 'Sudan', 'Africa', 'Northern Africa', 48109006, 12.8628, 30.2176),
('SYR', 'SY', 'Syria', 'Asia', 'Western Asia', 23227014, 34.8021, 38.9968),
('YEM', 'YE', 'Yemen', 'Asia', 'Western Asia', 34449825, 15.5527, 48.5164),
('ZMB', 'ZM', 'Zambia', 'Africa', 'Eastern Africa', 20569737, -13.1339, 27.8493),
('ZWE', 'ZW', 'Zimbabwe', 'Africa', 'Eastern Africa', 16665409, -19.0154, 29.1549),
('GZA', 'PS', 'Gaza Strip', 'Asia', 'Western Asia', 2050000, 31.3547, 34.3088);

-- -----------------------------------------------------------------------------
-- IPC Food Security Phase Classifications
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS ipc_classifications;
CREATE TABLE ipc_classifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    country_id INT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    phase1_population BIGINT DEFAULT 0 COMMENT 'Minimal/None',
    phase2_population BIGINT DEFAULT 0 COMMENT 'Stressed',
    phase3_population BIGINT DEFAULT 0 COMMENT 'Crisis',
    phase4_population BIGINT DEFAULT 0 COMMENT 'Emergency',
    phase5_population BIGINT DEFAULT 0 COMMENT 'Famine',
    total_analyzed BIGINT DEFAULT 0,
    overall_phase TINYINT COMMENT '1-5 overall classification',
    source VARCHAR(64) DEFAULT 'IPC',
    report_url TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
    INDEX idx_country_period (country_id, period_start, period_end)
) ENGINE=InnoDB;

INSERT INTO ipc_classifications (country_id, period_start, period_end, phase1_population, phase2_population, phase3_population, phase4_population, phase5_population, total_analyzed, overall_phase) VALUES
(1, '2025-10-01', '2026-03-31', 8500000, 12000000, 10200000, 5800000, 2100000, 38600000, 4),
(5, '2025-09-01', '2026-02-28', 1200000, 1800000, 1500000, 800000, 200000, 5500000, 4),
(7, '2025-10-01', '2026-03-31', 25000000, 30000000, 25800000, 12500000, 1200000, 94500000, 4),
(8, '2025-10-01', '2026-03-31', 40000000, 35000000, 20200000, 8500000, 350000, 104050000, 3),
(9, '2025-09-01', '2026-02-28', 2500000, 3200000, 3800000, 1800000, 400000, 11700000, 4),
(17, '2025-10-01', '2026-03-31', 3200000, 4500000, 5200000, 2800000, 800000, 16500000, 4),
(18, '2025-09-01', '2026-02-28', 1800000, 2500000, 3000000, 2200000, 1500000, 11000000, 5),
(19, '2025-10-01', '2026-03-31', 8000000, 12000000, 14000000, 8500000, 1000000, 43500000, 4),
(21, '2025-10-01', '2026-03-31', 5000000, 8000000, 10500000, 6200000, 1800000, 31500000, 4),
(24, '2025-10-01', '2026-03-31', 55000, 135000, 615000, 745000, 500000, 2050000, 5);

-- -----------------------------------------------------------------------------
-- Commodity Prices
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS commodity_prices;
CREATE TABLE commodity_prices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    country_id INT NOT NULL,
    commodity VARCHAR(64) NOT NULL,
    market VARCHAR(128),
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    unit VARCHAR(32) NOT NULL DEFAULT 'kg',
    price_date DATE NOT NULL,
    price_type ENUM('retail', 'wholesale', 'farmgate') NOT NULL DEFAULT 'retail',
    source VARCHAR(64) DEFAULT 'WFP',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
    INDEX idx_country_commodity_date (country_id, commodity, price_date)
) ENGINE=InnoDB;

INSERT INTO commodity_prices (country_id, commodity, market, price, currency, unit, price_date, price_type) VALUES
(1, 'Wheat flour', 'Kabul', 0.62, 'USD', 'kg', '2026-03-01', 'retail'),
(1, 'Rice', 'Kabul', 0.85, 'USD', 'kg', '2026-03-01', 'retail'),
(1, 'Cooking oil', 'Kabul', 1.95, 'USD', 'L', '2026-03-01', 'retail'),
(8, 'Teff', 'Addis Ababa', 1.45, 'USD', 'kg', '2026-03-01', 'retail'),
(8, 'Maize', 'Addis Ababa', 0.55, 'USD', 'kg', '2026-03-01', 'retail'),
(8, 'Sorghum', 'Dire Dawa', 0.48, 'USD', 'kg', '2026-03-01', 'retail'),
(9, 'Rice', 'Port-au-Prince', 1.10, 'USD', 'kg', '2026-03-01', 'retail'),
(9, 'Black beans', 'Port-au-Prince', 1.85, 'USD', 'kg', '2026-03-01', 'retail'),
(16, 'Millet', 'Lagos', 0.78, 'USD', 'kg', '2026-03-01', 'retail'),
(16, 'Rice', 'Abuja', 1.25, 'USD', 'kg', '2026-03-01', 'retail'),
(16, 'Cassava', 'Lagos', 0.35, 'USD', 'kg', '2026-03-01', 'retail'),
(17, 'Sorghum', 'Mogadishu', 0.65, 'USD', 'kg', '2026-03-01', 'retail'),
(17, 'Rice', 'Mogadishu', 1.30, 'USD', 'kg', '2026-03-01', 'retail'),
(19, 'Sorghum', 'Khartoum', 0.72, 'USD', 'kg', '2026-03-01', 'retail'),
(19, 'Wheat flour', 'Khartoum', 0.88, 'USD', 'kg', '2026-03-01', 'retail'),
(21, 'Wheat flour', "Sana'a", 0.95, 'USD', 'kg', '2026-03-01', 'retail'),
(21, 'Rice', "Sana'a", 1.40, 'USD', 'kg', '2026-03-01', 'retail'),
(21, 'Cooking oil', 'Aden', 2.10, 'USD', 'L', '2026-03-01', 'retail'),
(24, 'Wheat flour', 'Gaza City', 4.50, 'USD', 'kg', '2026-03-01', 'retail'),
(24, 'Rice', 'Gaza City', 5.20, 'USD', 'kg', '2026-03-01', 'retail'),
(24, 'Canned food', 'Rafah', 6.80, 'USD', 'can', '2026-03-01', 'retail'),
(24, 'Cooking oil', 'Khan Yunis', 8.50, 'USD', 'L', '2026-03-01', 'retail');

-- -----------------------------------------------------------------------------
-- Food Security Alerts
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS alerts;
CREATE TABLE alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    country_id INT NOT NULL,
    severity ENUM('info', 'warning', 'critical', 'emergency') NOT NULL DEFAULT 'warning',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(64),
    source_url TEXT,
    alert_date DATE NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
    INDEX idx_severity_active (severity, is_active),
    INDEX idx_country_date (country_id, alert_date)
) ENGINE=InnoDB;

INSERT INTO alerts (country_id, severity, title, description, source, alert_date) VALUES
(18, 'emergency', 'Famine declaration in South Sudan', 'IPC Phase 5 (Famine) conditions confirmed in Unity State and parts of Jonglei. An estimated 1.5 million people face emergency or famine-level food insecurity.', 'IPC', '2026-03-15'),
(19, 'emergency', 'Conflict-driven hunger crisis in Sudan', 'Ongoing armed conflict has displaced over 10 million people. Agricultural production collapsed in Darfur and Kordofan regions. 14 million people in IPC Phase 3+.', 'FEWS NET', '2026-03-10'),
(1, 'critical', 'Afghanistan winter food crisis deepens', 'Economic collapse and drought conditions have left 18 million Afghans in acute food insecurity. Humanitarian access severely limited.', 'WFP', '2026-03-12'),
(21, 'critical', 'Yemen food imports disrupted', 'Port blockades and fuel shortages have reduced food imports by 40%. Commodity prices surging in northern governorates.', 'WFP', '2026-03-08'),
(7, 'critical', 'DRC eastern provinces face escalating crisis', 'Armed conflict in North Kivu and Ituri has displaced 6.2 million people. Acute malnutrition rates exceed emergency thresholds.', 'OCHA', '2026-03-05'),
(17, 'critical', 'Somalia drought and conflict compound food crisis', 'Failed Gu rains combined with Al-Shabaab blockades have pushed 5.2 million into crisis-level food insecurity.', 'FEWS NET', '2026-03-01'),
(9, 'warning', 'Haiti gang violence restricts food access', 'Armed gang control of key transport routes in Artibonite Valley has disrupted food distribution networks.', 'OCHA', '2026-02-28'),
(5, 'warning', 'CAR displacement crisis ongoing', 'Over 700,000 internally displaced people face limited access to food and agricultural inputs.', 'UNHCR', '2026-02-25'),
(8, 'warning', 'Ethiopia Tigray recovery stalls', 'Despite ceasefire, food production in Tigray remains 60% below pre-conflict levels. 4.5 million require food assistance.', 'FEWS NET', '2026-02-20'),
(15, 'warning', 'Niger lean season forecast severe', 'Early warning models predict above-average severity for the 2026 lean season. 3.7 million people projected in IPC Phase 3+.', 'FEWS NET', '2026-02-15'),
(24, 'emergency', 'Gaza famine confirmed by IPC review', 'IPC Phase 5 (Famine) conditions confirmed across northern Gaza. Over 500,000 people face catastrophic hunger. Acute malnutrition rates among children exceed 30% in multiple areas.', 'IPC', '2026-03-18'),
(24, 'emergency', 'Gaza humanitarian access severely restricted', 'Aid delivery remains critically insufficient. Food imports reduced to a fraction of pre-crisis levels. Clean water and medical supplies near depletion across the territory.', 'OCHA', '2026-03-14');

-- -----------------------------------------------------------------------------
-- Nutrition Indicators
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS nutrition_data;
CREATE TABLE nutrition_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    country_id INT NOT NULL,
    indicator VARCHAR(64) NOT NULL COMMENT 'stunting, wasting, underweight, etc.',
    value DECIMAL(5,2) NOT NULL COMMENT 'Percentage',
    age_group VARCHAR(32) DEFAULT 'children_under_5',
    year INT NOT NULL,
    source VARCHAR(64),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
    INDEX idx_country_indicator (country_id, indicator, year)
) ENGINE=InnoDB;

INSERT INTO nutrition_data (country_id, indicator, value, year, source) VALUES
(1, 'stunting', 38.2, 2025, 'UNICEF'),
(1, 'wasting', 9.5, 2025, 'UNICEF'),
(7, 'stunting', 42.7, 2025, 'UNICEF'),
(7, 'wasting', 8.1, 2025, 'UNICEF'),
(8, 'stunting', 36.8, 2025, 'UNICEF'),
(8, 'wasting', 7.2, 2025, 'UNICEF'),
(9, 'stunting', 22.7, 2025, 'UNICEF'),
(9, 'wasting', 3.7, 2025, 'UNICEF'),
(17, 'stunting', 25.3, 2025, 'UNICEF'),
(17, 'wasting', 14.8, 2025, 'UNICEF'),
(18, 'stunting', 31.1, 2025, 'UNICEF'),
(18, 'wasting', 12.4, 2025, 'UNICEF'),
(19, 'stunting', 35.0, 2025, 'UNICEF'),
(19, 'wasting', 16.3, 2025, 'UNICEF'),
(21, 'stunting', 46.4, 2025, 'UNICEF'),
(21, 'wasting', 16.4, 2025, 'UNICEF'),
(24, 'stunting', 31.5, 2025, 'UNICEF'),
(24, 'wasting', 30.2, 2025, 'UNICEF');

-- -----------------------------------------------------------------------------
-- API Request Log (crude logging, no rotation)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS api_request_log;
CREATE TABLE api_request_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL DEFAULT 'GET',
    params TEXT,
    response_code INT,
    response_time_ms INT,
    error_message TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_endpoint_date (endpoint, created_at)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Data Snapshots (poor man's cache — no TTL, no invalidation)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS data_snapshots;
CREATE TABLE data_snapshots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    snapshot_key VARCHAR(255) NOT NULL UNIQUE,
    data LONGTEXT NOT NULL COMMENT 'JSON blob',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_key (snapshot_key)
) ENGINE=InnoDB;
