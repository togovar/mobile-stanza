export const sortBy = (array, fn) => array.sort((a, b) => {
  return (fn(a) || Number.MAX_SAFE_INTEGER) - (fn(b) || Number.MAX_SAFE_INTEGER);
});
