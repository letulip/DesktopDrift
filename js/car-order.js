// Display order for the garage carousel: owned (incl. free) cars first, then the rest, each group
// kept in registry order. Returns a permutation of CARS *indices* — the carousel keeps the real
// index as identity (selection/records/looks are index-keyed) and only reorders the visual layout.
// Pure — unit-tested in tests/car-order.test.js.
export const ownedFirstOrder = (cars, isOwned) => {
  const idx = cars.map((_, i) => i);
  return [...idx.filter((i) => isOwned(cars[i])), ...idx.filter((i) => !isOwned(cars[i]))];
};
