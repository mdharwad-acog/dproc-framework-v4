# hello-world

Simple test pipeline

## Usage

```bash
# Execute the pipeline
pnpm dproc execute hello-world \
  --input '{"input1":"your value"}' \
  --format html

# Or run directly
pnpm dproc run hello-world
```

## Customization

1. Edit `spec.yml` to define your inputs and outputs
2. Implement `processor.ts` to fetch and process data
3. Customize `prompts/main.prompt.md` for LLM instructions
4. Modify templates in `templates/` for different output formats

## Testing

```bash
# Validate pipeline structure
pnpm dproc validate hello-world

# Test with sample data
pnpm dproc test hello-world
```
