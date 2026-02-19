# Agent Skills 项目说明

## 项目概览

- **项目名称**: Agent Skills
- **目标与范围**: 收集和定义 AI Agent 技能（Skill），以 Markdown 格式存储在 `skills/` 目录中，供 AI Agent 系统加载和使用。
- **技术栈**: TypeScript (Node.js ES Modules), `tsx` 运行时

## 常用命令

- **依赖安装**: `npm install`
- **运行脚本**: `npx tsx <filename.ts>` (例如：`npx tsx try1.ts`)
- **类型检查**: `npx tsc --noEmit`
- **测试**: `npm test` (当前指向 `npx tsx index.ts`，可能不存在)

## 目录结构

| 目录/文件 | 用途 |
|-----------|------|
| `skills/` | 技能定义目录，每个技能子目录包含 `SKILL.md` |
| `skills/<skill-name>/SKILL.md` | 技能定义文件，包含 YAML frontmatter 和详细说明 |
| `try*.ts` | 独立的测试/示例脚本 |
| `temp/` | 临时文件目录 |
| `.roo/`, `.trae/` | AI Agent 配置目录 |
| `package.json` | 项目配置和依赖 |
| `tsconfig.json` | TypeScript 配置 |

## 技能定义格式 (SKILL.md)

每个技能文件遵循以下结构：

```yaml
---
name: "skill-name-kebab-case"
description: "技能的简短描述"
---
```

### 技能内容结构

- `# 标题` - 技能名称
- `## 目的/Overview` - 技能用途说明
- `## 何时使用/When to Use` - 适用场景
- `## 实现示例/Implementation Examples` - TypeScript/代码示例
- `## 最佳实践/Best Practices` - DO/DON'T 指南
- `## 指令/Instructions` - 具体操作指南

### 现有技能列表

| 技能名称 | 描述 |
|----------|------|
| `extract-business-entity` | 从文档中提取业务实体，支持 DDD 建模 |
| `technical-debt-assessment` | 评估和量化技术债务 |
| `stakeholder-communication` | 管理利益相关者沟通和期望 |

## 架构与关键流程

- **主要模块**: 
  - `skills/` - 技能定义
  - 测试脚本 (`try*.ts`) - 验证和示例
- **关键流程**: 
  1. 定义技能于 `skills/<name>/SKILL.md`
  2. 使用 `tsx` 运行验证脚本
  3. Agent 系统加载技能文件

## 代码规范

### TypeScript 配置
- **Target**: `ESNext`
- **Module**: `NodeNext` (ES Modules)
- **Strict Mode**: 启用
- **Top-level await**: 支持

### 导入规范
```typescript
// ✅ 推荐
import { CopilotClient } from "@github/copilot-sdk";
import { SomeType } from "./types.js";

// ❌ 避免
import * as utils from "./utils";
```

### 命名约定
- **文件**: `kebab-case` (如 `my-script.ts`, `skill-definition.md`)
- **类/接口**: `PascalCase` (如 `TechnicalDebtAssessment`)
- **变量/函数**: `camelCase` (如 `calculatePriority`)
- **常量**: `UPPER_SNAKE_CASE`

### 格式化
- **缩进**: 2 空格
- **分号**: 必须使用
- **引号**: 双引号 `"`
- **尾随逗号**: ES5 兼容

### 错误处理
```typescript
try {
  await someAsyncOperation();
} catch (error) {
  console.error("Error message:", error);
  process.exit(1);
}
```

## 测试说明

- **测试位置**: 项目根目录的 `try*.ts` 文件或新建 `<name>.test.ts`
- **运行方式**: `npx tsx <test-file.ts>`
- **覆盖范围**: 当前为 POC 项目，无正式测试套件

## 依赖项

```json
{
  "dependencies": {
    "@github/copilot-sdk": "^0.1.22"
  },
  "devDependencies": {
    "@types/node": "^25.2.1",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3"
  }
}
```

## 注意事项

1. **不要修改 `package.json`** 未经用户明确许可
2. **使用绝对路径** 当使用文件工具时
3. **不要提交敏感信息** (API keys, secrets)
4. **当前为 POC 项目** - 测试脚本可能不完整
5. **工作目录**: `D:\temp\agent-skills`
6. **平台**: Windows (`win32`)

## 相关资源

项目 README 中列出的相关技能仓库：
- https://github.com/aj-geddes/claude-code-bmad-skills
- https://github.com/softaworks/agent-toolkit
- https://github.com/sickn33/antigravity-awesome-skills
- https://skills.sh/
