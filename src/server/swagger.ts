/**
 * Swagger UI Configuration for NXTG-Forge API
 * Serves interactive API documentation at /api/docs
 */

import { Router, Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

const router = Router();

// Cache the OpenAPI spec
let openApiSpec: object | null = null;

/**
 * Load OpenAPI spec from YAML file
 */
function loadOpenApiSpec(): object {
  if (openApiSpec) return openApiSpec;

  const specPath = path.join(process.cwd(), "docs/api/openapi.yaml");

  if (!fs.existsSync(specPath)) {
    throw new Error(`OpenAPI spec not found at ${specPath}`);
  }

  const specContent = fs.readFileSync(specPath, "utf-8");
  openApiSpec = yaml.load(specContent) as object;
  return openApiSpec;
}

/**
 * Serve OpenAPI spec as JSON
 */
router.get("/api/docs/openapi.json", (_req: Request, res: Response) => {
  try {
    const spec = loadOpenApiSpec();
    res.json(spec);
  } catch (error) {
    res.status(500).json({
      error: "Failed to load OpenAPI spec",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Serve OpenAPI spec as YAML
 */
router.get("/api/docs/openapi.yaml", (_req: Request, res: Response) => {
  try {
    const specPath = path.join(process.cwd(), "docs/api/openapi.yaml");
    if (!fs.existsSync(specPath)) {
      return res.status(404).json({ error: "OpenAPI spec not found" });
    }
    res.type("text/yaml").sendFile(specPath);
  } catch (error) {
    res.status(500).json({
      error: "Failed to load OpenAPI spec",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Serve Swagger UI HTML page
 */
router.get("/api/docs", (_req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NXTG-Forge API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #1a1a2e;
    }
    .swagger-ui {
      max-width: 1200px;
      margin: 0 auto;
    }
    .swagger-ui .topbar {
      background: #16213e;
      padding: 10px 0;
    }
    .swagger-ui .topbar .wrapper {
      padding: 0 20px;
    }
    .swagger-ui .topbar-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .swagger-ui .topbar-wrapper .link {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .swagger-ui .topbar-wrapper .link img {
      display: none;
    }
    .swagger-ui .topbar-wrapper .link::before {
      content: "NXTG-Forge API";
      font-size: 24px;
      font-weight: bold;
      color: #00d4ff;
    }
    .swagger-ui .info .title {
      color: #e94560 !important;
    }
    .swagger-ui .opblock-tag {
      color: #00d4ff !important;
      border-bottom-color: #16213e !important;
    }
    .swagger-ui .opblock.opblock-get {
      border-color: #61affe;
      background: rgba(97, 175, 254, 0.1);
    }
    .swagger-ui .opblock.opblock-post {
      border-color: #49cc90;
      background: rgba(73, 204, 144, 0.1);
    }
    .swagger-ui .opblock.opblock-put {
      border-color: #fca130;
      background: rgba(252, 161, 48, 0.1);
    }
    .swagger-ui .opblock.opblock-delete {
      border-color: #f93e3e;
      background: rgba(249, 62, 62, 0.1);
    }
    .swagger-ui .opblock.opblock-patch {
      border-color: #50e3c2;
      background: rgba(80, 227, 194, 0.1);
    }
    .swagger-ui .btn.execute {
      background: #e94560;
      border-color: #e94560;
    }
    .swagger-ui .btn.execute:hover {
      background: #ff6b6b;
      border-color: #ff6b6b;
    }
    .swagger-ui section.models {
      border-color: #16213e;
    }
    .swagger-ui section.models h4 {
      color: #00d4ff !important;
    }
    .custom-header {
      background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
      padding: 20px;
      text-align: center;
      border-bottom: 2px solid #e94560;
    }
    .custom-header h1 {
      margin: 0;
      color: #00d4ff;
      font-size: 28px;
    }
    .custom-header p {
      margin: 10px 0 0 0;
      color: #a0a0a0;
    }
    .custom-header .version {
      display: inline-block;
      background: #e94560;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="custom-header">
    <h1>🔥 NXTG-Forge API</h1>
    <p>AI-Orchestrated Development System</p>
    <span class="version">v3.0.0</span>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/api/docs/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2,
        docExpansion: "list",
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true
      });
    };
  </script>
</body>
</html>
`;
  res.type("html").send(html);
});

/**
 * Redirect /docs to /api/docs
 */
router.get("/docs", (_req: Request, res: Response) => {
  res.redirect("/api/docs");
});

export default router;
