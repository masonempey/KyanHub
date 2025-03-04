/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Add specific handling for CSS files
    const oneOfRule = config.module.rules.find(
      (rule) => typeof rule.oneOf === "object"
    );
    if (oneOfRule) {
      const cssModuleRules = oneOfRule.oneOf.filter(
        (rule) => rule.test && rule.test.toString().includes(".css")
      );

      cssModuleRules.forEach((rule) => {
        if (rule.use && Array.isArray(rule.use)) {
          rule.use.forEach((useItem) => {
            if (useItem.loader && useItem.loader.includes("css-loader")) {
              useItem.options = {
                ...useItem.options,
                importLoaders: 1,
              };
            }
          });
        }
      });
    }
    return config;
  },
};

module.exports = nextConfig;
