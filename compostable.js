// Load JSON at runtime
let fuse = null;
let database = null;

async function ensureLoaded() {
  if (fuse && database) return;
  const resp = await fetch('./wasteDatabase.json');
  database = await resp.json();
  fuse = new Fuse(database, { keys: ['item'], threshold: 0.3 });
}

ensureLoaded().catch(e => console.error(e));

export function findWasteCategoryByLocation(location, userInput) {
  if (!fuse) {
    ensureLoaded();
    return 'Loading database — please try again in a moment.';
  }

  const results = fuse.search(userInput);
  if (results.length === 0) return 'Item not found.';

  const match = results.find(m => m.state == location);
  if (match.is_compost) return `Compost (${match.compost_type})`;
  if (match.is_recyclable) return 'Recyclable';
  return 'Trash';
}

export function getLocation(userInput) {
    const location = locationFuse.search(userInput);
    if (results.length === 0) return "Location not found.";
    return location;
}

console.log(findWasteCategory("banana peel"));