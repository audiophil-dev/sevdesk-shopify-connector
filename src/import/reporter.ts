import * as fs from 'fs';
import * as path from 'path';

import { ImportReport, ImportResult } from './types';

/**
 * Generate JSON and Markdown reports for order import results.
 */
export async function generateJsonReport(results: ImportResult[], outputPath: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const filePath = path.join(outputPath, `import-results-${timestamp}.json`);
  
  const report: ImportReport = {
    results,
    duration: 0,
    timestamp,
  };

  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  console.log(`[reporter] JSON report saved: ${filePath}`);
}

export async function generateMarkdownReport(results: ImportResult[], outputPath: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const filePath = path.join(outputPath, `import-results-${timestamp}.md`);
  
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  const skippedCount = results.filter(r => r.error === 'Skipped' || r.orderId === 'N/A').length;

  // Build failed orders table
  let markdown = `# Order Import Report\n\n`;
  markdown += `**Generated**: ${timestamp}\n\n`;
  markdown += `## Summary\n\n`;
  markdown += `| Metric | Value |\n`;
  markdown += `|---|---|---| |\n`;
  markdown += `| Total Orders | ${results.length} |\n`;
  markdown += `| Success | ${successCount} |\n`;
  markdown += `| Failed | ${failedCount} |\n`;
  markdown += `| Skipped | ${skippedCount} |\n`;
  markdown += `| **\n`;
  markdown += `## Failed Orders\n\n`;
  markdown += `| Line | Order ID | Error |\n`;
  markdown += `|---|---|---|---| |\n`;

  for (const result of results.filter(r => !r.success && r.orderId !== 'N/A')) {
    markdown += `| ${result.line} | ${result.orderId} | ${result.error} |\n`;
  }

  if (failedCount > 0) {
    markdown += `\n`;
    markdown += `## Notes\n\n`;
    markdown += `- Total duration: ${results.reduce((sum, r) => sum + (r.duration || 0), 0)}s\n`;
    markdown += `- Check variant mapping before import\n`;
    markdown += `- Verify orders in Shopify admin\n`;
  }

  const filePath = path.join(outputPath, `import-results-${timestamp}.md`);
  fs.writeFileSync(filePath, markdown, 'utf-8');
  console.log(`[reporter] Markdown report saved: ${filePath}`);
}
