# pubmed-research

Fetch and analyze research papers from PubMed

## Usage

```bash
# Execute the pipeline
pnpm dproc execute pubmed-research \
  --input '{"input1":"your value"}' \
  --format html

# Or run directly
pnpm dproc run pubmed-research
```

## Customization

1. Edit `spec.yml` to define your inputs and outputs
2. Implement `processor.ts` to fetch and process data
3. Customize `prompts/main.prompt.md` for LLM instructions
4. Modify templates in `templates/` for different output formats

## Testing

```bash
# Validate pipeline structure
pnpm dproc validate pubmed-research

# Test with sample data
pnpm dproc test pubmed-research
```
