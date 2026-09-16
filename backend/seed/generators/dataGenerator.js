import seedrandom from 'seedrandom';

export const createDataGenerator = (seed = 'visionpulse-fixed-seed-2026') => {
  const rng = seedrandom(seed);

  const randomInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
  const randomItem = (arr) => arr[Math.floor(rng() * arr.length)];
  const randomChoice = (prob) => rng() < prob;

  const getCustomers = () => [
    { customerCode: 'CUST-001', name: 'Al-Madina Traders', email: 'contact@almadina.pk', phone: '+92-300-1112233', region: 'Punjab', customerType: 'Wholesale' },
    { customerCode: 'CUST-002', name: 'Khyber Retailers', email: 'orders@khyber.pk', phone: '+92-333-2223344', region: 'KPK', customerType: 'Retail' },
    { customerCode: 'CUST-003', name: 'Indus Dynamics Corp', email: 'procurement@indus.com', phone: '+92-321-3334455', region: 'Sindh', customerType: 'Corporate' },
    { customerCode: 'CUST-004', name: 'Bolan Supplies', email: 'info@bolan.pk', phone: '+92-345-4445566', region: 'Balochistan', customerType: 'Wholesale' },
    { customerCode: 'CUST-005', name: 'Margalla Enterprises', email: 'sales@margalla.pk', phone: '+92-301-5556677', region: 'Federal', customerType: 'Corporate' },
    { customerCode: 'CUST-006', name: 'Lahore Smart Store', email: 'admin@lahorestore.pk', phone: '+92-322-6667788', region: 'Punjab', customerType: 'Retail' },
    { customerCode: 'CUST-007', name: 'Karachi Wholesale Hub', email: 'ops@kwhub.pk', phone: '+92-313-7778899', region: 'Sindh', customerType: 'Wholesale' },
    { customerCode: 'CUST-008', name: 'Peshawar Tech Link', email: 'support@techlink.pk', phone: '+92-334-8889900', region: 'KPK', customerType: 'Retail' }
  ];

  const getProducts = () => [
    { productCode: 'PRD-101', name: 'Industrial Solar Inverter 5KW', category: 'Electronics', unitCost: 12000000, unitPrice: 16500000, reorderThreshold: 5, initialStock: 18 },
    { productCode: 'PRD-102', name: 'Lithium Battery Pack 48V', category: 'Electronics', unitCost: 20000000, unitPrice: 28000000, reorderThreshold: 4, initialStock: 12 },
    { productCode: 'PRD-103', name: 'Commercial LED Panel 60W', category: 'Electronics', unitCost: 180000, unitPrice: 290000, reorderThreshold: 20, initialStock: 80 },
    { productCode: 'PRD-104', name: 'Cotton Twill Work Uniforms (Pack of 10)', category: 'Apparel', unitCost: 850000, unitPrice: 1400000, reorderThreshold: 15, initialStock: 45 },
    { productCode: 'PRD-105', name: 'Safety Steel-Toe Boots Pro', category: 'Apparel', unitCost: 350000, unitPrice: 580000, reorderThreshold: 10, initialStock: 25 },
    { productCode: 'PRD-106', name: 'Heavy Duty Hydraulic Jack 10T', category: 'Industrial', unitCost: 1500000, unitPrice: 2400000, reorderThreshold: 6, initialStock: 15 },
    { productCode: 'PRD-107', name: 'Precision Digital Caliper', category: 'Industrial', unitCost: 250000, unitPrice: 420000, reorderThreshold: 8, initialStock: 30 },
    { productCode: 'PRD-108', name: 'Ergonomic Mesh Office Chair', category: 'Office Supplies', unitCost: 1100000, unitPrice: 1850000, reorderThreshold: 5, initialStock: 2 }, // Low Stock Edge Case
    { productCode: 'PRD-109', name: 'Wireless Barcode Scanner 2D', category: 'Office Supplies', unitCost: 450000, unitPrice: 750000, reorderThreshold: 10, initialStock: 0 }, // Out of Stock Edge Case
    { productCode: 'PRD-110', name: 'Organic Export Grade Basmati (50kg)', category: 'Groceries', unitCost: 900000, unitPrice: 1350000, reorderThreshold: 10, initialStock: 50 },
    { productCode: 'PRD-111', name: 'Premium Green Cardamom (1kg)', category: 'Groceries', unitCost: 650000, unitPrice: 980000, reorderThreshold: 5, initialStock: 20 },
    { productCode: 'PRD-112', name: 'Legacy Prototype Sensor (Zero Sales)', category: 'Industrial', unitCost: 5000000, unitPrice: 8000000, reorderThreshold: 2, initialStock: 5 } // Zero Sales Edge Case
  ];

  return {
    rng,
    randomInt,
    randomItem,
    randomChoice,
    getCustomers,
    getProducts
  };
};
