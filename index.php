<?php
/**
 * Global Food Security Monitor — Main Dashboard
 *
 * Monolithic entry point: PHP logic, HTML, CSS, and JS all in one file.
 * Uses jQuery + Chart.js + DataTables from CDNs.
 */

require_once __DIR__ . '/config.php';

$db = get_db_connection();

// Fetch initial data server-side for faster first paint
$countries = $db->query('SELECT * FROM countries ORDER BY name ASC')->fetchAll();
$active_alerts = $db->query("SELECT a.*, c.name as country_name, c.iso3 FROM alerts a JOIN countries c ON a.country_id = c.id WHERE a.is_active = 1 ORDER BY FIELD(a.severity, 'emergency', 'critical', 'warning', 'info'), a.alert_date DESC")->fetchAll();

$ipc_latest = $db->query('
    SELECT i.*, c.name as country_name, c.iso3
    FROM ipc_classifications i
    JOIN countries c ON i.country_id = c.id
    INNER JOIN (
        SELECT country_id, MAX(period_start) as latest
        FROM ipc_classifications GROUP BY country_id
    ) l ON i.country_id = l.country_id AND i.period_start = l.latest
    ORDER BY i.overall_phase DESC, c.name ASC
')->fetchAll();

$total_crisis_pop = 0;
$total_famine_pop = 0;
foreach ($ipc_latest as $row) {
    $total_crisis_pop += $row['phase3_population'] + $row['phase4_population'] + $row['phase5_population'];
    $total_famine_pop += $row['phase5_population'];
}

$emergency_count = 0;
$critical_count = 0;
foreach ($active_alerts as $alert) {
    if ($alert['severity'] === 'emergency') $emergency_count++;
    if ($alert['severity'] === 'critical') $critical_count++;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo APP_NAME; ?></title>

    <!-- CDN Dependencies -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.7/css/dataTables.bootstrap4.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

    <!-- Inline Styles (all in one place, legacy-style) -->
    <style>
        :root {
            --phase1-color: #c6e5b3;
            --phase2-color: #f9e065;
            --phase3-color: #e67800;
            --phase4-color: #c80000;
            --phase5-color: #640000;
            --bg-dark: #1a1a2e;
            --bg-card: #16213e;
            --bg-surface: #0f3460;
            --text-primary: #e0e0e0;
            --text-secondary: #a0a0a0;
            --accent: #e94560;
        }

        * { box-sizing: border-box; }

        body {
            background-color: var(--bg-dark);
            color: var(--text-primary);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
        }

        .navbar-custom {
            background-color: var(--bg-card);
            border-bottom: 2px solid var(--accent);
            padding: 0.5rem 1.5rem;
        }

        .navbar-custom .navbar-brand {
            color: #fff;
            font-weight: 700;
            font-size: 1.3rem;
        }

        .navbar-custom .navbar-brand i { color: var(--accent); margin-right: 8px; }

        .navbar-custom .nav-link { color: var(--text-secondary) !important; }
        .navbar-custom .nav-link:hover { color: #fff !important; }
        .navbar-custom .nav-link.active { color: var(--accent) !important; }

        .version-badge {
            background: var(--bg-surface);
            color: var(--text-secondary);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.75rem;
            margin-left: 10px;
        }

        .dashboard-container { padding: 20px 30px; }

        /* KPI Cards */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .kpi-card {
            background: var(--bg-card);
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid var(--accent);
            transition: transform 0.2s;
        }

        .kpi-card:hover { transform: translateY(-2px); }
        .kpi-card.emergency { border-left-color: var(--phase5-color); }
        .kpi-card.critical { border-left-color: var(--phase4-color); }
        .kpi-card.warning { border-left-color: var(--phase3-color); }
        .kpi-card.info { border-left-color: var(--phase2-color); }

        .kpi-value {
            font-size: 2rem;
            font-weight: 700;
            color: #fff;
            line-height: 1.2;
        }

        .kpi-label {
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-top: 4px;
        }

        /* Section panels */
        .panel {
            background: var(--bg-card);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 12px;
        }

        .panel-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #fff;
        }

        .panel-title i { margin-right: 8px; color: var(--accent); }

        /* Alert cards */
        .alert-card {
            background: rgba(255,255,255,0.03);
            border-radius: 6px;
            padding: 14px;
            margin-bottom: 10px;
            border-left: 3px solid #666;
            transition: background 0.2s;
        }

        .alert-card:hover { background: rgba(255,255,255,0.06); }
        .alert-card.emergency { border-left-color: var(--phase5-color); }
        .alert-card.critical { border-left-color: var(--phase4-color); }
        .alert-card.warning { border-left-color: var(--phase3-color); }
        .alert-card.info { border-left-color: var(--phase2-color); }

        .alert-severity {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .severity-emergency { background: var(--phase5-color); color: #fff; }
        .severity-critical { background: var(--phase4-color); color: #fff; }
        .severity-warning { background: var(--phase3-color); color: #fff; }
        .severity-info { background: var(--phase2-color); color: #333; }

        .alert-title {
            font-weight: 600;
            margin-top: 6px;
            color: #fff;
        }

        .alert-desc {
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-top: 4px;
        }

        .alert-meta {
            font-size: 0.75rem;
            color: var(--text-secondary);
            margin-top: 6px;
        }

        /* IPC Phase bar */
        .ipc-bar {
            display: flex;
            height: 24px;
            border-radius: 4px;
            overflow: hidden;
            margin: 4px 0;
        }

        .ipc-bar .phase { transition: width 0.3s ease; min-width: 0; }
        .ipc-bar .phase1 { background: var(--phase1-color); }
        .ipc-bar .phase2 { background: var(--phase2-color); }
        .ipc-bar .phase3 { background: var(--phase3-color); }
        .ipc-bar .phase4 { background: var(--phase4-color); }
        .ipc-bar .phase5 { background: var(--phase5-color); }

        .ipc-legend {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            font-size: 0.75rem;
            color: var(--text-secondary);
        }

        .ipc-legend-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .ipc-legend-swatch {
            width: 12px;
            height: 12px;
            border-radius: 2px;
        }

        .phase-badge {
            display: inline-block;
            width: 28px;
            height: 28px;
            line-height: 28px;
            text-align: center;
            border-radius: 50%;
            font-weight: 700;
            font-size: 0.85rem;
            color: #fff;
        }

        .phase-badge.p1 { background: var(--phase1-color); color: #333; }
        .phase-badge.p2 { background: var(--phase2-color); color: #333; }
        .phase-badge.p3 { background: var(--phase3-color); }
        .phase-badge.p4 { background: var(--phase4-color); }
        .phase-badge.p5 { background: var(--phase5-color); }

        /* Map */
        #ipc-map { height: 420px; border-radius: 6px; background: var(--bg-surface); }
        .map-legend { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; font-size: 0.75rem; color: var(--text-secondary); }
        .map-legend-item { display: flex; align-items: center; gap: 4px; }
        .map-legend-swatch { width: 16px; height: 12px; border-radius: 2px; }
        .leaflet-tooltip.ipc-map-tooltip { background: var(--bg-card); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; font-size: 0.8rem; padding: 6px 10px; }
        .leaflet-tooltip.ipc-map-tooltip::before { border-right-color: var(--bg-card); }

        /* Charts */
        .chart-container { position: relative; height: 300px; }

        /* DataTables overrides */
        .dataTables_wrapper .dataTables_length select,
        .dataTables_wrapper .dataTables_filter input {
            background: var(--bg-surface);
            color: var(--text-primary);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 4px;
            padding: 4px 8px;
        }

        table.dataTable { color: var(--text-primary); }
        table.dataTable thead th { border-bottom-color: rgba(255,255,255,0.15); color: var(--text-secondary); }
        table.dataTable tbody tr { background: transparent; }
        table.dataTable tbody tr:hover { background: rgba(255,255,255,0.05); }
        table.dataTable tbody td { border-top-color: rgba(255,255,255,0.05); }

        .dataTables_info, .dataTables_length label, .dataTables_filter label { color: var(--text-secondary); }
        .page-item .page-link { background: var(--bg-surface); border-color: rgba(255,255,255,0.1); color: var(--text-primary); }
        .page-item.active .page-link { background: var(--accent); border-color: var(--accent); }

        /* Global dark-theme overrides for Bootstrap elements */
        .table, .table td, .table th, .table tr { color: var(--text-primary) !important; }
        .table td, .table th { border-top-color: rgba(255,255,255,0.08); }
        .table thead th { color: var(--text-secondary) !important; border-bottom-color: rgba(255,255,255,0.15); }
        .text-muted { color: var(--text-secondary) !important; }
        h1, h2, h3, h4, h5, h6 { color: #fff; }
        p { color: var(--text-primary); }
        a { color: var(--accent); }
        ul li, ol li { color: var(--text-primary); }
        strong { color: #fff; }
        code { background: var(--bg-surface); color: var(--accent); padding: 2px 6px; border-radius: 3px; }

        /* Country detail modal */
        .modal-content {
            background: var(--bg-card);
            color: var(--text-primary);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .modal-header { border-bottom-color: rgba(255,255,255,0.1); }
        .modal-footer { border-top-color: rgba(255,255,255,0.1); }
        .close { color: #fff; text-shadow: none; }

        /* Loading spinner */
        .loading-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(26,26,46,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            flex-direction: column;
        }

        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255,255,255,0.1);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .loading-text {
            color: var(--text-secondary);
            margin-top: 16px;
            font-size: 0.9rem;
        }

        /* Tabs */
        .nav-tabs { border-bottom-color: rgba(255,255,255,0.1); }
        .nav-tabs .nav-link {
            color: var(--text-secondary);
            border: none;
            padding: 8px 16px;
        }
        .nav-tabs .nav-link:hover { color: #fff; border: none; }
        .nav-tabs .nav-link.active {
            color: var(--accent);
            background: transparent;
            border: none;
            border-bottom: 2px solid var(--accent);
        }

        .tab-content { padding-top: 16px; }

        /* Utility */
        .text-emergency { color: var(--phase5-color); }
        .text-critical { color: var(--phase4-color); }
        .text-warning-custom { color: var(--phase3-color); }
        .text-accent { color: var(--accent); }
        .refresh-btn {
            background: var(--bg-surface);
            color: var(--text-secondary);
            border: 1px solid rgba(255,255,255,0.15);
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
        }
        .refresh-btn:hover { color: #fff; background: var(--accent); border-color: var(--accent); }

        .last-updated {
            font-size: 0.75rem;
            color: var(--text-secondary);
            text-align: right;
            padding: 8px 0;
        }

        /* Footer */
        .footer {
            text-align: center;
            padding: 20px;
            color: var(--text-secondary);
            font-size: 0.8rem;
            border-top: 1px solid rgba(255,255,255,0.05);
            margin-top: 30px;
        }
    </style>
</head>
<body>

<!-- Loading overlay -->
<div id="loading-overlay" class="loading-overlay">
    <div class="spinner"></div>
    <div class="loading-text">Loading Global Food Security Monitor...</div>
</div>

<!-- Navigation -->
<nav class="navbar navbar-expand-lg navbar-custom">
    <a class="navbar-brand" href="#">
        <i class="fas fa-globe-africa"></i><?php echo APP_NAME; ?>
        <span class="version-badge">v<?php echo APP_VERSION; ?></span>
    </a>
    <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav">
        <span class="navbar-toggler-icon" style="color:#fff;"><i class="fas fa-bars"></i></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ml-auto">
            <li class="nav-item">
                <a class="nav-link active" href="#" data-tab="dashboard"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#" data-tab="alerts"><i class="fas fa-exclamation-triangle"></i> Alerts</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#" data-tab="countries"><i class="fas fa-flag"></i> Countries</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#" data-tab="prices"><i class="fas fa-chart-line"></i> Prices</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#" data-tab="about"><i class="fas fa-info-circle"></i> About</a>
            </li>
        </ul>
    </div>
</nav>

<!-- Main Content -->
<div class="dashboard-container">

    <!-- Mock Data Banner -->
    <div style="background:rgba(15,52,96,0.6);border:1px solid rgba(85,193,233,0.4);border-radius:6px;padding:12px 20px;margin-bottom:20px;display:flex;align-items:center;gap:12px;">
        <i class="fas fa-flask" style="color:var(--accent);font-size:1.2rem;"></i>
        <div>
            <strong style="color:#fff;">Demo Mode — Mock Data</strong>
            <span style="color:var(--text-secondary);font-size:0.85rem;margin-left:8px;">
                All data shown is sample/seed data for demonstration purposes. It does not reflect real-world food security conditions.
                See the <a href="#" data-tab="about" style="color:var(--accent);">About</a> page for instructions on connecting to live APIs.
            </span>
        </div>
    </div>

    <!-- ================================================================= -->
    <!-- DASHBOARD TAB -->
    <!-- ================================================================= -->
    <div id="tab-dashboard" class="tab-section">

        <!-- KPI Cards -->
        <div class="kpi-grid">
            <div class="kpi-card emergency">
                <div class="kpi-value" id="kpi-crisis-pop"><?php echo number_format($total_crisis_pop); ?></div>
                <div class="kpi-label"><i class="fas fa-users"></i> People in Crisis (IPC 3+)</div>
            </div>
            <div class="kpi-card critical">
                <div class="kpi-value" id="kpi-famine-pop"><?php echo number_format($total_famine_pop); ?></div>
                <div class="kpi-label"><i class="fas fa-skull-crossbones"></i> People Facing Famine (IPC 5)</div>
            </div>
            <div class="kpi-card warning">
                <div class="kpi-value"><?php echo $emergency_count + $critical_count; ?></div>
                <div class="kpi-label"><i class="fas fa-bell"></i> Emergency & Critical Alerts</div>
            </div>
            <div class="kpi-card info">
                <div class="kpi-value"><?php echo count($countries); ?></div>
                <div class="kpi-label"><i class="fas fa-globe"></i> Countries Monitored</div>
            </div>
        </div>

        <!-- IPC World Map -->
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title"><i class="fas fa-map-marked-alt"></i> Food Security Map — IPC Phase by Country</div>
            </div>
            <div id="ipc-map"></div>
            <div class="map-legend">
                <div class="map-legend-item"><div class="map-legend-swatch" style="background:var(--phase1-color)"></div> Phase 1: Minimal</div>
                <div class="map-legend-item"><div class="map-legend-swatch" style="background:var(--phase2-color)"></div> Phase 2: Stressed</div>
                <div class="map-legend-item"><div class="map-legend-swatch" style="background:var(--phase3-color)"></div> Phase 3: Crisis</div>
                <div class="map-legend-item"><div class="map-legend-swatch" style="background:var(--phase4-color)"></div> Phase 4: Emergency</div>
                <div class="map-legend-item"><div class="map-legend-swatch" style="background:var(--phase5-color)"></div> Phase 5: Famine</div>
                <div class="map-legend-item"><div class="map-legend-swatch" style="background:#444"></div> No data</div>
            </div>
        </div>

        <div class="row">
            <!-- IPC Overview Chart -->
            <div class="col-lg-8">
                <div class="panel">
                    <div class="panel-header">
                        <div class="panel-title"><i class="fas fa-chart-bar"></i> IPC Phase Distribution by Country</div>
                        <button class="refresh-btn" onclick="refreshIpcChart()"><i class="fas fa-sync-alt"></i> Refresh</button>
                    </div>
                    <div class="chart-container">
                        <canvas id="ipcChart"></canvas>
                    </div>
                    <div class="ipc-legend" style="margin-top: 12px;">
                        <div class="ipc-legend-item"><div class="ipc-legend-swatch" style="background:var(--phase1-color)"></div> Phase 1: Minimal</div>
                        <div class="ipc-legend-item"><div class="ipc-legend-swatch" style="background:var(--phase2-color)"></div> Phase 2: Stressed</div>
                        <div class="ipc-legend-item"><div class="ipc-legend-swatch" style="background:var(--phase3-color)"></div> Phase 3: Crisis</div>
                        <div class="ipc-legend-item"><div class="ipc-legend-swatch" style="background:var(--phase4-color)"></div> Phase 4: Emergency</div>
                        <div class="ipc-legend-item"><div class="ipc-legend-swatch" style="background:var(--phase5-color)"></div> Phase 5: Famine</div>
                    </div>
                </div>
            </div>

            <!-- Latest Alerts Sidebar -->
            <div class="col-lg-4">
                <div class="panel">
                    <div class="panel-header">
                        <div class="panel-title"><i class="fas fa-exclamation-triangle"></i> Latest Alerts</div>
                        <button class="refresh-btn" onclick="refreshAlerts()"><i class="fas fa-sync-alt"></i></button>
                    </div>
                    <div id="alerts-feed" style="max-height: 400px; overflow-y: auto;">
                        <?php foreach (array_slice($active_alerts, 0, 5) as $alert): ?>
                        <div class="alert-card <?php echo $alert['severity']; ?>">
                            <span class="alert-severity severity-<?php echo $alert['severity']; ?>"><?php echo $alert['severity']; ?></span>
                            <div class="alert-title"><?php echo htmlspecialchars($alert['title']); ?></div>
                            <div class="alert-desc"><?php echo htmlspecialchars(substr($alert['description'], 0, 120)); ?>...</div>
                            <div class="alert-meta">
                                <i class="fas fa-map-marker-alt"></i> <?php echo htmlspecialchars($alert['country_name']); ?> &bull;
                                <i class="fas fa-calendar"></i> <?php echo $alert['alert_date']; ?> &bull;
                                <i class="fas fa-tag"></i> <?php echo htmlspecialchars($alert['source']); ?>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- IPC Country Table -->
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title"><i class="fas fa-table"></i> IPC Classifications — Latest Period</div>
            </div>
            <div class="table-responsive">
                <table id="ipc-table" class="table table-sm" style="width:100%">
                    <thead>
                        <tr>
                            <th>Country</th>
                            <th>Phase</th>
                            <th>Phase Distribution</th>
                            <th>Crisis+ Pop</th>
                            <th>Period</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($ipc_latest as $row): ?>
                        <?php
                            $total = max($row['total_analyzed'], 1);
                            $p1w = round($row['phase1_population'] / $total * 100, 1);
                            $p2w = round($row['phase2_population'] / $total * 100, 1);
                            $p3w = round($row['phase3_population'] / $total * 100, 1);
                            $p4w = round($row['phase4_population'] / $total * 100, 1);
                            $p5w = round($row['phase5_population'] / $total * 100, 1);
                            $crisis_pop = $row['phase3_population'] + $row['phase4_population'] + $row['phase5_population'];
                        ?>
                        <tr style="cursor:pointer" onclick="showCountryDetail('<?php echo $row['iso3']; ?>')">
                            <td><strong><?php echo htmlspecialchars($row['country_name']); ?></strong> <small class="text-muted">(<?php echo $row['iso3']; ?>)</small></td>
                            <td><span class="phase-badge p<?php echo $row['overall_phase']; ?>"><?php echo $row['overall_phase']; ?></span></td>
                            <td>
                                <div class="ipc-bar">
                                    <div class="phase phase1" style="width:<?php echo $p1w; ?>%" title="Phase 1: <?php echo number_format($row['phase1_population']); ?>"></div>
                                    <div class="phase phase2" style="width:<?php echo $p2w; ?>%" title="Phase 2: <?php echo number_format($row['phase2_population']); ?>"></div>
                                    <div class="phase phase3" style="width:<?php echo $p3w; ?>%" title="Phase 3: <?php echo number_format($row['phase3_population']); ?>"></div>
                                    <div class="phase phase4" style="width:<?php echo $p4w; ?>%" title="Phase 4: <?php echo number_format($row['phase4_population']); ?>"></div>
                                    <div class="phase phase5" style="width:<?php echo $p5w; ?>%" title="Phase 5: <?php echo number_format($row['phase5_population']); ?>"></div>
                                </div>
                            </td>
                            <td><?php echo number_format($crisis_pop); ?></td>
                            <td><small><?php echo $row['period_start']; ?> to <?php echo $row['period_end']; ?></small></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Nutrition Overview Chart -->
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title"><i class="fas fa-heartbeat"></i> Child Malnutrition Indicators (Under 5)</div>
            </div>
            <div class="chart-container">
                <canvas id="nutritionChart"></canvas>
            </div>
        </div>

    </div>

    <!-- ================================================================= -->
    <!-- ALERTS TAB -->
    <!-- ================================================================= -->
    <div id="tab-alerts" class="tab-section" style="display:none">
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title"><i class="fas fa-exclamation-triangle"></i> All Active Alerts</div>
                <div>
                    <select id="alert-severity-filter" class="form-control form-control-sm" style="display:inline-block;width:auto;background:var(--bg-surface);color:var(--text-primary);border-color:rgba(255,255,255,0.2);">
                        <option value="">All Severities</option>
                        <option value="emergency">Emergency</option>
                        <option value="critical">Critical</option>
                        <option value="warning">Warning</option>
                        <option value="info">Info</option>
                    </select>
                    <button class="refresh-btn" onclick="loadAlerts()"><i class="fas fa-sync-alt"></i> Refresh</button>
                </div>
            </div>
            <div id="all-alerts-container">
                <?php foreach ($active_alerts as $alert): ?>
                <div class="alert-card <?php echo $alert['severity']; ?>">
                    <span class="alert-severity severity-<?php echo $alert['severity']; ?>"><?php echo $alert['severity']; ?></span>
                    <span class="ml-2" style="font-size:0.8rem;color:var(--text-secondary);"><?php echo htmlspecialchars($alert['country_name']); ?> (<?php echo $alert['iso3']; ?>)</span>
                    <div class="alert-title"><?php echo htmlspecialchars($alert['title']); ?></div>
                    <div class="alert-desc"><?php echo htmlspecialchars($alert['description']); ?></div>
                    <div class="alert-meta">
                        <i class="fas fa-calendar"></i> <?php echo $alert['alert_date']; ?> &bull;
                        <i class="fas fa-tag"></i> <?php echo htmlspecialchars($alert['source']); ?>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>

    <!-- ================================================================= -->
    <!-- COUNTRIES TAB -->
    <!-- ================================================================= -->
    <div id="tab-countries" class="tab-section" style="display:none">
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title"><i class="fas fa-flag"></i> Monitored Countries</div>
                <div>
                    <select id="region-filter" class="form-control form-control-sm" style="display:inline-block;width:auto;background:var(--bg-surface);color:var(--text-primary);border-color:rgba(255,255,255,0.2);">
                        <option value="">All Regions</option>
                        <option value="Africa">Africa</option>
                        <option value="Asia">Asia</option>
                        <option value="Americas">Americas</option>
                    </select>
                </div>
            </div>
            <div class="table-responsive">
                <table id="countries-table" class="table table-sm" style="width:100%">
                    <thead>
                        <tr>
                            <th>Country</th>
                            <th>ISO3</th>
                            <th>Region</th>
                            <th>Sub-Region</th>
                            <th>Population</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($countries as $c): ?>
                        <tr>
                            <td><strong><?php echo htmlspecialchars($c['name']); ?></strong></td>
                            <td><?php echo $c['iso3']; ?></td>
                            <td><?php echo htmlspecialchars($c['region']); ?></td>
                            <td><?php echo htmlspecialchars($c['sub_region']); ?></td>
                            <td><?php echo $c['population'] ? number_format($c['population']) : 'N/A'; ?></td>
                            <td>
                                <button class="btn btn-sm btn-outline-info" onclick="showCountryDetail('<?php echo $c['iso3']; ?>')">
                                    <i class="fas fa-eye"></i> View
                                </button>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- ================================================================= -->
    <!-- PRICES TAB -->
    <!-- ================================================================= -->
    <div id="tab-prices" class="tab-section" style="display:none">
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title"><i class="fas fa-chart-line"></i> Commodity Prices</div>
                <button class="refresh-btn" onclick="loadPrices()"><i class="fas fa-sync-alt"></i> Refresh</button>
            </div>
            <div class="chart-container" style="height:350px;">
                <canvas id="priceChart"></canvas>
            </div>
        </div>
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title"><i class="fas fa-table"></i> Price Data</div>
            </div>
            <div class="table-responsive">
                <table id="prices-table" class="table table-sm" style="width:100%">
                    <thead>
                        <tr>
                            <th>Country</th>
                            <th>Commodity</th>
                            <th>Market</th>
                            <th>Price (USD)</th>
                            <th>Unit</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody id="prices-tbody"></tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- ================================================================= -->
    <!-- ABOUT TAB -->
    <!-- ================================================================= -->
    <div id="tab-about" class="tab-section" style="display:none">
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title"><i class="fas fa-info-circle"></i> About This Application</div>
            </div>
            <div style="max-width:800px;">
                <h4>Global Food Security Monitor</h4>
                <p>This application aggregates and visualizes food security data from multiple international sources to provide a unified view of global hunger and food crisis situations.</p>

                <h5>Data Sources</h5>
                <ul>
                    <li><strong>IPC (Integrated Food Security Phase Classification)</strong> — Acute food insecurity classifications</li>
                    <li><strong>FAO (Food and Agriculture Organization)</strong> — Agricultural production and food price data</li>
                    <li><strong>WFP (World Food Programme)</strong> — Market prices, food security assessments</li>
                    <li><strong>FEWS NET (Famine Early Warning Systems Network)</strong> — Food security alerts and forecasts</li>
                    <li><strong>UNICEF</strong> — Child nutrition indicators</li>
                </ul>

                <h5>IPC Phase Classification</h5>
                <table class="table table-sm" style="max-width:600px;">
                    <tr><td><span class="phase-badge p1">1</span></td><td>Minimal/None</td><td>Households able to meet food and non-food needs</td></tr>
                    <tr><td><span class="phase-badge p2">2</span></td><td>Stressed</td><td>Minimally adequate food consumption, unable to afford non-food expenses</td></tr>
                    <tr><td><span class="phase-badge p3">3</span></td><td>Crisis</td><td>Food gaps with high acute malnutrition</td></tr>
                    <tr><td><span class="phase-badge p4">4</span></td><td>Emergency</td><td>Large food gaps, very high acute malnutrition and excess mortality</td></tr>
                    <tr><td><span class="phase-badge p5">5</span></td><td>Famine</td><td>Mass starvation, death, and destitution</td></tr>
                </table>

                <h5>Technical Details</h5>
                <p>
                    <strong>Version:</strong> <?php echo APP_VERSION; ?><br>
                    <strong>Stack:</strong> PHP <?php echo phpversion(); ?>, MySQL, jQuery, Chart.js<br>
                    <strong>Last Data Refresh:</strong> <span id="about-last-refresh">—</span>
                </p>

                <h5>Connecting to Real Data</h5>
                <p>This application currently runs with <strong>mock seed data</strong>. To connect to live APIs, update the keys in <code>config.php</code>:</p>
                <table class="table table-sm" style="max-width:700px;">
                    <thead><tr><th>API</th><th>Auth</th><th>Registration</th></tr></thead>
                    <tr><td><strong>WFP Data Bridges</strong></td><td>Bearer token</td><td>Sign up at <a href="https://databridges.vam.wfp.org/" target="_blank" style="color:var(--accent)">databridges.vam.wfp.org</a>, wait for approval, generate key</td></tr>
                    <tr><td><strong>FAOSTAT</strong></td><td>JWT (email/password)</td><td>Register at <a href="https://www.fao.org/faostat/en/#data" target="_blank" style="color:var(--accent)">fao.org/faostat</a> — tokens expire hourly</td></tr>
                    <tr><td><strong>FEWS NET</strong></td><td>None (public)</td><td>No key needed — endpoints are open</td></tr>
                </table>

                <div class="alert alert-warning" style="background:rgba(230,120,0,0.15);border-color:var(--phase3-color);color:var(--text-primary);">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Disclaimer:</strong> This is a monitoring tool for informational purposes only.
                    Food security assessments should be verified against official IPC/CH analyses and
                    humanitarian situation reports before being used for operational decision-making.
                </div>
            </div>
        </div>
    </div>

    <!-- Last updated timestamp -->
    <div class="last-updated">
        Last updated: <span id="last-updated-time"><?php echo date('Y-m-d H:i:s T'); ?></span>
        <span style="margin-left: 16px;">
            <i class="fas fa-database"></i> Database: <?php echo DB_HOST; ?>:<?php echo DB_PORT; ?>/<?php echo DB_NAME; ?>
        </span>
    </div>

</div>

<!-- Footer -->
<div class="footer">
    <?php echo APP_NAME; ?> v<?php echo APP_VERSION; ?> &copy; <?php echo date('Y'); ?> |
    <span style="color:var(--accent);">⚗ DEMO — MOCK DATA</span> |
    Data sources: IPC, FAO, WFP, FEWS NET, UNICEF |
    <a href="#" style="color:var(--accent);">Report an Issue</a>
</div>

<!-- Country Detail Modal -->
<div class="modal fade" id="countryModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="countryModalTitle">Country Detail</h5>
                <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <div class="modal-body" id="countryModalBody">
                <div class="text-center py-4">
                    <div class="spinner" style="margin:0 auto;"></div>
                    <div class="loading-text">Loading country data...</div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>

<!-- CDN Scripts -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.13.7/js/dataTables.bootstrap4.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- Inline Application JavaScript (everything in one place, legacy-style) -->
<script>
$(document).ready(function() {
    // Hide loading overlay
    setTimeout(function() {
        $('#loading-overlay').fadeOut(300);
    }, 500);

    // Initialize DataTables
    $('#ipc-table').DataTable({
        paging: false,
        searching: false,
        info: false,
        order: [[1, 'desc']]
    });

    $('#countries-table').DataTable({
        pageLength: 15,
        order: [[0, 'asc']]
    });

    // Initialize Charts
    initIpcChart();
    initNutritionChart();
    loadPrices();
    initIpcMap();

    // Tab navigation
    $('[data-tab]').on('click', function(e) {
        e.preventDefault();
        var tab = $(this).data('tab');
        switchTab(tab);
    });

    // Alert severity filter
    $('#alert-severity-filter').on('change', function() {
        var severity = $(this).val();
        loadAlerts(severity);
    });

    // Region filter
    $('#region-filter').on('change', function() {
        var region = $(this).val();
        var table = $('#countries-table').DataTable();
        table.column(2).search(region).draw();
    });

    // Auto-refresh every 5 minutes (hits API with no caching)
    setInterval(function() {
        refreshDashboard();
    }, 300000);
});

// =============================================================================
// Tab Navigation
// =============================================================================

function switchTab(tab) {
    $('.tab-section').hide();
    $('#tab-' + tab).show();
    $('[data-tab]').removeClass('active');
    $('[data-tab="' + tab + '"]').addClass('active');
}

// =============================================================================
// IPC Chart
// =============================================================================

var ipcChart = null;

function initIpcChart() {
    var ipcData = <?php echo json_encode($ipc_latest); ?>;
    var labels = [];
    var p1 = [], p2 = [], p3 = [], p4 = [], p5 = [];

    for (var i = 0; i < ipcData.length; i++) {
        labels.push(ipcData[i].country_name);
        var total = Math.max(parseInt(ipcData[i].total_analyzed), 1);
        p1.push(Math.round(parseInt(ipcData[i].phase1_population) / total * 100));
        p2.push(Math.round(parseInt(ipcData[i].phase2_population) / total * 100));
        p3.push(Math.round(parseInt(ipcData[i].phase3_population) / total * 100));
        p4.push(Math.round(parseInt(ipcData[i].phase4_population) / total * 100));
        p5.push(Math.round(parseInt(ipcData[i].phase5_population) / total * 100));
    }

    var ctx = document.getElementById('ipcChart').getContext('2d');
    ipcChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Phase 1', data: p1, backgroundColor: '#c6e5b3' },
                { label: 'Phase 2', data: p2, backgroundColor: '#f9e065' },
                { label: 'Phase 3', data: p3, backgroundColor: '#e67800' },
                { label: 'Phase 4', data: p4, backgroundColor: '#c80000' },
                { label: 'Phase 5', data: p5, backgroundColor: '#640000' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: '#a0a0a0', maxRotation: 45 },
                    grid: { display: false }
                },
                y: {
                    stacked: true,
                    max: 100,
                    ticks: { color: '#a0a0a0', callback: function(v) { return v + '%'; } },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return ctx.dataset.label + ': ' + ctx.raw + '%';
                        }
                    }
                }
            }
        }
    });
}

function refreshIpcChart() {
    $.getJSON('api_proxy.php?action=ipc_data', function(response) {
        if (response.status === 'ok') {
            // Rebuild chart with fresh data — no smart diffing, just destroy and recreate
            if (ipcChart) ipcChart.destroy();
            // This is a simplified refresh; in practice it re-renders the same server data
            initIpcChart();
            updateTimestamp();
        }
    }).fail(function() {
        alert('Failed to refresh IPC data. Please try again.');
    });
}

// =============================================================================
// IPC World Map
// =============================================================================

var ipcMap = null;

function initIpcMap() {
    var ipcData = <?php
        // Build iso3 => { phase, crisis_pop, country_name } lookup
        $mapData = [];
        foreach ($ipc_latest as $row) {
            $crisis = $row['phase3_population'] + $row['phase4_population'] + $row['phase5_population'];
            $mapData[$row['iso3']] = [
                'phase' => (int)$row['overall_phase'],
                'crisis_pop' => $crisis,
                'name' => $row['country_name']
            ];
        }
        echo json_encode($mapData);
    ?>;

    var phaseColors = {
        1: '#c6e5b3',
        2: '#f9e065',
        3: '#e67800',
        4: '#c80000',
        5: '#640000'
    };

    var phaseLabels = {
        1: 'Minimal',
        2: 'Stressed',
        3: 'Crisis',
        4: 'Emergency',
        5: 'Famine'
    };

    ipcMap = L.map('ipc-map', {
        center: [10, 25],
        zoom: 2,
        minZoom: 2,
        maxZoom: 6,
        worldCopyJump: true,
        attributionControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(ipcMap);

    // Load GeoJSON country boundaries
    $.getJSON('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson', function(geojson) {
        L.geoJSON(geojson, {
            style: function(feature) {
                var iso3 = feature.properties.ISO_A3;
                var d = ipcData[iso3];
                return {
                    fillColor: d ? phaseColors[d.phase] : '#444',
                    weight: 1,
                    color: 'rgba(255,255,255,0.2)',
                    fillOpacity: d ? 0.75 : 0.15
                };
            },
            onEachFeature: function(feature, layer) {
                var iso3 = feature.properties.ISO_A3;
                var d = ipcData[iso3];
                if (d) {
                    layer.bindTooltip(
                        '<strong>' + escapeHtml(d.name) + '</strong><br>' +
                        'IPC Phase ' + d.phase + ': ' + phaseLabels[d.phase] + '<br>' +
                        'Crisis+ Population: ' + Number(d.crisis_pop).toLocaleString(),
                        { sticky: true, className: 'ipc-map-tooltip' }
                    );
                    layer.on('click', function() {
                        showCountryDetail(iso3);
                    });
                    layer.on('mouseover', function() {
                        layer.setStyle({ weight: 2, color: '#fff', fillOpacity: 0.9 });
                        layer.bringToFront();
                    });
                    layer.on('mouseout', function() {
                        layer.setStyle({ weight: 1, color: 'rgba(255,255,255,0.2)', fillOpacity: 0.75 });
                    });
                } else {
                    layer.bindTooltip(feature.properties.ADMIN + '<br><em>No data</em>', { sticky: true });
                }
            }
        }).addTo(ipcMap);
    });
}

// =============================================================================
// Nutrition Chart
// =============================================================================

function initNutritionChart() {
    var nutritionData = <?php
        $nutrition = $db->query('
            SELECT n.*, c.name as country_name
            FROM nutrition_data n
            JOIN countries c ON n.country_id = c.id
            WHERE n.indicator IN ("stunting", "wasting")
            ORDER BY c.name ASC, n.indicator ASC
        ')->fetchAll();

        $grouped = [];
        foreach ($nutrition as $n) {
            $grouped[$n['country_name']][$n['indicator']] = $n['value'];
        }
        echo json_encode($grouped);
    ?>;

    var labels = Object.keys(nutritionData);
    var stuntingData = [];
    var wastingData = [];

    for (var i = 0; i < labels.length; i++) {
        stuntingData.push(nutritionData[labels[i]].stunting || 0);
        wastingData.push(nutritionData[labels[i]].wasting || 0);
    }

    var ctx = document.getElementById('nutritionChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Stunting (%)',
                    data: stuntingData,
                    backgroundColor: 'rgba(233,69,96,0.7)',
                    borderColor: 'rgba(233,69,96,1)',
                    borderWidth: 1
                },
                {
                    label: 'Wasting (%)',
                    data: wastingData,
                    backgroundColor: 'rgba(15,52,96,0.7)',
                    borderColor: 'rgba(15,52,96,1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: '#a0a0a0', maxRotation: 45 },
                    grid: { display: false }
                },
                y: {
                    ticks: { color: '#a0a0a0', callback: function(v) { return v + '%'; } },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    suggestedMax: 50
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#a0a0a0' }
                }
            }
        }
    });
}

// =============================================================================
// Alerts
// =============================================================================

function refreshAlerts() {
    loadAlerts();
}

function loadAlerts(severity) {
    var url = 'api_proxy.php?action=alerts&active_only=1';
    if (severity) url += '&severity=' + severity;

    $.getJSON(url, function(response) {
        if (response.status === 'ok') {
            var html = '';
            $.each(response.data, function(i, alert) {
                html += '<div class="alert-card ' + alert.severity + '">';
                html += '<span class="alert-severity severity-' + alert.severity + '">' + alert.severity + '</span>';
                html += '<span class="ml-2" style="font-size:0.8rem;color:var(--text-secondary);">' + escapeHtml(alert.country_name) + ' (' + alert.iso3 + ')</span>';
                html += '<div class="alert-title">' + escapeHtml(alert.title) + '</div>';
                html += '<div class="alert-desc">' + escapeHtml(alert.description) + '</div>';
                html += '<div class="alert-meta"><i class="fas fa-calendar"></i> ' + alert.alert_date + ' &bull; <i class="fas fa-tag"></i> ' + escapeHtml(alert.source) + '</div>';
                html += '</div>';
            });
            $('#all-alerts-container').html(html);

            // Also update dashboard feed
            var feedHtml = '';
            $.each(response.data.slice(0, 5), function(i, alert) {
                feedHtml += '<div class="alert-card ' + alert.severity + '">';
                feedHtml += '<span class="alert-severity severity-' + alert.severity + '">' + alert.severity + '</span>';
                feedHtml += '<div class="alert-title">' + escapeHtml(alert.title) + '</div>';
                feedHtml += '<div class="alert-desc">' + escapeHtml(alert.description).substring(0, 120) + '...</div>';
                feedHtml += '<div class="alert-meta"><i class="fas fa-map-marker-alt"></i> ' + escapeHtml(alert.country_name) + ' &bull; <i class="fas fa-calendar"></i> ' + alert.alert_date + '</div>';
                feedHtml += '</div>';
            });
            $('#alerts-feed').html(feedHtml);

            updateTimestamp();
        }
    }).fail(function() {
        alert('Failed to load alerts.');
    });
}

// =============================================================================
// Commodity Prices
// =============================================================================

var priceChart = null;

function loadPrices() {
    $.getJSON('api_proxy.php?action=commodity_prices', function(response) {
        if (response.status === 'ok') {
            // Populate table
            var html = '';
            $.each(response.data, function(i, p) {
                html += '<tr>';
                html += '<td>' + escapeHtml(p.country_name) + '</td>';
                html += '<td>' + escapeHtml(p.commodity) + '</td>';
                html += '<td>' + escapeHtml(p.market || 'N/A') + '</td>';
                html += '<td>$' + parseFloat(p.price).toFixed(2) + '</td>';
                html += '<td>' + escapeHtml(p.unit) + '</td>';
                html += '<td>' + p.price_date + '</td>';
                html += '</tr>';
            });
            $('#prices-tbody').html(html);

            // Initialize DataTable if not already
            if (!$.fn.DataTable.isDataTable('#prices-table')) {
                $('#prices-table').DataTable({
                    pageLength: 15,
                    order: [[0, 'asc']]
                });
            }

            // Build price chart grouped by commodity
            var commodities = {};
            $.each(response.data, function(i, p) {
                if (!commodities[p.commodity]) {
                    commodities[p.commodity] = { labels: [], data: [] };
                }
                commodities[p.commodity].labels.push(p.country_name);
                commodities[p.commodity].data.push(parseFloat(p.price));
            });

            var datasets = [];
            var colors = ['#e94560', '#0f3460', '#f9e065', '#c6e5b3', '#e67800', '#c80000', '#16213e', '#640000'];
            var colorIdx = 0;
            $.each(commodities, function(name, cd) {
                // Only show commodities with multiple data points for chart clarity
                if (cd.data.length >= 2) {
                    datasets.push({
                        label: name,
                        data: cd.data,
                        backgroundColor: colors[colorIdx % colors.length] + 'aa',
                        borderColor: colors[colorIdx % colors.length],
                        borderWidth: 1
                    });
                    colorIdx++;
                }
            });

            // Use first commodity's labels as x-axis (simplified)
            var chartLabels = [];
            $.each(response.data, function(i, p) {
                if (chartLabels.indexOf(p.country_name) === -1) {
                    chartLabels.push(p.country_name);
                }
            });

            if (priceChart) priceChart.destroy();

            // Build a simpler commodity comparison chart
            var commodityNames = Object.keys(commodities);
            var avgPrices = [];
            var chartColors = [];
            $.each(commodityNames, function(i, name) {
                var sum = 0;
                $.each(commodities[name].data, function(j, v) { sum += v; });
                avgPrices.push((sum / commodities[name].data.length).toFixed(2));
                chartColors.push(colors[i % colors.length]);
            });

            var ctx = document.getElementById('priceChart').getContext('2d');
            priceChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: commodityNames,
                    datasets: [{
                        label: 'Avg Price (USD)',
                        data: avgPrices,
                        backgroundColor: chartColors.map(function(c) { return c + 'bb'; }),
                        borderColor: chartColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            ticks: { color: '#a0a0a0' },
                            grid: { display: false }
                        },
                        y: {
                            ticks: { color: '#a0a0a0', callback: function(v) { return '$' + v; } },
                            grid: { color: 'rgba(255,255,255,0.05)' }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });

            updateTimestamp();
        }
    }).fail(function() {
        console.error('Failed to load prices');
    });
}

// =============================================================================
// Country Detail Modal
// =============================================================================

function showCountryDetail(iso3) {
    $('#countryModalTitle').text('Loading...');
    $('#countryModalBody').html('<div class="text-center py-4"><div class="spinner" style="margin:0 auto;"></div><div class="loading-text">Loading country data...</div></div>');
    $('#countryModal').modal('show');

    $.getJSON('api_proxy.php?action=country_detail&iso3=' + iso3, function(response) {
        if (response.status === 'ok') {
            var d = response.data;
            var c = d.country;
            $('#countryModalTitle').text(c.name + ' (' + c.iso3 + ')');

            var html = '';

            // Country info
            html += '<div class="row mb-3">';
            html += '<div class="col-md-6">';
            html += '<p><strong>Region:</strong> ' + escapeHtml(c.region) + (c.sub_region ? ' / ' + escapeHtml(c.sub_region) : '') + '</p>';
            html += '<p><strong>Population:</strong> ' + (c.population ? Number(c.population).toLocaleString() : 'N/A') + '</p>';
            html += '</div>';
            html += '<div class="col-md-6">';
            html += '<p><strong>ISO Codes:</strong> ' + c.iso3 + ' / ' + c.iso2 + '</p>';
            html += '<p><strong>Coordinates:</strong> ' + c.latitude + ', ' + c.longitude + '</p>';
            html += '</div>';
            html += '</div>';

            // IPC Data
            if (d.ipc.length > 0) {
                html += '<h6><i class="fas fa-chart-pie text-accent"></i> IPC Classifications</h6>';
                html += '<table class="table table-sm">';
                html += '<thead><tr><th>Period</th><th>Phase</th><th>Crisis+ Pop</th></tr></thead><tbody>';
                $.each(d.ipc, function(i, ipc) {
                    var crisis = parseInt(ipc.phase3_population) + parseInt(ipc.phase4_population) + parseInt(ipc.phase5_population);
                    html += '<tr>';
                    html += '<td>' + ipc.period_start + ' to ' + ipc.period_end + '</td>';
                    html += '<td><span class="phase-badge p' + ipc.overall_phase + '">' + ipc.overall_phase + '</span></td>';
                    html += '<td>' + Number(crisis).toLocaleString() + '</td>';
                    html += '</tr>';
                });
                html += '</tbody></table>';
            }

            // Alerts
            if (d.alerts.length > 0) {
                html += '<h6><i class="fas fa-exclamation-triangle text-accent"></i> Active Alerts</h6>';
                $.each(d.alerts, function(i, alert) {
                    html += '<div class="alert-card ' + alert.severity + '" style="margin-bottom:8px;">';
                    html += '<span class="alert-severity severity-' + alert.severity + '">' + alert.severity + '</span> ';
                    html += '<strong>' + escapeHtml(alert.title) + '</strong>';
                    html += '<div class="alert-desc">' + escapeHtml(alert.description) + '</div>';
                    html += '</div>';
                });
            }

            // Prices
            if (d.prices.length > 0) {
                html += '<h6 class="mt-3"><i class="fas fa-shopping-cart text-accent"></i> Commodity Prices</h6>';
                html += '<table class="table table-sm">';
                html += '<thead><tr><th>Commodity</th><th>Market</th><th>Price</th><th>Date</th></tr></thead><tbody>';
                $.each(d.prices, function(i, p) {
                    html += '<tr>';
                    html += '<td>' + escapeHtml(p.commodity) + '</td>';
                    html += '<td>' + escapeHtml(p.market || 'N/A') + '</td>';
                    html += '<td>$' + parseFloat(p.price).toFixed(2) + '/' + escapeHtml(p.unit) + '</td>';
                    html += '<td>' + p.price_date + '</td>';
                    html += '</tr>';
                });
                html += '</tbody></table>';
            }

            // Nutrition
            if (d.nutrition.length > 0) {
                html += '<h6 class="mt-3"><i class="fas fa-heartbeat text-accent"></i> Nutrition Indicators</h6>';
                html += '<table class="table table-sm">';
                html += '<thead><tr><th>Indicator</th><th>Value</th><th>Year</th><th>Source</th></tr></thead><tbody>';
                $.each(d.nutrition, function(i, n) {
                    html += '<tr>';
                    html += '<td>' + escapeHtml(n.indicator) + '</td>';
                    html += '<td>' + n.value + '%</td>';
                    html += '<td>' + n.year + '</td>';
                    html += '<td>' + escapeHtml(n.source || 'N/A') + '</td>';
                    html += '</tr>';
                });
                html += '</tbody></table>';
            }

            $('#countryModalBody').html(html);
        }
    }).fail(function() {
        $('#countryModalBody').html('<div class="text-center text-danger py-4"><i class="fas fa-exclamation-circle fa-2x"></i><p class="mt-2">Failed to load country data.</p></div>');
    });
}

// =============================================================================
// Dashboard Refresh
// =============================================================================

function refreshDashboard() {
    $.getJSON('api_proxy.php?action=dashboard_summary', function(response) {
        if (response.status === 'ok') {
            var d = response.data;
            $('#kpi-crisis-pop').text(Number(d.crisis_population).toLocaleString());
            $('#kpi-famine-pop').text(Number(d.famine_population).toLocaleString());
            updateTimestamp();
        }
    });
}

function updateTimestamp() {
    var now = new Date();
    $('#last-updated-time').text(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
}

// =============================================================================
// Utility
// =============================================================================

function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num;
}
</script>

</body>
</html>
