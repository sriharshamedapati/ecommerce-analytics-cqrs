CREATE TABLE products (
 id SERIAL PRIMARY KEY,
 name VARCHAR(255),
 category VARCHAR(100),
 price NUMERIC(10,2),
 stock INT
);

CREATE TABLE orders (
 id SERIAL PRIMARY KEY,
 customer_id INT,
 total NUMERIC(12,2),
 status VARCHAR(50),
 created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
 id SERIAL PRIMARY KEY,
 order_id INT REFERENCES orders(id),
 product_id INT REFERENCES products(id),
 quantity INT,
 price NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS outbox (
    id UUID PRIMARY KEY,
    topic VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP NULL
);