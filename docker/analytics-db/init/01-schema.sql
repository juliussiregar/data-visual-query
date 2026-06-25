-- IoT analytics database schema (read by SheetVision as external data source)

CREATE TABLE IF NOT EXISTS devices (
    id              SERIAL PRIMARY KEY,
    device_code     VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(120) NOT NULL,
    device_type     VARCHAR(40) NOT NULL,
    location        VARCHAR(120) NOT NULL,
    zone            VARCHAR(80) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'online',
    installed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensor_readings (
    id              BIGSERIAL PRIMARY KEY,
    device_id       INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    metric          VARCHAR(40) NOT NULL,
    value           NUMERIC(12, 4) NOT NULL,
    unit            VARCHAR(20) NOT NULL,
    quality         VARCHAR(20) NOT NULL DEFAULT 'good',
    recorded_at     TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS device_alerts (
    id              BIGSERIAL PRIMARY KEY,
    device_id       INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    severity        VARCHAR(20) NOT NULL,
    message         TEXT NOT NULL,
    triggered_at    TIMESTAMPTZ NOT NULL,
    resolved_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS device_daily_summary (
    id              BIGSERIAL PRIMARY KEY,
    device_id       INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    summary_date    DATE NOT NULL,
    metric          VARCHAR(40) NOT NULL,
    avg_value       NUMERIC(12, 4) NOT NULL,
    min_value       NUMERIC(12, 4) NOT NULL,
    max_value       NUMERIC(12, 4) NOT NULL,
    reading_count   INTEGER NOT NULL,
    UNIQUE (device_id, summary_date, metric)
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at ON sensor_readings (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_metric ON sensor_readings (device_id, metric, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_alerts_triggered_at ON device_alerts (triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_daily_summary_date ON device_daily_summary (summary_date DESC);
