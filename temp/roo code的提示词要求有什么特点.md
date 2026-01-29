这个问题问得很到位 👍
**Roo Code 的提示词（prompt）确实和你给 Copilot / Chat Completions 用的那一套不太一样**，它更像是在“给一个会自己动手改代码的 agent 下操作规程”，而不是单纯问答。

我直接给你一个**结构化总结 + 可对照的写法建议**，结合你之前提到的 *“同样的提示词，Copilot 行，Roo 不行”* 这个痛点。

---

## 一句话总结 Roo Code Prompt 的核心特点

> **Roo 更偏“可执行指令 + 强约束上下文 + 明确动作边界”，而不是“语义友好型自然语言”。**

如果 prompt 不够“工程化”，Roo 很容易：

* 看懂了意图，但**不敢动手**
* 或者理解发散，**改错文件 / 少改 / 不改**

---

## Roo Code Prompt 的 6 个关键特征

### 1️⃣ **必须显式告诉它：要不要改代码**

Copilot 默认“你想让我写/改代码”，
**Roo 默认是保守的**。

❌ 不推荐：

> 帮我优化一下这个逻辑

✅ 推荐：

> **请直接修改以下文件中的代码**，以实现下面的目标

---

### 2️⃣ **文件 & 范围要“点名”**

Roo 非常依赖 workspace / file context。

❌ 不推荐：

> 把这里的实现改成 async

✅ 推荐：

> **仅修改 `src/services/user_service.py`**
> 不要新增文件
> 不要修改测试

---

### 3️⃣ **目标 ≠ 行为，要拆开**

Roo 对“想要什么”和“怎么做”区分得很严格。

❌ 不推荐（只给目标）：

> 提高性能，减少不必要的调用

✅ 推荐（目标 + 行为）：

> 目标：减少重复 API 调用
> 行为：
>
> * 引入 in-memory cache
> * cache key = user_id
> * ttl = 60s

---

### 4️⃣ **强约束 > 自由发挥**

Roo 很容易“发挥过度”，除非你把边界画死。

常用的约束语句（非常重要）：

```
- 不要重构无关代码
- 不要改变函数签名
- 不要引入新依赖
- 如果不确定，请保持原样并加 TODO 注释
```

👉 这类话对 Roo 的作用 **远大于** 对 Copilot 的作用。

---

### 5️⃣ **“失败兜底策略”要写清楚**

这是 Roo Prompt 的一个隐藏要点。

❌ 不写：

> 直接实现

✅ 推荐：

> 如果无法安全修改：
>
> * 不要尝试猜测
> * 返回修改建议列表
> * 并说明原因

这会显著减少 Roo “啥也不干” 或“胡改”的情况。

---

### 6️⃣ **输出格式要工程化**

Roo 对输出结构很敏感。

推荐格式（非常 Roo-friendly）👇

```
任务类型：代码修改

目标：
- ...

上下文：
- 当前代码位于 ...
- 调用链是 ...

修改要求：
- ...

约束：
- ...

验收标准：
- ...
```

---

## 一个「对 Roo 友好」的 Prompt 模板（可直接用）

```text
你是一个代码修改型 agent。

任务类型：直接修改代码

目标：
- 修复 XXX 问题
- 保持现有行为不变，除非明确说明

上下文：
- 需要修改的文件：src/xxx/yyy.py
- 相关函数：foo(), bar()

修改要求：
- 使用现有工具和模式
- 不新增第三方依赖

约束：
- 不修改其他文件
- 不改变 public API
- 不做与目标无关的重构

失败策略：
- 如果无法确定安全修改方式，请停止修改并说明原因

请直接给出修改后的代码 diff。
```

---

## 为什么 Copilot 行，Roo 不行？（本质原因）

| 维度    | Copilot         | Roo                |
| ----- | --------------- | ------------------ |
| 默认角色  | Pair programmer | Autonomous agent   |
| 容错性   | 高               | 低                  |
| 推断意图  | 激进              | 保守                 |
| 上下文来源 | 当前编辑区           | Workspace + Prompt |
| 最怕的事  | 写得不好            | **改错代码**           |

👉 所以：
**Copilot 吃“模糊意图”，Roo 吃“明确指令”。**

---

## 进阶建议（结合你之前的 MCP / Tool 方向）

你如果：

* 给 Roo 接 MCP（ServiceNow / Search / RAG）
* 或者想让它多步执行

那 Prompt 里要额外加一句：

> 在修改代码前，如有必要，可以先调用工具获取信息，但最终必须落到代码修改上。

否则 Roo 可能只查、不改。

---

如果你愿意的话，
你可以 **把你现在给 Copilot / Roo 的同一条 prompt 贴出来**，我可以帮你 **逐句改成 Roo 的“最优指令版”**，甚至给你两个版本（保守 / 激进）。





---

---

这个想法**非常 Roo / 非常 Architect** 👌
你这个 *“Prompt 优化器（针对 Roo Code）”* 本质上是一个 **meta-agent skill**，而且目标很清晰：
👉 **把“人类随手写的模糊 prompt” → “Roo 可稳定执行的工程化指令”**

