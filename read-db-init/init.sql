CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT,
    category TEXT,
    price NUMERIC,
    stock INTEGER
);

CREATE TABLE product_sales_view (
 product_id INT PRIMARY KEY,
 total_quantity_sold INT DEFAULT 0,
 total_revenue NUMERIC DEFAULT 0,
 order_count INT DEFAULT 0
);

CREATE TABLE category_metrics_view (
 category_name VARCHAR PRIMARY KEY,
 total_revenue NUMERIC DEFAULT 0,
 total_orders INT DEFAULT 0
);

CREATE TABLE customer_ltv_view (
 customer_id INT PRIMARY KEY,
 total_spent NUMERIC DEFAULT 0,
 order_count INT DEFAULT 0,
 last_order_date TIMESTAMP
);

CREATE TABLE hourly_sales_view (
 hour_timestamp TIMESTAMP PRIMARY KEY,
 total_orders INT DEFAULT 0,
 total_revenue NUMERIC DEFAULT 0
);

CREATE TABLE processed_events (
 event_id UUID PRIMARY KEY,
 processed_at TIMESTAMP DEFAULT NOW()
);