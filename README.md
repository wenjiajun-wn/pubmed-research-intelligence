# PubMed Research Intelligence

用于面试现场演示的医学科研文献分析平台。输入关键词，从 NCBI PubMed 获取真实论文，分析发文趋势、国家/地区、期刊和主题，展示样本内 Top 100，并生成约 500 字中文科研简报。

## Quick start

需要 **Python 3.11+**、**Node.js 20.19+ / 22.12+**。首次安装依赖需要联网；随项目提供的 Alzheimer’s 真实缓存可以离线演示，无需任何 API Key。

在项目根目录执行（Windows PowerShell）：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
# 如果 .env 已存在，请保留；不要覆盖已配置的密钥。
if (!(Test-Path .env)) { Copy-Item .env.example .env }
cd backend
uvicorn main:app --reload
```

另开一个终端：

```powershell
cd frontend
npm install
npm run dev
```

- 应用：[http://localhost:5173](http://localhost:5173)
- API 文档：[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- 健康检查：[http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

导航栏右侧的 **中文 / English** 按钮可即时切换界面语言，覆盖首页、分析进度、Dashboard、图表提示、论文表格、About 及数据来源说明。语言选择保存在浏览器本地，刷新后保留。切换不重新提交分析，并保留当前关键词、排序和展开状态。论文标题、摘要、期刊、MeSH 等原始文献内容保持原文，科研简报按项目要求始终使用中文。

PowerShell 若限制激活脚本，可直接用 `..\.venv\Scripts\python.exe -m uvicorn main:app --reload`（在 backend 目录），无需修改系统执行策略。macOS/Linux 使用 `source .venv/bin/activate`，其余命令相同。

## Project overview

- 真实 PubMed 检索；默认最新 500 篇，可选 300 / 1000。
- 全量总数与年度计数；样本范围内国家、主题、词云、期刊和研究多样性。
- 五个研究方向，六节中文简报，PMID / DOI 溯源与摘要展开。
- Top 100 默认显示 10 篇，可展开、按年份/期刊/期刊影响因子排序。
- 独立 Data Sources & Methodology 页面，支持打印/另存 PDF，适合提交来源截图。
- 真实阶段进度、错误状态、空结果、重试、同查询缓存回退、Sample Demo Mode。
- 桌面和手机适配、键盘焦点、图表读屏描述、减少动态效果偏好。

## Architecture & tech stack

```text
React / Vite / TypeScript / Tailwind CSS
  ├─ ECharts 6: 年度趋势、横向条形图
  ├─ wordcloud2: 主题词云
  └─ 前端轮询任务状态（1 秒）
                 │ /api，Vite 开发代理
FastAPI + Pydantic + httpx
  ├─ PubMed service: ESearch / EFetch / 限速 / 重试
  ├─ Analytics: Counter 聚合、主题提取、国家识别、熵与增长计算
  ├─ Journal Metric Adapter: 本地 CSV 映射
  ├─ LLM Adapter: OpenAI-compatible / 确定性统计简报
  └─ 内存任务 + 本地 JSON 数据缓存
```

没有数据库或独立队列。统计使用 Python 标准库，避免为简单计数引入复杂数据框操作；依赖中保留 pandas 供后续分析扩展。后端最多同时分析两个任务，队列超过容量返回 429。内存保留最多 30 个任务；旧完成任务在新任务提交时清理。**后端重启后分析 ID 失效**，重新运行搜索即可；磁盘缓存保留。以单 worker 运行，不能将本 Demo 的进程内任务状态直接用于多 worker 部署。

## Project structure

```text
backend/
  main.py                 API、后台任务、进度和降级编排
  config.py               后端环境配置
  models/schemas.py       输入校验、Paper 类型
  services/
    pubmed.py             PubMed 请求和 XML 解析
    analytics.py          统计与排序
    countries.py          独立 affiliation 国家识别
    journal_metrics.py    外部期刊指标适配器
    llm.py                可替换的 LLM 接口及离线摘要
    cache.py              查询缓存
    methodology.py        来源与统计方法
  data/journal_metrics.csv
  cache/alzheimers.json    随项目提供的真实快照
  scripts/fetch_demo.py    刷新真实离线数据
  scripts/smoke_live.py    在线端到端性能检查
  tests/test_pipeline.py
