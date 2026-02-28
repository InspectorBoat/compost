// Load JSON at runtime
let fuse = null;
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
}

ensureLoaded().catch(e => console.error(e));

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
  if (results.length === 0) return { message: "Item not found.", matches: [] };

  const match = results[0].item;
  let category = "";
  if (match.is_compost)
    category = `Compost (${match.compost_type || "general"})`;
  else if ("is_recyclable" in match && match.is_recyclable)
    category = "Recyclable";
  else if ("is_recyclable" in match && !match.is_recyclable) category = "Trash";
  else category = "Unknown";

  return {
    message: category,
    matches: results
      .slice(0, 6)
      .map((r) => ({ item: r.item.item, score: r.score })),
  };
}

export function getLocation(userInput) {
    const location = locationFuse.search(userInput);
    if (results.length === 0) return "Location not found.";
    return location;
}

// console.log(findWasteCategory("banana peel"));
