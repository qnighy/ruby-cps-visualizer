import type { NextConfig } from "next";
import path from "node:path";

const __dirname = new URL(".", import.meta.url).pathname;

const nextConfig: NextConfig = {
  webpack(config, options) {
    const { isServer } = options;

    // https://github.com/vercel/next.js/discussions/36981
    config.module.generator['asset/resource'] = config.module.generator['asset'];
    config.module.generator['asset/source'] = config.module.generator['asset'];
    delete config.module.generator['asset'];

    config.module.rules.unshift({
      resourceQuery: /inline/,
      type: "asset/inline",
    });
    config.resolve.alias ??= {};
    if (isServer) {
      config.resolve.alias["@ruby/prism$"] = path.join(__dirname, "./app/prism-node.ts");
    } else {
      config.resolve.alias["@ruby/prism$"] = path.join(__dirname, "./app/prism-browser.ts");
    }

    return config;
  },
};

export default nextConfig;
