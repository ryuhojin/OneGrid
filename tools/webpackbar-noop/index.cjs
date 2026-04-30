class WebpackBarPlugin {
  constructor(options = {}) {
    this.options = options;
  }

  apply() {
    return undefined;
  }
}

module.exports = WebpackBarPlugin;
module.exports.default = WebpackBarPlugin;