下面我给你一个 **可以直接落地的 `skill.md` 设计**，不是玩具版，是 **真的能在 Roo / Cline / 自建 agent 里用的那种**。

---

# skill.md — Roo Code Prompt Optimizer

```md
# Skill: Roo Code Prompt Optimizer

## Skill ID
roo_prompt_optimizer

## Category
agent / prompt-engineering / code-modification

## Purpose
Transform vague or Copilot-style prompts into execution-safe, deterministic prompts optimized for Roo Code agents.

This skill is designed to reduce:
- no-op behaviors (agent understands but does not modify code)
- over-modification (agent refactors unrelated code)
- ambiguity in file scope, intent, and constraints

---

## When to Use
Use this skill when:
- The input prompt is written in natural language
- The user intends Roo Code to directly modify code
- The prompt lacks explicit file scope, constraints, or execution intent
- The same prompt works in Copilot but fails in Roo

Do NOT use this skill for:
- Pure Q&A prompts
- Architectural discussion without code changes
- Exploratory reasoning or brainstorming

---

## Input
The skill accepts:
- A raw user prompt (string)
- Optional workspace context (file list, language, repo type)

Example input:
> "帮我优化一下这里的实现，感觉性能不太好"

---

## Output
A rewritten prompt that:
- Explicitly declares code modification intent
- Specifies file scope and action boundaries
- Separates goal, behavior, constraints, and failure strategy
- Is directly executable by a Roo Code agent

The output MUST be a single prompt, not an explanation.

---

## Optimization Principles

### 1. Enforce Explicit Action Intent
If the input does not explicitly state code modification, inject:

> "请直接修改代码以完成以下目标"

Never assume intent.

---

### 2. Infer and Declare File Scope
If file names are missing:
- Ask the caller to inject workspace context
OR
- Use a placeholder and mark it as REQUIRED

Example:
> "需要修改的文件（必须明确）：<FILE_PATH>"

---

### 3. Separate Goal from Behavior
Rewrite blended intent into:
- Goal: What outcome is desired
- Behavior: How the code should be changed

Never allow abstract goals without behaviors.

---

### 4. Inject Safety Constraints
Always include:
- Do not modify unrelated files
- Do not refactor unless required
- Preserve public APIs unless stated otherwise

These constraints are mandatory.

---

### 5. Define Failure Strategy
Always include a fallback instruction:

> "如果无法安全修改，请停止并说明原因，而不是猜测实现"

This prevents silent failure or hallucinated edits.

---

### 6. Normalize Output Structure
The final prompt MUST follow this structure:

```

任务类型：代码修改

目标：

* ...

上下文：

* ...

修改要求：

* ...

约束：

* ...

失败策略：

* ...

输出要求：

* 以 diff 或完整文件形式返回

```

---

## Rewrite Algorithm (Internal)
1. Classify intent: code-modification / unclear / non-code
2. Reject or reframe non-modification prompts
3. Extract or request file scope
4. Expand implicit constraints
5. Emit normalized prompt

---

## Example

### Input Prompt
> "把这个逻辑改得更优雅一点"

### Optimized Output Prompt

```

你是一个代码修改型 agent。

任务类型：代码修改

目标：

* 提升当前逻辑的可读性
* 不改变现有行为和输出结果

上下文：

* 需要修改的文件：<明确文件路径>
* 当前逻辑位于一个已有函数中

修改要求：

* 使用已有语言特性
* 不引入新依赖

约束：

* 不修改其他文件
* 不改变函数签名
* 不做与目标无关的重构

失败策略：

* 如果无法在保持行为一致的前提下修改，请停止并说明原因

输出要求：

* 直接给出修改后的代码 diff

```

---

## Quality Checklist
Before returning the optimized prompt, verify:
- [ ] Code modification intent is explicit
- [ ] File scope is declared or requested
- [ ] Constraints are present
- [ ] Failure strategy exists
- [ ] Output format is specified

If any item is missing, the skill MUST inject it.

---

## Notes
This skill prioritizes determinism and safety over creativity.

It is intentionally conservative to align with Roo Code's execution model.
```

---

## 设计点评（给你这个 Architect 👇）

* 你这个 skill **不是“改 prompt 的 prompt”**
* 而是一个 **“指令标准化器（Instruction Normalizer）”**
* 非常适合：

  * Roo
  * Cline
  * 自建 MCP agent
  * VSCode Copilot Chat 前置处理

本质上是：

> **把人类语言 → agent contract**

---

## 下一步你可以怎么进阶

如果你想再上一个台阶，我会建议你：

1. **加一个 intent classifier**

   * `explain / modify / search / refactor`
2. **接 workspace scanner**

   * 自动补全可能的文件路径
3. **加一个 strict / relaxed 模式**

   * strict：给 Roo
   * relaxed：给 Copilot

如果你愿意，我可以帮你：

* 把这个 `skill.md` **直接拆成一个可运行的 MCP tool**
* 或者写成 **LangGraph / OpenAI Agents SDK 的一个 node**

你更想往哪一步走？

---

---
