-- Retail analytics sample schema (MySQL — external data source for SheetVision)

CREATE TABLE IF NOT EXISTS products (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    sku             VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(120) NOT NULL,
    category        VARCHAR(60) NOT NULL,
    unit_price      DECIMAL(12, 2) NOT NULL,
    stock_qty       INT NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    order_code      VARCHAR(40) NOT NULL UNIQUE,
    customer_name   VARCHAR(120) NOT NULL,
    region          VARCHAR(60) NOT NULL,
    status          VARCHAR(20) NOT NULL,
    ordered_at      DATETIME NOT NULL,
    total_amount    DECIMAL(14, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id        INT NOT NULL,
    product_id      INT NOT NULL,
    quantity        INT NOT NULL,
    line_total      DECIMAL(14, 2) NOT NULL,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS daily_sales_summary (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    summary_date    DATE NOT NULL,
    region          VARCHAR(60) NOT NULL,
    order_count     INT NOT NULL,
    revenue         DECIMAL(14, 2) NOT NULL,
    UNIQUE KEY uniq_region_date (summary_date, region)
);

CREATE INDEX idx_orders_ordered_at ON orders (ordered_at DESC);
CREATE INDEX idx_orders_region ON orders (region);
CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_daily_sales_summary_date ON daily_sales_summary (summary_date DESC);
