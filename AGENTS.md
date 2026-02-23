# AGENTS.md - Koodo Reader Development Guide

This guide is for AI coding agents working on the Koodo Reader codebase.

## Project Overview

**Koodo Reader** is a cross-platform ebook reader built with:
- **Electron** (desktop) + **React** (web)
- **TypeScript** for type safety
- **Redux** for state management
- **React Router** for routing
- **Webpack** for bundling
- **create-react-app** as the build foundation

Supported formats: EPUB, PDF, MOBI, AZW3, TXT, FB2, DOCX, MD, HTML, Comic formats (CBZ, CBR, CBT, CB7)

## Build & Development Commands

### Install Dependencies
```bash
yarn install
# or
npm install
```

### Development
```bash
# Web mode (React dev server on port 3000)
yarn start

# Desktop mode (Electron + React hot reload)
yarn dev

# Run Electron standalone (requires pre-built React app)
yarn ele
```

### Building
```bash
# Build React app for production
yarn build

# Create Electron installer/package (完整安装包，需要 Visual Studio Build Tools)
yarn release

# Pre-build (runs before release automatically)
yarn prerelease
```

### 便携版打包（推荐方式）

由于 Windows 环境下 `yarn release` 可能遇到以下问题：
- Visual Studio Build Tools 版本不兼容
- winCodeSign 工具的符号链接权限问题
- better-sqlite3 原生模块编译失败

**推荐使用以下命令生成便携版 ZIP 包：**

```bash
# 1. 清理旧构建
rm -rf build dist

# 2. 构建 React 应用
yarn build

# 3. 生成 ZIP 便携版（自动跳过代码签名）
npx --no-install electron-builder --win zip --x64

# 4. 手动创建额外的便携版 ZIP（可选）
cd dist
7z a -tzip "Koodo Reader-$(node -p "require('../package.json').version")-x64-Portable.zip" "./win-unpacked/*" -mx=5
cd ..
```

**输出文件：**
- `dist/Koodo Reader-{version}-x64-Win.zip` - electron-builder 生成的官方 ZIP 包
- `dist/Koodo Reader-{version}-x64-Portable.zip` - 手动创建的便携版（可选）
- `dist/win-unpacked/` - 未压缩的应用程序目录（可直接运行）

**使用方式：**
```bash
# 解压并运行
unzip "Koodo Reader-{version}-x64-Win.zip"
cd "Koodo Reader-{version}-x64-Win"
"Koodo Reader.exe"

# 或直接运行未打包版本
"dist/win-unpacked/Koodo Reader.exe"
```

**注意事项：**
1. `package.json` 中已配置 `"signAndEditExecutable": false` 来禁用 Windows 代码签名
2. better-sqlite3 原生模块会在打包时自动使用预编译的二进制文件
3. 如遇到网络问题，electron-builder 会自动重试下载依赖
4. ZIP 便携版无需安装，解压即可使用，适合开发测试和分发

### Testing
```bash
# Run tests with react-scripts (Jest)
yarn test

# Run all tests
yarn test

# Run specific test file
yarn test <filename>

# Run tests in watch mode (interactive)
yarn test --watchAll=false

# Run tests with coverage
yarn test --coverage
```

### Analysis
```bash
# Analyze bundle size
yarn analyze
```

### Maintenance
```bash
# Rebuild native dependencies (better-sqlite3)
yarn rebuild
```

## TypeScript Configuration

- **Target**: ES5
- **JSX**: React
- **Strict mode**: Enabled
- **noImplicitAny**: **Disabled** (project allows implicit any)
- Module resolution: Node
- See `tsconfig.json` for full configuration

## Code Style Guidelines

### Formatting (Prettier)
- **Semi-colons**: Required (`;`)
- **Quotes**: Double quotes (`"`)
- **Tab width**: 2 spaces
- **Max line length**: 80 characters
- **Trailing commas**: ES5 style
- **Arrow function parentheses**: Always
- **Line endings**: LF

### Linting (ESLint)
- Base: `react-app` config
- **Enforced rules**:
  - `no-unused-vars`: Error (level 2)
  - `no-unused-expressions`: Off
  - `@typescript-eslint/ban-types`: Off

### Import Statements
Follow this order:
1. External React/library imports
2. CSS imports (co-located with component)
3. Interface/type imports (from local `./interface`)
4. Component imports
5. Utility imports
6. Model imports
7. Asset/constant imports

**Example:**
```tsx
import React from "react";
import "./bookCardItem.css";
import { BookCardProps, BookCardState } from "./interface";
import ActionDialog from "../dialogs/actionDialog";
import { withRouter } from "react-router-dom";
import { isElectron } from "react-device-detect";
import EmptyCover from "../emptyCover";
import BookUtil from "../../utils/file/bookUtil";
import CoverUtil from "../../utils/file/coverUtil";
import { ConfigService } from "../../assets/lib/kookit-extra-browser.min";
```

### File Naming Conventions
- **Components**: camelCase directories with `component.tsx`, `interface.tsx`, `index.tsx`
  - Example: `src/components/bookCardItem/component.tsx`
