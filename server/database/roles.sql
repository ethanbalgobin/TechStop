-- ==================================
-- Role Creation
-- ==================================

-- Create the main application user role.
-- LOGIN: Allows this role to connect to the database.
-- NOINHERIT: Prevents inheriting privileges from roles it might be a member of (safer).
CREATE ROLE app_user WITH LOGIN PASSWORD 'fibrous-postcard-frosting-fuse' NOINHERIT;

-- Create a read-only user role.
-- LOGIN: Allows this role to connect.
CREATE ROLE readonly_user WITH LOGIN PASSWORD 'sofa-chap-meddler-warmly' NOINHERIT;

-- Create a group role to manage permissions more easily (Recommended)
-- This group won't log in itself but will hold the common permissions.
CREATE ROLE app_permissions NOLOGIN;

-- Add the application user to the permissions group
GRANT app_permissions TO app_user;

-- ==================================
-- Grant Schema Usage
-- ==================================

-- Grant usage on the schema to the permissions group and readonly user
-- This allows the roles to "see" objects within the schema.
GRANT USAGE ON SCHEMA public TO app_permissions;
GRANT USAGE ON SCHEMA public TO readonly_user;

-- ==================================
-- Grant Table Permissions
-- ==================================

--  standard CRUD operations for the application role (via the group)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO app_permissions;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE products TO app_permissions;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE orders TO app_permissions;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE order_items TO app_permissions;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE addresses TO app_permissions;


-- Grant ONLY SELECT permission for the read-only role
GRANT SELECT ON TABLE users TO readonly_user;
GRANT SELECT ON TABLE products TO readonly_user;
GRANT SELECT ON TABLE orders TO readonly_user;
GRANT SELECT ON TABLE order_items TO readonly_user;
GRANT SELECT ON TABLE addresses TO readonly_user;


-- ==================================
-- Grant Sequence Permissions (Important!)
-- ==================================
-- Roles that INSERT data need USAGE permission on the sequences used for SERIAL primary keys.

GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO app_permissions;
GRANT USAGE, SELECT ON SEQUENCE products_id_seq TO app_permissions;
GRANT USAGE, SELECT ON SEQUENCE orders_id_seq TO app_permissions;
GRANT USAGE, SELECT ON SEQUENCE order_items_id_seq TO app_permissions;
GRANT USAGE, SELECT ON SEQUENCE addresses_id_seq TO app_permissions;

-- ==================================
-- Default Privileges 
-- ==================================

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_permissions;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_permissions;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;

