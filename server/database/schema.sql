-- This defines all tables in the database

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username varchar(50) UNIQUE NOT NULL,
    email varchar(255) UNIQUE NOT NULL,
    password_hash varchar(255) NOT NULL,
    first_name varchar(100),
    last_name varchar(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_2fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    totp_secret TEXT,
    totp_auth_url TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE -- if the user is an admin. this flag is set manually by a user with permissions to the db
);

COMMENT ON COLUMN users.is_2fa_enabled IS 'Flag indicating if Time-based One-Time Password (TOTP) 2FA is enabled.';
COMMENT ON COLUMN users.totp_secret IS 'The secret key used for TOTP generation, shared with the user authenticator app.';
COMMENT ON COLUMN users.totp_auth_url IS 'The full otpauth:// URL containing the secret, issuer, and user info.';

-- products table
CREATE TABLE products(
    id SERIAL PRIMARY KEY,
    name varchar(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    sku varchar(100) UNIQUE,
    image_url varchar(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- addresses table

CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province_region VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    address_type VARCHAR(50) NOT NULL CHECK (address_type IN ('shipping', 'billing')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- orders table

CREATE TABLE orders(
    id SERIAL PRIMARY KEY, 
    user_id INTEGER NOT NULL REFERENCES users(id),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    status varchar(50) NOT NULL DEFAULT 'pending',
    shipping_address_id INTEGER REFERENCES addresses(id),
    billing_address_id INTEGER REFERENCES addresses(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payment_intent_id VARCHAR(255) UNIQUE
);


-- orders_items table (Junction for products and orders tables)

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT, -- restrict deletion if product is deleted to keep record of order
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_unit NUMERIC(10,2) NOT NULL CHECK (price_per_unit >= 0),
);

-- cart_items table

CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, 
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE (user_id, product_id)
);

-- categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,                 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- TODO: Revise these tables and start normalisation.
CREATE TABLE stock (
    stock_id SERIAL PRIMARY KEY,
    sku VARCHAR(100) REFERENCES products(sku) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE UPDATE
);


-- suppliers table
CREATE TABLE suppliers( 
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE UPDATE,
    name VARCHAR(255) NOT NULL UNIQUE,
    address TEXT NOT NULL UNIQUE,
    contact_number INTEGER NOT NULL UNIQUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- reviews
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id) -- Prevent multiple reviews from the same user for the same product
);

COMMENT ON COLUMN reviews.rating IS 'Rating on a scale from 1-5 stars';
COMMENT ON COLUMN reviews.comment IS 'The review text content';

-- warehouses
CREATE TABLE warehouses(
    id SERIAL PRIMARY KEY,
    address TEXT,
    product_category_stored VARCHAR(255) REFERENCES categories(name) ON DELETE CASCADE
);

-- vehicles
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    warehouse_assigned INT REFERENCES warehouses (id) ON CHANGE UPDATE,
    registration INTEGER NOT NULL,
    mileage BIGINT NOT NULL DEFAULT 20,
    date_serviced TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
)

-- End TODO


--- INDEXES ---

-- Index for faster lookup by user id
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);

-- Index on order_id for faster lookup of items in an order
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Index on product_id if you need to find orders containing a specific product
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Index on user_id for faster lookup of user's orders
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Index on status for filtering orders
CREATE INDEX idx_orders_status ON orders(status);

-- Indexes for reviews table
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

--- FUNCTIONS ---

-- Function and trigger to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON cart_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
