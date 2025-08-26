module.exports = function(api) {
  api.cache(true);
  const isProduction = process.env.NODE_ENV === 'production';
  const plugins = [];
  if (isProduction) {
    plugins.push("transform-remove-console");
  }
  return {
    presets: ['babel-preset-expo'],
    plugins: plugins
  };
};