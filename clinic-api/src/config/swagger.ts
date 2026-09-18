import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { buildOpenApi } from './openapi';

export function setupSwagger(app: Express): void {
  const spec = buildOpenApi();
  app.get('/api-docs.json', (_req, res) => {
    res.json(spec);
  });
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'MediCare API Docs',
      swaggerOptions: { persistAuthorization: false },
    }),
  );
}
