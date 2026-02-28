const green_list = [];
const brown_list = [];

const search_greens = new Fuse(green_list);
const search_browns = new Fuse(brown_list);

function fuzzySearchResults(query) {
    return search_greens.search(query).push(...search_greens.search(query));
}

function isCompostable(thing) {
    return green_list.indexOf(thing) != -1 || brown_list.indexOf(thing) != -1;
}

function getType(thing) {
    if (green_list.indexOf(thing) != -1) return "green";
    else if (brown_list.indexOf(thing) != -1) return "brown";
    throw new Error("Bad!");
}

console.log(getType("foo"));