frontend/
  src/components/         搜索、进度、图表、论文表格、布局
  src/pages/              首页、Dashboard、来源页、About
  src/services/api.ts     类型化 API 客户端
  src/types/              数据类型
  src/styles/             样式
  scripts/verify-browser.mjs
.env.example              无密钥的配置模板
PRODUCT.md                已确认产品要求
DESIGN.md                 交付界面的设计系统
```

## Environment variables

复制 `.env.example` 为根目录 `.env`，后端启动时加载。前端不读取任何 API Key。`.env` 已被 `.gitignore` 排除，不应上传或截图。

| 变量 | 必填 | 用途 |
|---|---|---|
| `NCBI_API_KEY` | 否 | NCBI E-utilities API Key，提高允许的请求频率 |
| `NCBI_EMAIL` | 否 | 提供给 NCBI 的联系邮箱 |
| `LLM_API_KEY` | 否 | 大语言模型供应商密钥，与 NCBI Key 不同 |
| `LLM_BASE_URL` | 否 | OpenAI-compatible 基础地址，默认 `https://api.openai.com/v1` |
| `LLM_MODEL` | 否 | 默认 `gpt-4o-mini`，可替换为供应商实际支持的模型 |
| `LLM_TIMEOUT` | 否 | 默认 25 秒，失败自动返回统计简报 |
| `CACHE_TTL_HOURS` | 否 | 普通查询缓存有效期，默认 24 小时 |
| `CORS_ORIGINS` | 否 | 默认允许 localhost:5173 与 127.0.0.1:5173 |

**Scholarscope 的全局设置不会自动配置本应用**，需要将同一个 NCBI Key 单独设置到本项目后端。修改 `.env` 后重启后端。

## PubMed API & data pipeline

1. 验证查询（2–300 字符）与样本大小（300–1000）。
2. ESearch 获取 `Count`、PubMed 查询翻译及按发布日期排序的最近 PMID。
3. 每批 100 篇 EFetch XML，解析标题、摘要、作者、期刊、日期、机构、DOI、文献类型、关键词和 MeSH。
4. 按 PMID 去重；无法确定的字段为空。当前解析 journal articles，book records 未纳入分析，缺少记录时提示。
5. 按发布日期分别请求过去 10 年及采集当年的全量计数。
6. 分析样本，匹配本地期刊指标，排名，生成主题与简报。
7. 保存不含密钥的原始元数据快照，附 UTC 采集时间；UI 以 Asia/Shanghai 展示。

无 Key 时请求间隔至少 0.36 秒，有 Key 时至少 0.12 秒。网络错误和临时服务错误最多三次尝试，使用退避；单次请求 15 秒超时，采集整体上限 85 秒。模型超时另计。实际速度受外部网络影响，接口先返回任务 ID，前端按真实阶段展示进度。

