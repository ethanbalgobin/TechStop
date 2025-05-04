-- This defines all tables in the database

-- Users table
    -- Purpose: Stores customer information for registration, login, and associating orders.

CREATE TABLE users (
    id SERIAL PRIMARY KEY, -- serial auto increments this value
    username varchar(50) UNIQUE NOT NULL,
    email varchar(255) UNIQUE NOT NULL,
    password_hash varchar(255) NOT NULL, -- stores the hashed password and never plain text
    first_name varchar(100),
    last_name varchar(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- when the user account was made
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- when the user account was last updated
);

-- products table
    -- Purpose: Stores details about the items you are selling.
CREATE TABLE productS(
    id SERIAL PRIMARY KEY,
    name varchar(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    sku varchar(100) UNIQUE,
    image_url varchar(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- when the product was added
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- when the product was last updated
);

-- addresses table
    -- Purpose: Stores the shipping and bullign addresses associated with users

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
    -- Purpose: Stores information about purchases made by users

CREATE TABLE orders(
    id SERIAL PRIMARY KEY, -- unique order id
    user_id INTEGER NOT NULL REFERENCES users(id),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    status varchar(50) NOT NULL DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
    shipping_address_id INTEGER REFERENCES addresses(id),
    billing_address_id INTEGER REFERENCES addresses(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- orders_items
    -- Purpose: A junction table to link the orders and prodcuts tablesm representing the items in each order.
    -- This resolves the many-to-many relationship between the two tables

CREATE TABLE orders_items(
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES prodcuts(id) ON DELETE RESTRICT, -- cannot delete product in parent table if it is part of an order
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_unit NUMERIC(10, 2) NOT NULL -- the price of the item at the time that the order was placed as pricing can be dynamic
);




