const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');

const dbPath = process.argv[2];
const n = parseInt(process.argv[3], 10);
if (!dbPath || !n) {
  console.error('usage: node seed.js <dbPath> <count>');
  process.exit(1);
}

const categories = ['accessories', 'bags', 'outerwear', 'dresses', 'tops', 'bottoms', 'footwear', 'other'];
const colors = ['red', 'pink', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'white', 'grey', 'beige', 'brown', 'gold', 'silver', 'pattern', 'other'];
const adjectives = ['Blue', 'Vintage', 'Cotton', 'Linen', 'Striped', 'Oversized', 'Slim-fit', 'Wool', 'Denim', 'Floral', 'Plaid', 'Cropped'];
const nouns = ['Sweater', 'Jeans', 'Jacket', 'T-Shirt', 'Dress', 'Skirt', 'Sneakers', 'Boots', 'Scarf', 'Hat', 'Coat', 'Shorts'];

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const insertGarment = db.prepare(`
  INSERT INTO garment (shareable_id, flagged, banned, name, category, color, brand, size, notes, photo_id, owner_id, date_aquired, washing_details, archived)
  VALUES (@shareableId, 0, 0, @name, @category, @color, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0)
`);

const insertMany = db.transaction((count) => {
  for (let i = 1; i <= count; i++) {
    const adj = adjectives[i % adjectives.length];
    const noun = nouns[i % nouns.length];
    insertGarment.run({
      shareableId: randomUUID(),
      name: `${adj} ${noun} #${i}`,
      category: categories[i % categories.length],
      color: colors[i % colors.length],
    });
  }
});

insertMany(n);

// Seed a few drawers to exercise the drawers UX at the same scale.
const insertDrawer = db.prepare(`INSERT INTO drawer (name, notes, owner_id) VALUES (?, ?, NULL)`);
const insertDrawerGarment = db.prepare(`INSERT INTO drawer_garments (drawer_id, garment_id) VALUES (?, ?)`);
const allIds = db.prepare('SELECT id FROM garment').all().map((r) => r.id);

if (allIds.length > 0) {
  // One small drawer (~5 items, or fewer if the catalog is tiny)
  const smallId = insertDrawer.run('Winter Coats', 'Cold weather outerwear').lastInsertRowid;
  allIds.slice(0, Math.min(5, allIds.length)).forEach((gid) => insertDrawerGarment.run(smallId, gid));

  // One drawer sized ~10% of the catalog (capped) to see how a "big" drawer renders
  const bigCount = Math.min(Math.max(Math.floor(allIds.length * 0.1), 1), 200);
  const bigId = insertDrawer.run('Everything Casual', 'A deliberately large drawer to stress-test the UI').lastInsertRowid;
  allIds.slice(0, bigCount).forEach((gid) => insertDrawerGarment.run(bigId, gid));
}

db.pragma('wal_checkpoint(TRUNCATE)');
console.log(`Seeded ${n} garments and drawers into ${dbPath}`);