官方参考：[PubMed](https://pubmed.ncbi.nlm.nih.gov/)、[E-utilities 参数](https://www.ncbi.nlm.nih.gov/books/NBK25499/)、[NCBI 使用指南](https://www.ncbi.nlm.nih.gov/books/NBK25497/)。

## Statistical scope

| 指标 | 口径 |
|---|---|
| Total publications | ESearch 全量命中数 |
| Last 5 complete years | 采集年份之前五个完整年度的独立 ESearch 日期范围计数（不按年度求和） |
| 年度趋势 | ESearch 全量年度查询；失败时明确降级为样本年份分布 |
| 五年增长率 | `(最后一个完整年 / 前五个完整年的首年 - 1) × 100`，基数为零或计数缺失时 N/A |
| Countries / Journals / Topics | 下载样本内统计，不外推全领域 |
| 国家计数 | 每篇每国去重；合作论文计入多个国家；未识别为 Unknown |
| 主题频率 | 每篇包含该主题计一次；优先 MeSH / 作者关键词，缺少时使用标题摘要二元短语 |
| Emerging topic | 比较 Y−5..Y−3 与 Y−2..Y−1 的样本主题占比，每组至少 20 篇，近期主题至少 5 篇；不足则不作判断 |
| Research diversity | 主题频次分布的归一化 Shannon 熵，0–100；不是研究质量评分 |
| Top Papers | 采集年份 Y 对应 `Y−5 <= publication_year <= Y` 的样本内 Top 100 |

**年份边界**：按题目要求 `publication_year >= current_year - 5` 会包含六个年份标签，例如 2021–2026。Top Papers 显示实际范围；五年 KPI 和增长率采用 2021–2025 完整年份，当前未完成年度不参与增长比较。缓存按快照采集年份解释，避免历史快照被误当作今天的数据。未来期刊卷期日期的论文可保留在样本，Top Papers 不纳入超出采集年的记录。

PubMed 的电子/纸本日期可能令按年查询不构成严格互斥分组，所以年度计数总和不保证等于全量检索总数。国家识别是有限词典启发式；主题短语不作复杂同义词合并。任何字段缺失都不补造。

## Impact Factor limitation

**Journal Impact Factor is not provided directly by PubMed. The demo uses an external/local journal metric mapping layer.**

`backend/data/journal_metrics.csv` 字段：

```csv
journal,impact_factor,metric_year,metric_source,metric_url,aliases
```

只收录已经查到的出版商公开数值。Nature Portfolio 行标明 2025 指标年份；部分 Elsevier 页面未明确年份，保留为空，显示 `Year unspecified`，不自行推断。数据源在每个指标旁可点击。映射覆盖有限，其余全部 N/A。可自行补充有来源的指标，不建议导入无授权的完整商业数据库。

指标按最新本地映射应用于样本，并非每篇论文发表当年的历史影响因子。排序只是一种期刊层级浏览方式，**不是论文引用、疗效或证据质量排名**；它可能把更正、综述等类型排在研究论文前面，应结合文献类型及全文解读。

## LLM API & fallback

本地已配置 DeepSeek。新环境可在根目录 `.env` 设置以下变量，密钥填写自己的有效值，然后重启后端：

```dotenv
LLM_API_KEY=填写自己的密钥
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-flash
LLM_TIMEOUT=45
```

官方 DeepSeek 接口使用非思考模式及 JSON 输出，以减少演示等待时间。模型以账号 `/models` 返回的可用名称为准。参考：[思考模式参数](https://api-docs.deepseek.com/guides/thinking_mode/)、[JSON 输出](https://api-docs.deepseek.com/guides/json_mode/)。点击首页 **Analyze / 开始分析** 会调用已配置的模型；**Open sample demo / 打开示例演示** 保持离线统计简报。

后端统一调用 `{LLM_BASE_URL}/chat/completions`。输入包含 Top Papers 的标题、截断摘要、PMID、期刊、年份、MeSH 和关键词，以及统计结果。Prompt 强制：

> 所有结论只能依据提供的文献 metadata 和 abstracts，如果证据不足，请明确说明。

模型不得执行文献中的指令，不得编造论文或数据。输出经 Pydantic 验证（五主题、六简报章节），引用 PMID 必须属于输入集合；验证失败回退。此检查不能证明每个模型自然语言结论都正确，仍需要阅读原文。

模型证据选取最多 16 篇有摘要的论文，排除更正、撤稿及关注声明类型；论文榜单本身保持原始排序。已知年度计数重叠的五年汇总 KPI 不传给模型，并明确禁止将年度计数相加当作去重论文数。页面 KPI 现已改用独立日期范围计数；旧缓存若缺少该字段则显示 N/A。

无 Key、超时、供应商错误或格式不合格时，返回可复现的真实统计简报，并显示 `Statistical summary` / `未使用大语言模型`。六节为：领域概况、主要研究方向、近五年研究趋势、代表性成果、当前挑战、未来研究机会。Demo 模式始终采用离线统计摘要，不产生模型调用费用。

## Demo mode & cache

首页点击 **Open sample demo**：不调用 PubMed 或模型，读取 `backend/cache/alzheimers.json`。

随附快照为 2026-10-13 从官方 API 采集的 **500 篇真实文献**，检索总量 **260,717**，保存 2016–2026 年计数。PMID 可在 PubMed 核实。缓存数据不包含密钥。

刷新缓存（需要联网）：

```powershell
cd backend
python scripts/fetch_demo.py
```

Live 分析优先命中 24 小时内同查询同样本量缓存，标为 `Cached Data`。外部接口失败时允许回退同查询旧缓存；Alzheimer’s 查询额外支持预置缓存，标为 `Cached Demo Data` 并保留原时间。**其他关键词绝不会被替换成 Alzheimer’s 数据**。没有对应缓存时显示可恢复错误。

## API design

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/health` | 服务及缓存状态 |
| POST | `/api/analyses` | 提交分析，202 返回 ID |
| GET | `/api/analyses/{id}` | 真实进度、状态、部分或完整结果 |
| GET | `/api/analyses/{id}/papers?sort=year&offset=0&limit=10` | 样本 Top100 内分页、排序 |
| GET | `/api/analyses/{id}/sources` | 来源记录和方法 |

```json
{"query":"Alzheimer's disease","sample_size":500,"mode":"live"}
```

`mode`: `live` / `demo`；`sort`: `impact_factor` / `year` / `journal`。论文列表排序在界面本地完成，API 也支持同样操作。

## Validation

```powershell
cd backend
python -m pytest -q
```

覆盖混合 XML 文本、缺失字段、国家去重/误判、真实快照、年度口径、排名、缺失指标、简报降级、虚构 PMID 拦截、接口校验、断网回退和禁止跨查询缓存替换。

```powershell
cd frontend
npm run build
# 前后端启动后，需要本机安装 Microsoft Edge
node scripts/verify-browser.mjs
```

浏览器检查：推荐词填充、Demo、图表、Top100、排序、摘要、导出、来源页、移动布局及错误状态。截图和 JSON 报告保存在 `.impeccable/review/`。前端使用 npm lockfile 锁定依赖。

语言切换专项检查：`node scripts/verify-language.mjs`。覆盖语言记忆、原始数据与当前分析保持、排序与展开保持、中英文错误提示及手机布局。中文截图位于 `docs/screenshots/home-chinese.png`、`dashboard-chinese.png`、`data-sources-chinese.png`、`mobile-chinese.png`。

可直接用于笔试材料的截图已另外保存到 `docs/screenshots/`：`data-sources.png`、`dashboard-overview.png`、`dashboard.png`、`home.png`、`mobile-overview.png`。这些图片来自运行中的真实数据 Demo，不含任何 API Key。

一次真实在线 500 篇分析实测 **26.73 秒**；缓存浏览器演示约 **1.1 秒**。2026-10-13 接入 DeepSeek `deepseek-flash`，通过真实平台接口完成五方向、六节中文简报及 PMID 引用校验；首次基于 500 篇真实缓存的模型分析用时 **11.41 秒**。这是本机单次测量，不是外部网络速度保证。联调结果保存在 `.impeccable/review/deepseek-report.json`，不含密钥。

后端最新 **19 项测试通过**，含 DeepSeek 请求参数及空/异常模型消息降级。前端此前已通过 TypeScript、生产构建及浏览器交互检查，390px 手机无页面横向溢出，依赖审计零已知漏洞；本轮未修改前端。已验证正常模型格式的模拟响应、错误引用拒绝、空查询结果及损坏缓存处理。

最终提示词端到端复测用时 **26.54 秒**，`summary_mode=llm`。模型输出明确区分样本与全量统计；每节最多五个 PMID，超过上限仍严格降级。

## Interview demonstration

1. 启动前后端，进入首页。
2. 点击 Open sample demo，展示真实快照并解释 Cached Demo Data 标识。
3. 指出全量命中数和 500 篇分析样本的区别。
4. 展示完整年度增长、研究主题、国家分布和期刊。
5. 展开 Top100、按年份/期刊排序、打开 PMID 与摘要。
6. 展示五个主题和约 500 字中文简报；解释无 LLM Key 时的确定性降级。
7. 打开 Data Sources，截图或打印 PDF，提交数据来源材料。
8. 网络正常时输入新关键词演示 Live 流程。

## Deployment boundaries

这是本地单用户 Demo，不含登录、计费、公共网络安全网关或分布式队列。生产部署应增加鉴权、持久化任务和适当的反向代理限流。当前只监听 loopback，前端不直接调用外部付费模型。项目尚未发布公共 GitHub 仓库，导航里的 GitHub 入口说明本地源码位置，不伪造仓库链接。

### 2026-10-13 审查修复

五年 KPI 已改为独立日期范围 Count，现有缓存经官方查询迁移为 81,893，另记计数更新时间，保留原论文采集时间。失败任务返回原始请求参数，重新分析会创建新任务并保留查询/模式/篇数；临时状态读取失败仍可重新检查。AI生成中单独显示等待状态，来源页自动刷新到完成并停止轮询。在线与离线简报统一排除无摘要、更正、撤稿及关注声明记录作为代表性成果；原始榜单保留并显示文献类型。
