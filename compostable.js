import wasteDatabase from "./wasteDatabase.json" with { type: 'json' };
import locationDatabase from "./locationDatabase.json" with { type: 'json' };
import Fuse from "fuse.js";

const wasteFuse = new Fuse(wasteDatabase, {
  keys: ["item"],
  threshold: 0.3,
});

const locationFuse = new Fuse(locationDatabase, {
  keys: ["location"],
  threshold: 0.3,
});

export function findWasteCategory(userInput) {
  const results = wasteFuse.search(userInput);

  if (results.length === 0) {
    return "Item not found.";
  }

  const match = results[0].item;

  if (match.is_compost) {
    return `Compost (${match.compost_type})`;
  }

  if (match.is_recyclable) {
    return "Recyclable";
  }

  return "Trash";
}

export function getLocation(userInput) {
    const location = locationFuse.search(userInput);
    if (results.length === 0) return "Location not found.";
    return location;
}

console.log(findWasteCategory("banana peel"));
