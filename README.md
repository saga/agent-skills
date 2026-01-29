# Agent Skills for Roo Code

Roo Code 专用技能库，用于优化不同场景下的 AI 交互体验。

## 📁 Skills 列表

### 🎯 Investment Management Prompt Optimizer
**路径**: `.roo/skills-architect/prompt-optimizer/SKILL.md`  
**适用模式**: Architect

专门针对**欧洲和亚太金融服务公司投资管理领域**的 prompt 优化技能。

**适用场景**：
- 模型：GPT-5.2
- Reasoning：High
- 模式：Architect
- 领域：Investment Management
- 区域：欧洲和亚太市场

**核心功能**：
- 投资组合管理系统架构设计模板
- 金融系统重构/优化指南
- 金融技术选型分析框架
- 欧洲和亚太监管合规要求（MiFID II, GDPR, APRA, MAS, SFC等）
- 金融行业关键术语库（Bloomberg, FIX, SWIFT, OMS/EMS等）
- 充分利用 high reasoning 能力的结构化提问技巧

## 🚀 快速开始

### 自动激活
Roo Code 会在你提出相关问题时自动加载此 skill。例如：
- "帮我设计一个投资组合管理系统"
- "优化交易系统性能"
- "对比时序数据库选型"

### 手动参考
如果 skill 未自动激活，你可以在对话中提及：
```
请参考 prompt-optimizer skill 来分析这个架构设计问题...
```

## 💡 使用建议

当使用 **Architect 模式 + GPT-5.2 + High Reasoning** 进行金融系统架构设计时：

### ✅ DO（推荐）
- ✓ 提供充足的金融业务背景（AUM、资产类别、客户类型）
- ✓ 明确监管要求（GDPR, MiFID II, APRA, MAS等）
- ✓ 说明非功能性需求（SLA、RTO/RPO、延迟要求）
- ✓ 要求分步骤推理和多方案对比
- ✓ 考虑现有系统集成（Bloomberg, custodians等）

### ❌ DON'T（避免）
- ✗ 问题过于宽泛，不说明具体金融业务场景
- ✗ 只要求技术方案，忽略监管合规要求
- ✗ 不说明数据规模和实时性要求
- ✗ 忽略交易时段、清算窗口等行业约束

## 📁 目录结构

```
.roo/
└── skills-architect/          # Architect 模式专用 skills
    └── prompt-optimizer/      # Prompt 优化 skill
        └── SKILL.md           # Skill 定义文件
```

## 🔧 自定义 Skill

如需添加新的 skill：

1. 创建 skill 目录：
   ```bash
   mkdir .roo/skills-architect/your-skill-name
   ```

2. 创建 `SKILL.md` 文件，包含 YAML frontmatter：
   ```markdown
   ---
   name: your-skill-name
   description: 简短描述何时使用此 skill
   ---
   
   # Skill 内容
   ```

3. Roo Code 会自动发现并在匹配时加载

详见：[Roo Code Skills 文档](https://docs.roocode.com/features/skills)

## 📚 资源

- [Roo Code 官方文档](https://docs.roocode.com/)
- [Skills 功能介绍](https://docs.roocode.com/features/skills)
- [Agent Skills 规范](https://agentskills.io/)

## 🤝 贡献

欢迎提交新的 skills 或改进现有 skills！