// This script populates the 'products' table with sample data

const db = require('./db');

// Sample product data
const sampleProducts = [
    {
        name: 'Macbook Pro M4 2024',
        description: 'Apple 2024 MacBook Pro Laptop with M4 Pro chip with 12-core CPU and 16-core GPU: Built for Apple Intelligence, 14.2-inch Liquid Retina XDR Display, 24GB Unified Memory; 512GB SSD Storage; Space Black',
        price: 1499.99,
        stock_quantity: 50,
        sku : 'MACPROM4-001',
        image_url: 'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/mbp14-spaceblack-select-202410?wid=892&hei=820&fmt=jpeg&qlt=90&.v=YnlWZDdpMFo0bUpJZnBpZjhKM2M3VGhTSEZFNjlmT2xUUDNBTjljV1BxWjZkZE52THZKR1lubXJyYmRyWWlhOXZvdUZlR0V0VUdJSjBWaDVNVG95Yk15Y0c3T3Y4UWZwZExHUFdTUC9lN28', 
    },
    {
        name: 'MSI 27 inch Gaming Monitor',
        description: 'MSI G272QPF E2 27 Inch WQHD Gaming Monitor - 2560 x 1440 Rapid IPS Panel, 180 Hz / 1ms GtG, 125% sRGB colour gamut, Adaptive-Sync - DP 1.4a, HDMI 2.0b CEC',
        price: 158.97,
        stock_quantity: 75,
        sku: 'MSIG272-002',
        image_url: 'https://c.media-amazon.com/images/I/71lD7tAfGFL._AC_SX679_.jpg',
    },
    {
        name: 'ProtoArc Ergonomic Mouse',
        description: 'EM11 NL Ergonomic Mouse, Wireless Vertical Mini Mouse Rechargeable Optical Mice with Multi-Device (2*Bluetooth + USB Connection), 3 Adjustable DPI for Computer, iPad, Mac, Windows Black',
        price: 19.99,
        stock_quantity: 145,
        sku: 'PROTO-010',
        image_url: 'https://c.media-amazon.com/images/I/61PbkCnTG+L._AC_SY879_.jpg',
    },
    {
        name: 'RGB Mechanical Keyboard 65%',
        description: 'X79 65% Wireless Mechanical Keyboard/RGB Gaming Keyboard/Hot Swappable/Anti Ghosting/N-Key Rollover/UK Layout 69 Key/Wired Keyboard for Mac Windows',
        price: 39.99,
        stock_quantity: 92,
        sku: 'MECHX79-542',
        image_url: 'https://c.media-amazon.com/images/I/61kQRqSAYyL._AC_SX679_.jpg',
    },
];

// Async function to conduct seeding
async function seedDatabase() {
    console.log('Starting database seeding...');

    try {
        // Looping through each product
        // paramaterized queries used to avoid SQL injection!
        for(const product of sampleProducts) {
            const insertQuery = `
            INSERT INTO products (name, description, price, stock_quantity, sku, image_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
            `;

        // defining the values to be inserted matching the order of the query params
        const values = [
            product.name,
            product.description,
            product.price,
            product.stock_quantity,
            product.sku,
            product.image_url
        ];

        // executing query
        const result = await db.query(insertQuery, values);

        // logging insertions
        console.log(`Inserted product: ${product.name} with ID: ${result.rows[0].id}`);
        }

        console.log('Seeding completed successfully!');
    } catch (err) {
        console.error('Error during seeding: ', err.stack);
    }
}

seedDatabase();