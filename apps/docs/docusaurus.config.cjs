const config = {
  title: "OneGrid",
  tagline: "Enterprise-grade frontend data grid",
  url: "https://onegrid.local",
  baseUrl: "/",
  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn"
    }
  },
  favicon: "img/favicon.ico",
  organizationName: "onegrid",
  projectName: "onegrid",
  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: require.resolve("./sidebars.cjs")
        },
        blog: false,
        theme: {
          customCss: require.resolve("./src/css/custom.css")
        }
      }
    ]
  ],
  plugins: [
    function onegridRegistryParserPlugin() {
      return {
        name: "onegrid-registry-parser-plugin",
        configureWebpack() {
          return {
            module: {
              rules: [
                {
                  test: /([\\/]\.docusaurus[\\/](registry|client-modules)\.js|[\\/]@docusaurus[\\/]core[\\/]lib[\\/]client[\\/]exports[\\/]ComponentCreator\.js)$/,
                  enforce: "pre",
                  type: "javascript/auto",
                  use: [require.resolve("./loaders/resolveWeakLoader.cjs")]
                }
              ]
            }
          };
        }
      };
    }
  ],
  themeConfig: {
    navbar: {
      title: "OneGrid",
      items: [{ type: "docSidebar", sidebarId: "mainSidebar", label: "Docs", position: "left" }]
    }
  }
};

module.exports = config;
