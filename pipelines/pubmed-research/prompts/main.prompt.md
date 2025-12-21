# PubMed Research Analysis

## Search Query

"{{ inputs.query }}"

## Dataset Overview

- **Total papers found in PubMed:** {{ data.totalFound }}
- **Papers analyzed:** {{ data.fetchedCount }}
- **Search performed:** {{ data.searchDate }}

---

## Papers Retrieved

{% for paper in data.papers %}

### Paper {{ loop.index }}: {{ paper.title }}

**Authors:** {{ paper.authors | join(", ") }}  
**Journal:** {{ paper.journal }}  
**Published:** {{ paper.publicationDate }}  
**PMID:** {{ paper.pmid }}

**Abstract:** {{ paper.abstract }}

---

{% endfor %}

## Analysis Task

You are a scientific research analyst. Based on the **{{ data.fetchedCount }}** papers provided above regarding **"{{ inputs.query }}"**, provide a **{{ vars.analysisDepth }}** analysis.

**Requirements:**

1. Respond **strictly** in JSON format.
2. Maintain a **{{ vars.tone }}** and scientific tone.
3. Focus on actionable insights and empirical evidence.

### Expected JSON Structure:

{
"executiveSummary": "A comprehensive 2-3 paragraph summary of the research landscape.",
"keyFindings": [
"Most significant finding 1",
"Most significant finding 2",
"Most significant finding 3",
"Most significant finding 4",
"Most significant finding 5"
],
"majorThemes": [
{
"theme": "Theme name",
"description": "What this theme covers",
"paperCount": "Number of papers addressing this"
}
],
"methodologies": [
"Common research method 1",
"Common research method 2",
"Common research method 3"
],
"researchGaps": [
"Identified gap 1",
"Identified gap 2",
"Identified gap 3"
],
"futureDirections": [
"Promising research direction 1",
"Promising research direction 2",
"Promising research direction 3"
],
"topPapers": [
{
"pmid": "PMID of most relevant paper",
"title": "Paper title",
"why": "Why this paper is significant"
}
]
}
