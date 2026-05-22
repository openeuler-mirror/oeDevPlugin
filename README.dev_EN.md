# openeuler-vscode

## Overview

**openeuler vscode extension**

boilerplate by: vscode-webview-vite-vue-boilerplate

modified: change naive-ui to element-plus

## Quick Start

1. Install global dependencies: [@vscode/vsce](https://www.npmjs.com/package/@vscode/vsce).

    ```bash
    npm install -g @vscode/vsce

    # Alternatively, you can to run the `npx` command to execute the latter calls.
    # The local packaging command in the project calls this module. Therefore, you need to install it globally. The release also depends on the CLI provided by vsce.

    ```

2. Install project dependencies.

    ```bash
    # This command also handles the dependencies required for the entire project development.
    npm run install:all
    ```

3. Run the project.

    ```bash
    # Pure web development refers to the development of web pages in common browsers, with hot updates.
    npm run dev:web


    # VS Code plug-in development, which supports debugging and rendering of the WebView.
    # The code is compiled at any time. If you make changes after entering the debug window, you need to reload the WebView to see the latest changes.
    # When you enter the debug mode for the first time, the latest changes after code compilation are displayed by default.
    npm run dev

    ```

4. Pack the local plug-in VSIX.

    ```bash
    # Pack the local plug-in and call the vsce module to generate a local plug-in, which is stored in the `root` directory.
    # Example: vscode-webview-vite-vue-boilerplate-0.0.1.vsix
    npm run pack:vsix
    ```

## FAQ (from vscode-webview-vite-vue-boilerplate project)

### VS Code WebView is strict about resource injection

The current policy is to pack the web site into an `index.js` and `index.css` file for injection (the file must be converted into a resource format allowed by VS Code).

```typescript
//path: src/panels/VueBoilerplatePanel.ts
  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    // The CSS file from the Vue build output
    const stylesUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.css"]);
    // The JS file from the Vue build output
    const scriptUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.js"]);
    const nonce = getNonce();

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none';connect-src https:; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" crossorigin nonce="${nonce}" type="text/css" href="${stylesUri}">
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
          <title>Hello World</title>
        </head>
        <body>
          <div id="app"></div>
        </body>
      </html>
    `;
  }

```

1. The CSP policy of `meta` is modified to allow loading of some resources instead of default restriction, which is friendly to web development.
2. The `src` and `href` attributes of the `script` and `link` tags in `index.html` are converted, and hash anti-caching is implemented.

### How to Pack All Files Into `index.js` and `index.css`

- CSS and JS files need to be packed into separate files.

```typescript
// path: webview-ui/vite.config.ts

  build: {
    modulePreload: false, // Disable preloading.
    outDir: "build", // Output directory of the packaged files.
    emptyOutDir: true, // Clear the `build` folder before packaging.
    assetsInlineLimit: 99999999999, // Default value is `4096`.
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`, // Entry file after packaging.
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
        manualChunks: (id: string) => { // Static resources after packaging. Customized policies are merged into the `index` file.
          return 'index'
        }
      },
    },
  },

```

- Static images such as PNG images are directly packaged into the Base64 format (refer to the preceding `assetsInlineLimit`).

- Use vite-svg-loader for SVGs, which are converted to components by default.

```typescript
// path: webview-ui/vite.config.ts
svgLoader({ defaultImport: 'component' }),

// You can use query(?) to convert SVGs into inline or other formats.
// For details, see the plugin introduction. It's quite powerful.

```

### Routing Mode

Unlike browsers, embedded WebViews do not have a navigation bar, nor do they have the concept of forward or backward navigation generally. In this case, we preferentially use the memory router for route redirection. It is ideal for scenarios where full control over the history stack is required. It is provided by Vue or React.

- [Vue Memory-mode](https://router.vuejs.org/guide/essentials/history-mode#Memory-mode)
- [React Memory-mode](https://reactrouter.com/en/main/router-components/memory-router)

## Extension Guide

VS Code official extension guide

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## More info

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)
- [Webview ui toolkit started](https://github.com/microsoft/vscode-webview-ui-toolkit/blob/main/docs/getting-started.md)
- [loading-local-content](https://code.visualstudio.com/api/extension-guides/webview#loading-local-content)

**Enjoy!**
