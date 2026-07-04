/**
 * routes/search.ts
 */
import { Router, Request, Response } from "express";
import { getPool } from "../db";

const router = Router();

router.get("/api/search", async (req: Request, res: Response) => {
  const q = String(req.query.q ?? "").trim();
  if (!q || q.length < 2) {
    return res
      .status(400)
      .json({ success: false, error: "Query must be at least 2 characters" });
  }

  try {
    const pool = getPool();

    // We added 'markdown' to the SELECT so we can scan it in Node.js
    const result = await pool.query(
      `SELECT
         date::text as date,
         TO_CHAR(date, 'Month DD, YYYY') AS "dateHuman",
         markdown,
         ts_headline('english', markdown, plainto_tsquery('english', $1),
           'MaxWords=35, MinWords=15, StartSel=<mark>, StopSel=</mark>') AS excerpt
       FROM digests
       WHERE to_tsvector('english', markdown) @@ plainto_tsquery('english', $1)
       ORDER BY date DESC LIMIT 20`,
      [q],
    );

    // Calculate the nearest heading for Deep Linking
    const data = result.rows.map((row) => {
      let sectionHash = "";
      const lowerMd = row.markdown.toLowerCase();
      const lowerQ = q.toLowerCase();

      // Find roughly where the search term appears in the full document
      const matchIdx = lowerMd.indexOf(lowerQ);

      if (matchIdx !== -1) {
        // Grab everything BEFORE the match
        const beforeMatch = row.markdown.substring(0, matchIdx);

        // Find all Markdown headings (## Heading) before the match
        const headingRegex = /##\s+([^\n]+)/g;
        let lastHeading = "";
        let match;

        while ((match = headingRegex.exec(beforeMatch)) !== null) {
          lastHeading = match[1]; // Keep overwriting to get the final one closest to the text
        }

        if (lastHeading) {
          // Convert "Global News" to "#global-news" to match your slugify function
          sectionHash =
            "#" +
            lastHeading
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-");
        }
      }

      // Delete the massive raw markdown string so we don't clog up the network payload
      delete row.markdown;

      return { ...row, sectionHash };
    });

    return res.json({ success: true, data });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: (err as Error).message });
  }
});

export default router;
