CREATE TABLE IF NOT EXISTS properties (
    property_uid VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    price DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    property_uid VARCHAR(255) REFERENCES properties(property_uid) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    UNIQUE (property_uid, product_id, month)
);

CREATE TABLE IF NOT EXISTS guests (
    guest_uid VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    platform_type VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
    booking_code VARCHAR(255) PRIMARY KEY,
    guest_uid VARCHAR(255) NOT NULL,
    property_uid VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    total_nights INT NOT NULL,
    nightly_rate DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    base_total DECIMAL(10, 2) NOT NULL,
    cleaning_fee DECIMAL(10, 2) NOT NULL,
    cleaning_fee_month DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (guest_uid) REFERENCES guests(guest_uid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nights_by_month (
    booking_code VARCHAR(255) NOT NULL,
    month VARCHAR(10) NOT NULL,
    nights INT NOT NULL,
    PRIMARY KEY (booking_code, month),
    FOREIGN KEY (booking_code) REFERENCES bookings(booking_code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS revenue_by_month (
    booking_code VARCHAR(255) NOT NULL,
    month VARCHAR(10) NOT NULL,
    revenue DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (booking_code, month),
    FOREIGN KEY (booking_code) REFERENCES bookings(booking_code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS maintenance (
    id SERIAL PRIMARY KEY,
    property_uid VARCHAR(255) REFERENCES properties(property_uid) ON DELETE CASCADE,
    category VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    description VARCHAR(255),
    date DATE NOT NULL
);
