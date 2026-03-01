import { classifyWaste } from './gemini.js';

// Load Fuse either from a global script tag (index.html includes CDN) or dynamically
// import the ESM bundle from a CDN when running in the browser as a module.
let Fuse;
if (typeof window !== 'undefined' && window.Fuse) {
  Fuse = window.Fuse;
} else {
  const mod = await import('https://cdn.jsdelivr.net/npm/fuse.js/dist/fuse.esm.min.js');
  Fuse = mod.default || mod.Fuse;
}

// Load JSON at runtime
let fuse = null;
let locationFuse = null;
let database = null;

async function ensureLoaded() {
  if (fuse && database) return;
  const resp = await fetch("./wasteDatabase.json");
  database = await resp.json();
  const options = {
    keys: ["item", "aliases"],
    includeScore: true,
    shouldSort: true,
    threshold: 0.35,
    ignoreLocation: true,
    useExtendedSearch: true,
    isCaseSensitive: false,
  };
  fuse = new Fuse(database, options);
  // Build a simple location fuse if entries have a `location` field.
  try {
    const locItems = database.map((d) => ({ location: d.location || '' }));
    locationFuse = new Fuse(locItems, { keys: ['location'], threshold: 0.4 });
  } catch (e) {
    locationFuse = new Fuse([], { keys: ['location'] });
  }
}

ensureLoaded().catch((e) => console.error(e));

export async function findSuggestions(partialItem) {
  await ensureLoaded();
  if (!partialItem) return null;
  // fuzzy search and return top matches
  return fuse.search(partialItem);
}

export async function findWasteCategory(userInput, location) {
  await ensureLoaded();
  if (!userInput) return { message: "Please enter an item." };

  // fuzzy search and return top matches
  const results = fuse.search(userInput);
  if (results.length === 0) {
    console.log('[compostable] No DB matches for', userInput, '- falling back to /api/classify');
    try {
      const raw = await classifyWaste(userInput, location);
      const norm = (raw || '').trim();
      let fbCategory = 'Unknown';
      if (/compost/i.test(norm)) fbCategory = 'Compost';
      else if (/recycl/i.test(norm)) fbCategory = 'Recyclable';
      else if (/trash|landfill|residual/i.test(norm)) fbCategory = 'Trash';
      return { message: fbCategory, matches: [] };
    } catch (e) {
      console.error('[compostable] classifyWaste fallback error', e);
      return { message: 'Item not found.', matches: [] };
    }
  }

  const match = results[0].item;
  let category = "";
  if (match.is_compost)
    category = `Compost (${match.compost_type || "general"})`;
  else if ("is_recyclable" in match && match.is_recyclable)
    category = "Recyclable";
  else if ("is_recyclable" in match && !match.is_recyclable) category = "Trash";
  else category = "Unknown";
  // If unknown, fallback to Gemini
  if (category === "Unknown") {
    console.log('[compostable] No DB category for', userInput, '— calling /api/classify fallback');
    try {
      console.log('[compostable] calling classifyWaste for:', userInput, 'location:', location);
      const raw = await classifyWaste(userInput, location);
      const norm = (raw || '').trim();
      if (/compost/i.test(norm)) category = 'Compost';
      else if (/recycl/i.test(norm)) category = 'Recyclable';
      else if (/trash/i.test(norm)) category = 'Trash';
      else category = 'Unknown';
    } catch (e) {
      console.error("Error classifying waste with Gemini:", e);
      category = "Unknown";
    }
  }

  return {
    message: category,
    matches: results.slice(0, 6).map((r) => ({ item: r.item.item, score: r.score })),
  };
}

export async function getLocation(userInput) {
  await ensureLoaded();
  if (!locationFuse) return 'Location not found.';
  const results = locationFuse.search(userInput || '');
  if (!results || results.length === 0) return 'Location not found.';
  return results[0].item.location || 'Location not found.';
}

// console.log(findWasteCategory("banana peel"));
