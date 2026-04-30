import type { OpenRenderRun } from "@openrender/core";

export interface LocalReportViewModel {
  title: string;
  run: OpenRenderRun;
  sections: Array<{
    heading: string;
    body?: string;
    trustedHtml?: string;
  }>;
}

export function createReportJson(run: OpenRenderRun): string {
  return `${JSON.stringify(run, null, 2)}\n`;
}

export function createReportHtml(viewModel: LocalReportViewModel): string {
  const sections = viewModel.sections
    .map(
      (section) => `<section>
  <h2>${escapeHtml(section.heading)}</h2>
  ${section.trustedHtml ?? `<pre>${escapeHtml(section.body ?? "")}</pre>`}
</section>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(viewModel.title)}</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 32px; max-width: 960px; }
    h1, h2 { line-height: 1.2; }
    section { border-top: 1px solid #8884; padding: 20px 0; }
    pre { overflow: auto; padding: 12px; background: #8881; }
    .visual-overlay { margin: 0; }
    .visual-overlay svg { max-width: min(100%, 720px); height: auto; image-rendering: pixelated; background: #8881; }
    .visual-overlay figcaption { margin-top: 8px; color: #666; }
  </style>
</head>
<body>
  <h1>${escapeHtml(viewModel.title)}</h1>
  <p>Run: <code>${escapeHtml(viewModel.run.runId)}</code></p>
${sections}
</body>
</html>
`;
}

export function createPreviewHtml(input: { title: string; assetUrl?: string }): string {
  const asset = input.assetUrl
    ? `<img src="${escapeHtml(input.assetUrl)}" alt="Compiled asset preview">`
    : "<p>No asset URL available yet.</p>";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(input.title)}</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 32px; }
    .checker { display: inline-grid; padding: 24px; background:
      linear-gradient(45deg, #9994 25%, transparent 25%),
      linear-gradient(-45deg, #9994 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #9994 75%),
      linear-gradient(-45deg, transparent 75%, #9994 75%);
      background-size: 24px 24px; background-position: 0 0, 0 12px, 12px -12px, -12px 0;
    }
    img { image-rendering: pixelated; max-width: min(80vw, 640px); }
  </style>
</head>
<body>
  <h1>${escapeHtml(input.title)}</h1>
  <div class="checker">${asset}</div>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
