# @aganitha/dproc-core

Production-ready CLI for building LLM-powered data processing pipelines and automated report generation.

## Features

- 🤖 **Multiple LLM Providers** - OpenAI, Anthropic, Google with automatic fallback
- 🔐 **Secure API Key Management** - Encrypted local storage with file permissions
- 🚀 **Queue-Based Execution** - Async job processing with Redis
- 📊 **Real-time Monitoring** - Track execution status and statistics
- 🎯 **Template System** - Generate reports in Markdown, HTML, PDF, and PPTX
- 💾 **Database Support** - SQLite for development, PostgreSQL for production
- 🔄 **Job Cancellation** - Stop running jobs on-demand
- 📦 **Pipeline Scaffolding** - Quick-start templates for new pipelines

## Quick Start

### Installation

```bash
# Install globally from Aganitha NPM registry
npm install -g @aganitha/dproc-core

# Verify installation
dproc --version
```

### Prerequisites

Before using DProc, ensure you have:

1. **Node.js 20+** installed
2. **Redis server** running (for job queue)
3. **API keys** for at least one LLM provider:

- OpenAI API key ([Get it here](https://platform.openai.com/api-keys))
- Anthropic API key ([Get it here](https://console.anthropic.com/settings/keys))
- Google AI API key ([Get it here](https://makersuite.google.com/app/apikey))

### Step 1: Start Redis (Required)

```bash
# Using Docker (recommended)
docker run -d --name dproc-redis -p 6379:6379 redis:7-alpine

# Or install locally
# macOS: brew install redis && brew services start redis
# Ubuntu: sudo apt install redis-server && sudo systemctl start redis

```

### Step 2: Configure API Keys

```bash
dproc configure

```

You'll be prompted to enter API keys:

```text
🔐 DProc Configuration

API keys will be stored securely in: /home/user/.dproc/secrets.json
Leave blank to skip a provider

? OpenAI API Key: ****
? Anthropic API Key:
? Google API Key: ****

✓ Configuration saved successfully!

Configured providers: openai, google

```

**Important:** API keys are stored with `0600` permissions (user-only readable) in `~/.dproc/secrets.json`

### Step 3: Create Your First Pipeline

```bash
# Create a new pipeline
dproc init my-first-report

# Navigate to the pipeline
cd pipelines/my-first-report

```

This creates a complete pipeline structure:

```text
my-first-report/
├── spec.yml                 # Pipeline configuration
├── config.yml               # LLM and execution settings
├── processor.ts             # Data processing logic
├── prompts/
│   └── main.prompt.md       # LLM instructions
├── templates/
│   ├── report.html.njk      # HTML template
│   └── report.md.njk        # Markdown template
├── data/                    # Static data files
├── output/
│   ├── bundles/             # Intermediate data
│   └── reports/             # Generated reports
└── README.md               # Pipeline documentation

```

### Step 4: Customize Your Pipeline

**Edit `spec.yml`** - Define inputs and outputs:

```yaml
pipeline:
  name: my-first-report
  version: 1.0.0
  description: Generate market analysis report

inputs:
  - name: companyName
    type: text
    label: Company Name
    required: true
    placeholder: e.g., Tesla, Apple

  - name: analysisDepth
    type: select
    label: Analysis Depth
    options:
      - shallow
      - moderate
      - comprehensive
    default: moderate

outputs:
  - md
  - html
  - pdf
```

**Edit `processor.ts`** - Fetch and process data:

```typescript
import type { ProcessorContext, ProcessorResult } from "@dproc/types";

export default async function processor(
  inputs: Record<string, any>,
  context: ProcessorContext
): Promise<ProcessorResult> {
  context.logger.info(`Processing: ${inputs.companyName}`);

  // Fetch data from APIs
  const response = await context.libs.axios.default.get(
    `https://api.example.com/company/${inputs.companyName}`
  );

  // Process and structure data
  const processedData = {
    company: inputs.companyName,
    metrics: response.data,
    timestamp: new Date().toISOString(),
    analysis: [], // Your analysis logic here
  };

  return {
    attributes: processedData,
    metadata: {
      source: "example-api",
      recordCount: processedData.analysis.length,
    },
  };
}
```

**Edit `prompts/main.prompt.md`** - Write LLM instructions:

````markdown
# Company Analysis Report

## Company Information

Name: {{ inputs.companyName }}
Analysis Depth: {{ inputs.analysisDepth }}

## Data Available

{{ data | json(2) }}

## Task

Generate a {{ inputs.analysisDepth }} analysis report with:

1. Executive Summary
2. Key Metrics Analysis
3. Market Position
4. Recommendations

Return structured JSON:

```json
{
  "summary": "Executive summary here",
  "keyMetrics": ["metric1", "metric2"],
  "analysis": "Detailed analysis",
  "recommendations": ["rec1", "rec2"]
}
```
````

### Step 5: Validate Your Pipeline

```bash
dproc validate my-first-report
```

Output:

```text
🔍 Validating pipeline: my-first-report

✅ Pipeline structure is valid

📋 Pipeline Information:
   Name: my-first-report
   Version: 1.0.0
   Inputs: 2
   Outputs: md, html, pdf

```

### Step 6: Execute Your Pipeline

```bash
# Method 1: Interactive mode (prompts for inputs)
dproc run my-first-report

# Method 2: CLI with JSON input
dproc execute my-first-report \
  --input '{"companyName":"Tesla","analysisDepth":"comprehensive"}' \
  --format html \
  --priority high

# Output:
# 🚀 Executing pipeline: my-first-report
# ✓ Job enqueued: job-1703012345
# 📊 Monitor: dproc history
# 📁 Output: /shared/dproc-workspace/outputs/my-first-report/

```

### Step 7: Monitor Execution

```bash
# View all execution history
dproc history

# View specific pipeline history
dproc history my-first-report

# View detailed statistics
dproc stats my-first-report

```

Example output:

```text
📜 Execution History:

  ✅ exec-1703012345-job-abc123
     Pipeline: my-first-report
     Status: completed
     Duration: 8450ms
     Created: 12/19/2024, 12:30:45 AM
     Output: /shared/dproc-workspace/outputs/.../report.html

  ⏳ exec-1703012340-job-xyz789
     Pipeline: my-first-report
     Status: processing
     Duration: N/A
     Created: 12/19/2024, 12:29:00 AM

```

## Advanced Usage

### Environment Variables

```bash
# Workspace location (default: ./workspace or /shared/dproc-workspace)
export DPROC_WORKSPACE=/path/to/workspace

# Redis configuration
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_PASSWORD=your-password

# Database (optional - overrides secrets file)
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GOOGLE_API_KEY=AIza...

# PostgreSQL for production
export DATABASE_URL=postgresql://user:pass@host:5432/dproc

```

### Using Different Output Formats

```bash
# Markdown
dproc execute my-report --format md

# HTML
dproc execute my-report --format html

# PDF (requires template)
dproc execute my-report --format pdf

# PowerPoint (requires template)
dproc execute my-report --format pptx

```

### Job Priorities

```bash
# High priority (processes first)
dproc execute urgent-report --priority high

# Normal priority (default)
dproc execute regular-report --priority normal

# Low priority (processes last)
dproc execute background-report --priority low

```

### Working with Data Files

Place static data in `pipelines/your-pipeline/data/`:

```typescript
// In processor.ts
const csvData = await context.readDataFile("companies.csv");
const jsonData = await context.readDataFile("config.json");
```

### Caching Results

```typescript
// In processor.ts
export default async function processor(inputs, context) {
  // Check cache
  const cached = await context.cache.get("api-data");
  if (cached) return cached;

  // Fetch fresh data
  const data = await fetchExpensiveData();

  // Cache for 1 hour (3600 seconds)
  await context.cache.set("api-data", data, 3600);

  return data;
}
```

### Multiple LLM Providers with Fallback

```yaml
# config.yml
llm:
  provider: anthropic
  model: claude-sonnet-4-20250514
  temperature: 0.7
  maxTokens: 8192

  # Automatic fallback if primary fails
  fallback:
    provider: openai
    model: gpt-4-turbo
```

## CLI Reference

### Commands

| Command                     | Description                          |
| --------------------------- | ------------------------------------ |
| `dproc init <name>`         | Create new pipeline with scaffolding |
| `dproc list`                | List all available pipelines         |
| `dproc validate <pipeline>` | Validate pipeline structure          |
| `dproc run <pipeline>`      | Run pipeline interactively           |
| `dproc execute <pipeline>`  | Execute pipeline with JSON input     |
| `dproc history [pipeline]`  | View execution history               |
| `dproc stats [pipeline]`    | Show execution statistics            |
| `dproc configure`           | Configure API keys                   |
| `dproc --version`           | Show CLI version                     |
| `dproc --help`              | Show help information                |

### Options

#### `dproc init`

```bash
dproc init my-pipeline \
  --description "My custom pipeline" \
  --template simple   # simple, api, or file

```

#### `dproc execute`

```bash
dproc execute pipeline-name \
  --input '{"key":"value"}' \
  --format html \
  --priority high

```

#### `dproc history`

```bash
dproc history pipeline-name --limit 20

```

## Project Structure

```text
your-project/
├── pipelines/              # Your pipelines
│   ├── pipeline-1/
│   ├── pipeline-2/
│   └── pipeline-3/
├── workspace/              # Execution workspace (auto-created)
│   ├── pipelines/          # Symlinked or copied pipelines
│   ├── outputs/            # Generated reports
│   ├── temp/               # Temporary files
│   └── dproc.db           # SQLite database (dev)
└── .env                   # Environment variables (optional)

```

## Integration with Web UI

DProc CLI works seamlessly with the DProc Web UI:

```bash
# Install web UI (Docker)
docker run -d \
  -p 3000:3000 \
  -v /shared/dproc-workspace:/shared/dproc-workspace \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_HOST=redis \
  aganitha/dproc-web

# Access at http://localhost:3000

```

CLI and Web UI share:

- ✅ Same workspace (`/shared/dproc-workspace`)
- ✅ Same database (execution history)
- ✅ Same job queue (Redis)
- ✅ Same API keys (`~/.dproc/secrets.json`)

## Troubleshooting

### Redis Connection Error

```text
Error: connect ECONNREFUSED 127.0.0.1:6379

```

**Solution:** Start Redis server:

```bash
docker run -d -p 6379:6379 redis:7-alpine

```

### API Key Not Found

```text
Error: No API key found for openai

```

**Solution:** Configure API keys:

```bash
dproc configure

```

### Pipeline Not Found

```text
Error: Pipeline not found: my-pipeline

```

**Solution:** Ensure you're in the correct directory:

```bash
pwd  # Should contain 'pipelines' folder
dproc list  # Should show your pipeline

```

### Permission Denied

```text
Error: EACCES: permission denied, mkdir '/shared/dproc-workspace'

```

**Solution:** Set correct permissions:

```bash
sudo mkdir -p /shared/dproc-workspace
sudo chown -R $USER:$USER /shared/dproc-workspace
chmod 755 /shared/dproc-workspace

```

### Worker Not Processing Jobs

**Check worker status:**

```bash
# If using Docker
docker logs dproc-worker

# If running manually
dproc-worker  # From @aganitha/dproc-core package

```

## Performance Tips

1. **Use caching** for expensive API calls
2. **Batch inputs** when processing multiple items
3. **Set appropriate priorities** for time-sensitive reports
4. **Use PostgreSQL** for production (faster than SQLite)
5. **Scale workers** horizontally for high throughput

## Examples

### Example 1: Simple Text Report

```bash
dproc init simple-summary
cd pipelines/simple-summary

# Edit spec.yml - add text input
# Edit processor.ts - return input
# Execute
dproc execute simple-summary --input '{"topic":"AI Trends"}' --format md

```

### Example 2: API-Based Report

```bash
dproc init weather-report --template api
cd pipelines/weather-report

# processor.ts fetches from weather API
# prompts/main.prompt.md formats weather data
# Execute
dproc execute weather-report --input '{"city":"London"}' --format html

```

### Example 3: Data File Processing

```bash
dproc init data-analysis --template file
cd pipelines/data-analysis

# Add sales.csv to data/
# processor.ts reads and analyzes CSV
# Execute
dproc execute data-analysis --input '{"quarter":"Q4"}' --format pdf

```

## Support

- **Documentation:** [GitHub Wiki](https://github.com/mdharwad-acog/dproc-framework-v4/wiki)
- **Issues:** [GitHub Issues](https://github.com/mdharwad-acog/dproc-framework-v4/issues)
- **Email:** mdharwad@aganitha.ai
- **Internal:** Slack #dproc-support

## Development

```bash
# Clone repository
git clone [https://github.com/mdharwad-acog/dproc-framework-v4.git](https://github.com/mdharwad-acog/dproc-framework-v4.git)
cd dproc-framework-v4

# Install dependencies
pnpm install

# Build
pnpm build

# Run locally
pnpm --filter dproc-core start <command>

# Run tests
pnpm test

```

## License

MIT © Aganitha Cognitive Solutions

---

**Built with ❤️**
