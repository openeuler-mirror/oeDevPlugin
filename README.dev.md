# openeuler-vscode

## 介绍
**openeuler vscode extension**

boilerplate by: vscode-webview-vite-vue-boilerplate

modified: change naive-ui to element-plus

## 快速开始

1. 安装全局依赖: [@vscode/vsce](https://www.npmjs.com/package/@vscode/vsce)

```bash
npm install -g @vscode/vsce

# 不然后面的调用需要用 npx 命令这种去执行，看你们喜好了
# 工程内的本地打包命令会调用这个模块，所以需要全局安装，发布也依赖 vsce 提供的 cli 去做的

```

2. 安装工程依赖

```bash
# 该命令同时处理好整个工程开发所需要的依赖
npm run install:all
```

3. 运行工程

```bash
# 纯 Web开发，就是常规浏览器网页开发，有热更新
npm run dev:web


# VS Code 插件开发,可以 debug 和 渲染 Webview
# 代码会随时编译，若是进入debug 窗口后的改动，需要 reload webview 才能看到最新改动
# 第一次进入 debug ，默认就是代码编译后的最新的改动
npm run dev

```

4. 打包本地版本插件 vsix

```bash
# 本地打包并调用 vsce 模块打出一个本地插件，存放在根目录
# 类似：vscode-webview-vite-vue-boilerplate-0.0.1.vsix
npm run pack:vsix
```
## FAQ (from vscode-webview-vite-vue-boilerplate project)

### VSCode webview 对于资源的注入很严格

目前的策略是把 web 站点打包成一个index.js和 index.css去注入（必须转换成 vscode 允许的资源格式）

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

1. `meta`的 csp 策略进行了修改，允许加载部分资源，而不是默认各种卡死，对 web 开发友好
2. `index.html`的 `script` 和 `link` 标签的 `src` 和 `href` 都进行了转换，还有 hash 防缓存

### 如何打包所有文件到一个index.js 和 index.css

- css和js需要打包成单独文件

```typescript
// path: webview-ui/vite.config.ts

  build: {
    modulePreload: false, // 关闭预加载
    outDir: "build", // 打包输出目录
    emptyOutDir: true, // 打包之前清空build 文件夹
    assetsInlineLimit: 99999999999, // 默认是4096
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`, // 打包后的入口文件
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
        manualChunks: (id: string) => { // 打包后的静态资源,自定义策略，全部合并到 index
          return 'index'
        }
      },
    },
  },

```

- png这类静态图片直接打包成base64(参考上面的 `assetsInlineLimit`)

- svg 用 vite-svg-loader, 默认转换为 Component

```typescript
// path: webview-ui/vite.config.ts
svgLoader({ defaultImport: 'component' }),

// 在使用层面可以通过 query(?) 来转换 svg 为内联或者其他
// 具体可以去看这个插件的介绍，挺强大的

```

### 路由模式

因为内嵌 webview 不像浏览器有路由导航栏这些，一般 webview 没有前进后退的概念，这种我们的路由跳转优先采用内存路由（memory router）, 它非常适合需要完全控制历史堆栈的场景, 类似 Vue 或者 React 都有提供！！

- [Vue Memory-mode](https://router.vuejs.org/guide/essentials/history-mode#Memory-mode)
- [React Memory-mode](https://reactrouter.com/en/main/router-components/memory-router)

## 扩展指南

VS Code 官方扩展指南

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## 更多信息

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)
- [Webview ui toolkit started](https://github.com/microsoft/vscode-webview-ui-toolkit/blob/main/docs/getting-started.md)
- [loading-local-content](https://code.visualstudio.com/api/extension-guides/webview#loading-local-content)

**Enjoy!**
