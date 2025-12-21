# Simple test pipeline

## Input Data
User provided: {{ inputs.input1 }}

## Processed Data
{% if data.results %}
Results found: {{ data.results.length }}
{% else %}
No results available
{% endif %}

## Task
Generate a {{ vars.tone }} analysis based on the data above.

Return JSON format:
```json
{
  "summary": "Executive summary here",
  "keyPoints": ["point1", "point2", "point3"],
  "analysis": "Detailed analysis here",
  "recommendations": ["rec1", "rec2"]
}
```
