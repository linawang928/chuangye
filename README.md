# 创业记忆平台

给 Lin 和 Shelley 使用的双人创业记录工作台。它把创业日志、互相点评、决策复盘、可视化仪表盘、知识图谱和 Agent 问答放在同一个网页/PWA 里。

## 已实现功能

- 双人登录：Lin / Shelley 各自口令登录
- 数据范围：个人数据、共同数据、全部可见数据、对方共享数据
- 创业日志：文字记录、图片上传识别入口、音频上传识别入口、浏览器语音输入
- 双人点评：对可见日志添加同意、疑问、行动、复盘点评
- 决策记录：背景、选项、最终决定、原因、信心、复盘日期
- 可视化仪表盘：记录趋势、信心曲线、标签分布、项目活跃度
- 知识图谱：自动从日志生成节点与关系，也支持手动新增节点/关系
- Agent 智能体：按当前数据范围检索历史记录、决策和图谱节点并回答
- 本地数据库：默认使用 SQLite，后续可替换为 Supabase/PostgreSQL

## 本地启动

```bash
npm install
cp .env.example .env
npm run dev
```

打开 `http://localhost:3000`。

默认开发口令：

- Lin：`lin123456`
- Shelley：`shelley123456`

正式部署前请修改 `.env` 里的 `LIN_PASSCODE`、`SHELLEY_PASSCODE` 和 `SESSION_SECRET`。

## AI 配置

不配置 AI 密钥时，系统仍可使用本地规则完成摘要、关键词提取和 Agent 检索式回答。配置后会启用大模型能力：

```bash
OPENAI_API_KEY=你的密钥
OPENAI_MODEL=gpt-5.2
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
```

图片识别、音频转写和更完整的 Agent 推理都通过这一层接入。

## 数据文件

默认数据库路径：

```bash
./data/startup-memory.db
```

该文件由应用自动创建，并带有少量种子数据。

## 推荐后续迭代

1. 接入 Supabase Auth、PostgreSQL、Storage 和 pgvector。
2. 把上传文件真正落到对象存储，并保存识别结果。
3. 为 Agent 增加向量检索、图谱扩展检索和对话历史。
4. 增加每周复盘自动生成、未验证假设提醒。
5. 开发微信小程序，只保留快速记录、拍照、语音、最近点评入口。
