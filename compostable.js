import  wasteDatabase  from "./wasteDatabase.json" assert { type: 'json' };
import Fuse from "fuse.js";

const fuse = new Fuse(wasteDatabase, {
  keys: ["item"],
  threshold: 0.3,
});

export function findWasteCategory(userInput) {
  const results = fuse.search(userInput);

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

console.log(findWasteCategory("banana peel"));
