module.exports = function resolveWeakLoader(source) {
  return source
    .replace(/require\.resolveWeak\([^)]*\)/g, "undefined")
    .replace(/require\((["']).+?\.css\1\)/g, "undefined");
};
