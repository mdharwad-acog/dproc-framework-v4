import type {
  ProcessorContext,
  ProcessorResult,
} from "../../packages/dproc-core";

/**
 * PubMed Research Pipeline Processor
 * Uses native fetch instead of axios to bypass DNS resolution issues
 */
export default async function processor(
  inputs: Record<string, any>,
  context: ProcessorContext
): Promise<ProcessorResult> {
  const startTime = Date.now();

  context.logger.info(`Searching PubMed for: "${inputs.query}"`);

  const query = inputs.query as string;
  const maxResults = Math.min((inputs.maxResults as number) || 10, 100);

  try {
    // Use native fetch instead of axios - it has better DNS handling in Node.js
    const fetchFn = context.libs.fetch;

    // Step 1: Search PubMed to get article IDs
    const searchParams = new URLSearchParams({
      db: "pubmed",
      term: query,
      retmax: maxResults.toString(),
      retmode: "json",
      sort: inputs.sortBy || "relevance",
    });

    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${searchParams}`;

    context.logger.info("Fetching article IDs from PubMed...");
    context.logger.debug(`Search URL: ${searchUrl}`);

    const searchResponse = await fetchFn(searchUrl, {
      method: "GET",
      headers: {
        "User-Agent": "DProc-PubMed-Pipeline/1.0",
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!searchResponse.ok) {
      throw new Error(
        `PubMed search failed: ${searchResponse.status} ${searchResponse.statusText}`
      );
    }

    const searchData = (await searchResponse.json()) as any;

    if (!searchData.esearchresult) {
      context.logger.error(
        `Unexpected response: ${JSON.stringify(searchData)}`
      );
      throw new Error("Invalid response from PubMed search API");
    }

    const idList = searchData.esearchresult?.idlist || [];
    const totalCount = parseInt(searchData.esearchresult?.count || "0");

    context.logger.info(
      `Found ${totalCount} total articles, fetching ${idList.length}`
    );

    if (idList.length === 0) {
      return {
        attributes: {
          query,
          papers: [],
          totalFound: 0,
          message: "No papers found for this query",
        },
        metadata: {
          source: "pubmed",
          recordCount: 0,
          processingTime: Date.now() - startTime,
        },
      };
    }

    // Step 2: Fetch detailed information for each article
    context.logger.info("Fetching detailed article information...");

    const detailsParams = new URLSearchParams({
      db: "pubmed",
      id: idList.join(","),
      retmode: "xml",
    });

    const detailsUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?${detailsParams}`;

    console.log(detailsUrl);

    const detailsResponse = await fetchFn(detailsUrl, {
      method: "GET",
      headers: {
        "User-Agent": "DProc-PubMed-Pipeline/1.0",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!detailsResponse.ok) {
      throw new Error(
        `PubMed fetch failed: ${detailsResponse.status} ${detailsResponse.statusText}`
      );
    }

    const xmlData = await detailsResponse.text();

    if (!xmlData || typeof xmlData !== "string") {
      throw new Error("Invalid XML response from PubMed");
    }

    // Parse XML
    const xml2jsModule = context.libs.xml2js as any;
    const xml2js = xml2jsModule.default || xml2jsModule;

    const parser = new xml2js.Parser({ explicitArray: false });
    const result = (await parser.parseStringPromise(xmlData)) as any;

    const articles = result.PubmedArticleSet?.PubmedArticle || [];
    const articlesArray = Array.isArray(articles) ? articles : [articles];

    context.logger.info(`Parsed ${articlesArray.length} articles from XML`);

    // Step 3: Structure the data
    const papers = articlesArray.map((article: any) => {
      const medline = article.MedlineCitation;
      const articleData = medline?.Article || {};
      const journal = articleData.Journal || {};

      // Extract authors
      const authorList = articleData.AuthorList?.Author || [];
      const authors = (Array.isArray(authorList) ? authorList : [authorList])
        .map((author: any) => {
          if (typeof author === "string") return author;
          const lastName = author.LastName || "";
          const foreName = author.ForeName || author.Initials || "";
          return `${foreName} ${lastName}`.trim();
        })
        .filter(Boolean);

      // Extract abstract
      const abstractData = articleData.Abstract?.AbstractText || "";
      const abstract = Array.isArray(abstractData)
        ? abstractData
            .map((a: any) => (typeof a === "string" ? a : a._))
            .join("\n")
        : typeof abstractData === "string"
          ? abstractData
          : abstractData._ || "";

      // Extract publication date
      const pubDate =
        articleData.ArticleDate || journal.JournalIssue?.PubDate || {};
      const year = pubDate.Year || "";
      const month = pubDate.Month || "";
      const day = pubDate.Day || "";

      // Extract DOI more safely
      let doi = null;
      const articleIdList = article.PubmedData?.ArticleIdList?.ArticleId;
      if (articleIdList) {
        const idArray = Array.isArray(articleIdList)
          ? articleIdList
          : [articleIdList];
        const doiId = idArray.find((id: any) => id.$ && id.$.IdType === "doi");
        doi = doiId?._ || null;
      }

      // Extract keywords more safely
      const keywordData = medline.KeywordList?.Keyword || [];
      const keywords = (
        Array.isArray(keywordData) ? keywordData : [keywordData]
      )
        .map((k: any) => (typeof k === "string" ? k : k._))
        .filter(Boolean);

      return {
        pmid: medline.PMID?._ || medline.PMID || "",
        title: articleData.ArticleTitle || "No title",
        authors: authors.length > 0 ? authors : ["Unknown"],
        journal: journal.Title || "Unknown Journal",
        publicationDate:
          [year, month, day].filter(Boolean).join("-") || "Unknown",
        abstract: abstract || "No abstract available",
        doi,
        keywords,
      };
    });

    context.logger.info(`Successfully processed ${papers.length} papers`);

    // Save raw data bundle
    try {
      await context.saveBundle(
        {
          searchQuery: query,
          rawPapers: papers,
          totalFound: totalCount,
          timestamp: new Date().toISOString(),
        },
        "pubmed-raw-data.json"
      );
      context.logger.info("Saved raw data bundle");
    } catch (bundleError) {
      context.logger.warn(
        `Failed to save bundle: ${(bundleError as Error).message}`
      );
    }

    return {
      attributes: {
        query,
        papers,
        totalFound: totalCount,
        fetchedCount: papers.length,
        searchDate: new Date().toISOString(),
      },
      metadata: {
        source: "pubmed",
        recordCount: papers.length,
        processingTime: Date.now() - startTime,
        apiEndpoint: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/",
      },
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    const errorStack = (error as Error).stack;

    context.logger.error(`PubMed fetch failed: ${errorMessage}`);

    if (errorStack) {
      context.logger.debug(`Stack trace: ${errorStack}`);
    }

    // Log fetch-specific error details
    if ((error as any).cause) {
      context.logger.error(`Error cause: ${(error as any).cause}`);
    }

    throw new Error(`Failed to fetch from PubMed: ${errorMessage}`);
  }
}
