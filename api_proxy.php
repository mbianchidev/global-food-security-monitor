<?php
/**
 * Global Food Security Monitor — API Proxy
 *
 * Server-side proxy for external food security data APIs.
 * No caching, no rate limiting, no request queuing.
 * Every request hits the upstream API directly.
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$action = isset($_GET['action']) ? $_GET['action'] : '';
$db = get_db_connection();

switch ($action) {

    // -------------------------------------------------------------------------
    // Local Data Endpoints
    // -------------------------------------------------------------------------

    case 'countries':
        $region = isset($_GET['region']) ? $_GET['region'] : null;
        $sql = 'SELECT * FROM countries';
        $params = [];
        if ($region) {
            $sql .= ' WHERE region = ?';
            $params[] = $region;
        }
        $sql .= ' ORDER BY name ASC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['status' => 'ok', 'data' => $stmt->fetchAll()]);
        break;

    case 'country_detail':
        $iso3 = isset($_GET['iso3']) ? $_GET['iso3'] : '';
        if (empty($iso3)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Missing iso3 parameter']);
            break;
        }
        $stmt = $db->prepare('SELECT * FROM countries WHERE iso3 = ?');
        $stmt->execute([$iso3]);
        $country = $stmt->fetch();
        if (!$country) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Country not found']);
            break;
        }

        $ipc_stmt = $db->prepare('SELECT * FROM ipc_classifications WHERE country_id = ? ORDER BY period_start DESC LIMIT 5');
        $ipc_stmt->execute([$country['id']]);

        $prices_stmt = $db->prepare('SELECT * FROM commodity_prices WHERE country_id = ? ORDER BY price_date DESC LIMIT 20');
        $prices_stmt->execute([$country['id']]);

        $alerts_stmt = $db->prepare('SELECT * FROM alerts WHERE country_id = ? AND is_active = 1 ORDER BY alert_date DESC LIMIT 10');
        $alerts_stmt->execute([$country['id']]);

        $nutrition_stmt = $db->prepare('SELECT * FROM nutrition_data WHERE country_id = ? ORDER BY year DESC');
        $nutrition_stmt->execute([$country['id']]);

        echo json_encode([
            'status' => 'ok',
            'data' => [
                'country' => $country,
                'ipc' => $ipc_stmt->fetchAll(),
                'prices' => $prices_stmt->fetchAll(),
                'alerts' => $alerts_stmt->fetchAll(),
                'nutrition' => $nutrition_stmt->fetchAll(),
            ]
        ]);
        break;

    case 'ipc_data':
        $country_id = isset($_GET['country_id']) ? (int)$_GET['country_id'] : null;
        $sql = 'SELECT i.*, c.name as country_name, c.iso3 FROM ipc_classifications i JOIN countries c ON i.country_id = c.id';
        $params = [];
        if ($country_id) {
            $sql .= ' WHERE i.country_id = ?';
            $params[] = $country_id;
        }
        $sql .= ' ORDER BY i.period_start DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['status' => 'ok', 'data' => $stmt->fetchAll()]);
        break;

    case 'alerts':
        $severity = isset($_GET['severity']) ? $_GET['severity'] : null;
        $active_only = isset($_GET['active_only']) ? (bool)$_GET['active_only'] : true;
        $sql = 'SELECT a.*, c.name as country_name, c.iso3 FROM alerts a JOIN countries c ON a.country_id = c.id WHERE 1=1';
        $params = [];
        if ($active_only) {
            $sql .= ' AND a.is_active = 1';
        }
        if ($severity) {
            $sql .= ' AND a.severity = ?';
            $params[] = $severity;
        }
        $sql .= ' ORDER BY a.alert_date DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['status' => 'ok', 'data' => $stmt->fetchAll()]);
        break;

    case 'commodity_prices':
        $country_id = isset($_GET['country_id']) ? (int)$_GET['country_id'] : null;
        $commodity = isset($_GET['commodity']) ? $_GET['commodity'] : null;
        $sql = 'SELECT cp.*, c.name as country_name, c.iso3 FROM commodity_prices cp JOIN countries c ON cp.country_id = c.id WHERE 1=1';
        $params = [];
        if ($country_id) {
            $sql .= ' AND cp.country_id = ?';
            $params[] = $country_id;
        }
        if ($commodity) {
            $sql .= ' AND cp.commodity LIKE ?';
            $params[] = '%' . $commodity . '%';
        }
        $sql .= ' ORDER BY cp.price_date DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['status' => 'ok', 'data' => $stmt->fetchAll()]);
        break;

    case 'nutrition':
        $country_id = isset($_GET['country_id']) ? (int)$_GET['country_id'] : null;
        $sql = 'SELECT n.*, c.name as country_name, c.iso3 FROM nutrition_data n JOIN countries c ON n.country_id = c.id WHERE 1=1';
        $params = [];
        if ($country_id) {
            $sql .= ' AND n.country_id = ?';
            $params[] = $country_id;
        }
        $sql .= ' ORDER BY n.year DESC, c.name ASC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['status' => 'ok', 'data' => $stmt->fetchAll()]);
        break;

    case 'dashboard_summary':
        $total_countries = $db->query('SELECT COUNT(*) as cnt FROM countries')->fetch()['cnt'];
        $total_alerts = $db->query("SELECT COUNT(*) as cnt FROM alerts WHERE is_active = 1")->fetch()['cnt'];
        $emergency_alerts = $db->query("SELECT COUNT(*) as cnt FROM alerts WHERE is_active = 1 AND severity = 'emergency'")->fetch()['cnt'];
        $critical_alerts = $db->query("SELECT COUNT(*) as cnt FROM alerts WHERE is_active = 1 AND severity = 'critical'")->fetch()['cnt'];

        $crisis_pop = $db->query('
            SELECT SUM(phase3_population + phase4_population + phase5_population) as total
            FROM ipc_classifications ic
            INNER JOIN (
                SELECT country_id, MAX(period_start) as latest
                FROM ipc_classifications
                GROUP BY country_id
            ) latest ON ic.country_id = latest.country_id AND ic.period_start = latest.latest
        ')->fetch()['total'];

        $famine_pop = $db->query('
            SELECT SUM(phase5_population) as total
            FROM ipc_classifications ic
            INNER JOIN (
                SELECT country_id, MAX(period_start) as latest
                FROM ipc_classifications
                GROUP BY country_id
            ) latest ON ic.country_id = latest.country_id AND ic.period_start = latest.latest
        ')->fetch()['total'];

        echo json_encode([
            'status' => 'ok',
            'data' => [
                'countries_monitored' => (int)$total_countries,
                'active_alerts' => (int)$total_alerts,
                'emergency_alerts' => (int)$emergency_alerts,
                'critical_alerts' => (int)$critical_alerts,
                'crisis_population' => (int)$crisis_pop,
                'famine_population' => (int)$famine_pop,
            ]
        ]);
        break;

    // -------------------------------------------------------------------------
    // External API Proxies (no caching — hits upstream every time)
    // -------------------------------------------------------------------------

    case 'fao_food_prices':
        $area_code = isset($_GET['area_code']) ? $_GET['area_code'] : '4';
        $item_code = isset($_GET['item_code']) ? $_GET['item_code'] : '15';
        $url = FAO_API_BASE . '/data/Prices_E?' .
            http_build_query([
                'area' => $area_code,
                'item' => $item_code,
                'element' => '5532',
                'year' => date('Y'),
                'api_key' => FAO_API_KEY,
            ]);
        $result = proxy_request($url, 'FAO Food Prices');
        echo $result;
        break;

    case 'fao_production':
        $area_code = isset($_GET['area_code']) ? $_GET['area_code'] : '';
        $url = FAO_API_BASE . '/data/QCL?' .
            http_build_query([
                'area' => $area_code,
                'element' => '5510',
                'year' => date('Y') - 1,
                'api_key' => FAO_API_KEY,
            ]);
        $result = proxy_request($url, 'FAO Production');
        echo $result;
        break;

    case 'wfp_food_security':
        $country_iso3 = isset($_GET['iso3']) ? $_GET['iso3'] : '';
        $url = WFP_API_BASE . '/FoodSecurity/CountryData?' .
            http_build_query([
                'iso3' => $country_iso3,
            ]);
        $result = proxy_request($url, 'WFP Food Security', [
            'Authorization: Bearer ' . WFP_API_KEY,
        ]);
        echo $result;
        break;

    case 'wfp_market_prices':
        $country_iso3 = isset($_GET['iso3']) ? $_GET['iso3'] : '';
        $url = WFP_API_BASE . '/MarketPrices/CountryPriceList?' .
            http_build_query([
                'iso3' => $country_iso3,
            ]);
        $result = proxy_request($url, 'WFP Market Prices', [
            'Authorization: Bearer ' . WFP_API_KEY,
        ]);
        echo $result;
        break;

    case 'wfp_economic_data':
        $country_iso3 = isset($_GET['iso3']) ? $_GET['iso3'] : '';
        $url = WFP_API_BASE . '/EconomicData/CountryIndicators?' .
            http_build_query([
                'iso3' => $country_iso3,
            ]);
        $result = proxy_request($url, 'WFP Economic Data', [
            'Authorization: Bearer ' . WFP_API_KEY,
        ]);
        echo $result;
        break;

    // -------------------------------------------------------------------------
    // Authentication (basic, session-based)
    // -------------------------------------------------------------------------

    case 'login':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'POST required']);
            break;
        }
        $input = json_decode(file_get_contents('php://input'), true);
        $username = isset($input['username']) ? $input['username'] : '';
        $password = isset($input['password']) ? $input['password'] : '';

        $stmt = $db->prepare('SELECT * FROM users WHERE username = ? AND is_active = 1');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            session_name(SESSION_NAME);
            session_start();
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];

            $db->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')->execute([$user['id']]);

            echo json_encode([
                'status' => 'ok',
                'data' => [
                    'username' => $user['username'],
                    'role' => $user['role'],
                    'full_name' => $user['full_name'],
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Invalid credentials']);
        }
        break;

    case 'logout':
        session_name(SESSION_NAME);
        session_start();
        session_destroy();
        echo json_encode(['status' => 'ok', 'message' => 'Logged out']);
        break;

    // -------------------------------------------------------------------------
    // Default
    // -------------------------------------------------------------------------

    default:
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Unknown action: ' . $action,
            'available_actions' => [
                'countries', 'country_detail', 'ipc_data', 'alerts',
                'commodity_prices', 'nutrition', 'dashboard_summary',
                'fao_food_prices', 'fao_production',
                'wfp_food_security', 'wfp_market_prices', 'wfp_economic_data',
                'login', 'logout',
            ]
        ]);
        break;
}

/**
 * Make a proxied HTTP request to an external API.
 * No caching. No retry logic. No circuit breaker.
 */
function proxy_request($url, $label = 'API', $extra_headers = []) {
    $start = microtime(true);
    log_message('INFO', "Proxy request [$label]: $url");

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER => array_merge([
            'Accept: application/json',
            'User-Agent: GlobalFoodSecurityMonitor/1.0',
        ], $extra_headers),
        CURLOPT_SSL_VERIFYPEER => false, // Legacy: SSL verification disabled
    ]);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    $elapsed = round((microtime(true) - $start) * 1000);

    // Log to database
    try {
        $db = get_db_connection();
        $stmt = $db->prepare('INSERT INTO api_request_log (endpoint, method, response_code, response_time_ms, error_message) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$url, 'GET', $http_code, $elapsed, $error ?: null]);
    } catch (Exception $e) {
        log_message('ERROR', 'Failed to log API request: ' . $e->getMessage());
    }

    if ($error) {
        log_message('ERROR', "Proxy request [$label] failed: $error");
        http_response_code(502);
        return json_encode([
            'status' => 'error',
            'message' => "Upstream API error: $error",
            'source' => $label,
        ]);
    }

    if ($http_code >= 400) {
        log_message('WARNING', "Proxy request [$label] returned HTTP $http_code");
        http_response_code($http_code);
    }

    return $response;
}