- **Models**: PascalCase (e.g., `Book.ts`, `Note.ts`)
- **Utilities**: camelCase (e.g., `bookUtil.ts`, `common.ts`)
- **CSS**: Matches component name (e.g., `bookCardItem.css`)

### Component Structure
Every component follows this pattern:
```
componentName/
├── component.tsx    # Component implementation (class or functional)
├── interface.tsx    # Props and State interfaces
├── index.tsx        # Export with Redux/Router HOCs
└── componentName.css
```

### TypeScript Patterns

#### Classes vs Interfaces
- **Classes** for data models (e.g., `Book`, `Note`, `Bookmark`)
- **Interfaces** for React props/state and function parameters

#### Type Annotations
```typescript
// Models use classes with explicit constructors
class Book {
  key: string;
  name: string;
  author: string;
  // ... constructor with all fields
}

// Component props/state use interfaces
interface BookCardProps {
  book: Book;
  mode: string;
  // ...
}

interface BookCardState {
  isFavorite: boolean;
  cover: string;
  // ...
}
```

#### Any Usage
- **Allowed** but prefer specific types when possible
- Common use: `declare var window: any;` for Electron IPC

### React Patterns

#### Class Components
- Primary pattern in this codebase
- Lifecycle methods: `componentDidMount`, `componentWillReceiveProps`, etc.
- State updates: Always use `setState()`

```typescript
class BookCardItem extends React.Component<BookCardProps, BookCardState> {
  constructor(props: BookCardProps) {
    super(props);
    this.state = { /* initial state */ };
  }

  async componentDidMount() {
    // Async operations with setState
    this.setState({
      cover: await CoverUtil.getCover(this.props.book),
    });
  }
}
```

#### Redux Connection
- Use `connect()` from `react-redux`
- HOC pattern: `export default connect(mapStateToProps, mapDispatchToProps)(Component)`

#### Router Integration
- Use `withRouter()` from `react-router-dom`
- Chain HOCs: `export default withRouter(connect(...)(Component))`

### Error Handling
- **Async/await** preferred over Promise chains
- Try-catch for error-prone operations
- Toast notifications via `react-hot-toast`
```typescript
import toast from "react-hot-toast";
import i18n from "../i18n";

try {
  // operation
} catch (error) {
  toast.error(i18n.t("Error message"));
}
```

### Naming Conventions
- **Variables/Functions**: camelCase (`bookUtil`, `getCover`)
- **Classes/Components**: PascalCase (`BookCardItem`, `Book`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Interfaces**: PascalCase with descriptive suffix (`BookCardProps`, `BookCardState`)
- **Files**: Match content - camelCase for utils, PascalCase for models

### State Management (Redux)
- **Actions**: `src/store/actions/`
- **Reducers**: `src/store/reducers/`
- Action naming: `handleActionName`
- Reducer file: Same name as domain (e.g., `book.tsx`, `reader.tsx`)

### CSS Organization
- **Co-located**: Each component has its own CSS file
- **Class naming**: BEM-style or descriptive kebab-case
- **Global styles**: `src/assets/styles/`
  - `reset.css` - CSS reset
  - `global.css` - Global utilities
  - `style.css` - Main styles

### Electron-Specific Code
```typescript
import { isElectron } from "react-device-detect";

if (isElectron) {
  const { ipcRenderer } = window.require("electron");
  // Electron API calls
}
```

### Window Declaration
For Electron APIs and third-party libraries:
```typescript
declare var window: any;
```

## Project Structure
```
koodo-reader/
├── src/
│   ├── assets/         # Static assets, locales, styles
│   ├── components/     # Reusable UI components
│   ├── containers/     # Smart components with logic
│   ├── constants/      # App constants
│   ├── models/         # Data models (Book, Note, etc.)
│   ├── pages/          # Route pages (Manager, Reader)
│   ├── router/         # React Router config
│   ├── store/          # Redux store, actions, reducers
│   ├── utils/          # Utility functions
│   ├── i18n.tsx        # i18next configuration
│   └── index.tsx       # Entry point
├── public/             # Static public assets
├── main.js             # Electron main process
├── httpServer.js       # Local HTTP server for web mode
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript config
├── webpack.config.js   # Webpack for Electron main
└── .prettierrc         # Prettier config
```

## Important Notes

1. **Do NOT** modify `package.json` scripts without understanding the full build pipeline
2. **Always** run `yarn rebuild` after updating native dependencies
3. **Match existing patterns** - this is a mature codebase with established conventions
4. **Test both web and desktop modes** when making UI changes
5. **Respect i18n** - all user-facing strings must use `i18n.t()`
6. **Async operations** in `componentDidMount` should use `setState()` after completion
7. **Electron IPC** calls require `isElectron` check
8. **Never** suppress TypeScript errors with `@ts-ignore` unless absolutely necessary
9. **Redux state changes** must go through actions/reducers
10. **CSS** should be scoped to components, avoid global style pollution

## Common Gotchas

- **Native modules**: better-sqlite3 requires rebuild after install
- **File paths**: Electron uses different path resolution than web
- **Environment detection**: Always check `isElectron` before using Electron APIs
- **State updates**: Multiple `setState` calls may batch - use callbacks if order matters
- **CSS imports**: Must be imported in component files, not just referenced
