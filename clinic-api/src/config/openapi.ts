import { ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { apiRouters } from '../routes';
import { env } from './env';
import { endpointDocs, exampleId, responseExample } from './openapi.examples';

// Avoid expanding the converter's recursive generic against every route's Zod type.
const toSchema = zodToJsonSchema as unknown as (schema: ZodSchema, options: { target: string; $refStrategy: string }) => Schema;

type Schema = {
  type?: string | string[];
  format?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  enum?: unknown[];
  default?: unknown;
  anyOf?: Schema[];
  allOf?: Schema[];
  minimum?: number;
  minLength?: number;
  [key: string]: unknown;
};
type Handler = {
  validation?: { schema: ZodSchema; target: string };
  roles?: string[];
  authentication?: boolean;
};
type Layer = {
  handle: Handler;
  route?: { path: string; methods: Record<string, boolean>; stack: Layer[] };
};

export function registeredOperations(): Array<{
  method: string;
  path: string;
  handlers: Handler[];
}> {
  const operations = [];
  for (const [prefix, router] of Object.entries(apiRouters)) {
    const common: Handler[] = [];
    for (const layer of router.stack as Layer[]) {
      if (!layer.route) {
        common.push(layer.handle);
        continue;
      }
      for (const method of Object.keys(layer.route.methods)) {
        const path = `/${prefix}${layer.route.path === '/' ? '' : layer.route.path}`.replace(
          /:([A-Za-z]+)/g,
          '{$1}',
        );
        operations.push({
          method,
          path,
          handlers: [...common, ...layer.route.stack.map((item) => item.handle)],
        });
      }
    }
  }
  return operations;
}

const namedValues: Record<string, unknown> = {
  email: 'patient@medicare.vn',
  password: 'Patient@123',
  currentPassword: 'Patient@123',
  newPassword: 'NewPatient@456',
  confirmPassword: 'NewPatient@456',
  refreshToken: 'eyJ...refresh.signature',
  fullName: 'Nguyen Van An',
  phone: '0912345678',
  emergencyContactPhone: '0987654321',
  dateOfBirth: '1990-05-15',
  idCardNumber: '001090012345',
  appointmentTime: '08:00',
  newTime: '09:00',
  startTime: '08:00',
  endTime: '08:30',
  shiftStartTime: '08:00',
  shiftEndTime: '11:00',
  bloodPressure: '120/80',
  weight: 60,
  height: 165,
  heartRate: 80,
  temperature: 37,
  spo2: 98,
  respiratoryRate: 18,
  consultationFee: 200000,
  fee: 150000,
  price: 1000,
  unitPrice: 1000,
  diagnosis: 'Chan doan mau',
  chiefComplaint: 'Trieu chung mau',
  result: 'Ket qua mau',
  conclusion: 'Ket luan mau',
  bookingCode: 'PKB-DEMO',
  quantity: 10,
  morningDose: 1,
  noonDose: 0,
  afternoonDose: 0,
  eveningDose: 1,
};

function sample(schema: Schema, key = ''): unknown {
  if (schema.default !== undefined) return schema.default;
  if (schema.enum) return schema.enum[0];
  if (schema.anyOf) return sample(schema.anyOf[0], key);
  if (schema.allOf) return Object.assign({}, ...schema.allOf.map((item) => sample(item, key)));
  if (schema.type === 'object')
    return Object.fromEntries(
      Object.entries(schema.properties || {}).map(([name, value]) => [name, sample(value, name)]),
    );
  if (schema.type === 'array') return [sample(schema.items || {}, key)];
  if (schema.format === 'uuid' || /Id$/.test(key)) return exampleId;
  if (schema.format === 'uri') return 'https://example.test/result.pdf';
  if (namedValues[key] !== undefined) return namedValues[key];
  if (/date|^from$|^to$/i.test(key)) return '2026-09-17';
  if (schema.type === 'number' || schema.type === 'integer') return schema.minimum || 1;
  if (schema.type === 'boolean') return true;
  return 'Example'.padEnd(schema.minLength || 0, 'x');
}

export function exampleSchema(value: unknown): Schema {
  if (value === null) return { nullable: true, example: null };
  if (Array.isArray(value))
    return { type: 'array', items: value.length ? exampleSchema(value[0]) : {} };
  if (typeof value === 'object')
    return {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          exampleSchema(item),
        ]),
      ),
    };
  return { type: typeof value === 'number' ? 'number' : typeof value, example: value };
}

export function buildOpenApi(): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const operation of registeredOperations()) {
    const { method, path, handlers } = operation;
    const key = `${method.toUpperCase()} ${path.replace(/^\/billing/, '/invoices')}`;
    const entry = endpointDocs[key];
    if (!entry) throw new Error(`Missing OpenAPI response contract: ${key}`);
    const validations = handlers.flatMap((handler) =>
      handler.validation ? [handler.validation] : [],
    );
    const guards = handlers.flatMap((handler) => (handler.roles ? [handler.roles] : []));
    const parameters: unknown[] = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => ({
      name: match[1],
      in: 'path',
      required: true,
      schema: {
        type: 'string',
        ...(match[1] === 'bookingCode' ? { maxLength: 50 } : { format: 'uuid' }),
      },
      example: match[1] === 'bookingCode' ? 'PKB-DEMO' : exampleId,
    }));
    let requestBody: unknown;
    for (const validation of validations) {
      const schema = toSchema(validation.schema, {
        target: 'openApi3',
        $refStrategy: 'none',
      }) as Schema;
      const example = sample(schema);
      if (validation.target === 'body') {
        requestBody = {
          required: true,
          description:
            'JSON theo schema runtime; ngay hop le, mang toi da 100 phan tu, chuoi toi da 10000 ky tu.',
          content: { 'application/json': { schema, example } },
        };
      } else if (validation.target === 'query') {
        for (const [name, property] of Object.entries(schema.properties || {})) {
          parameters.push({
            name,
            in: 'query',
            required: schema.required?.includes(name) || false,
            schema: property,
            example: sample(property, name),
          });
        }
      }
    }
    const example = responseExample(entry);
    let content: Record<string, unknown> = {
      'application/json': { schema: exampleSchema(example), example },
    };
    if (path.endsWith('/print'))
      content = {
        'application/pdf': {
          schema: { type: 'string', format: 'binary' },
          description: 'PDF Unicode da thanh toan',
        },
        'text/plain': {
          schema: { type: 'string' },
          example: 'MEDICARE\nHD-DEMO\nTong cong: 360.000 VND\nPAID',
        },
      };
    if (path.endsWith('/events'))
      content = {
        'text/event-stream': {
          schema: { type: 'string' },
          example: 'event: pharmacy.queue.changed\ndata: {"revision":"abc123"}\n\n',
        },
      };
    const responses: Record<string, unknown> = {
      [entry.status || 200]: { description: entry.summary, content },
    };
    for (const [status, message] of Object.entries({
      400: 'Yeu cau / chuyen trang thai khong hop le',
      401: 'Chua dang nhap / JWT khong hop le',
      403: 'Khong co quyen truy cap',
      404: 'Khong tim thay',
      409: 'Trung du lieu / vi pham rang buoc',
      413: 'Body vuot 1MB',
      422: 'Validation that bai',
      429: 'Qua nhieu yeu cau',
      500: 'Loi he thong',
    })) {
      const error = {
        success: false,
        message,
        ...(status === '422' ? { errors: [{ field: 'id', message: 'UUID khong hop le' }] } : {}),
      };
      responses[status] = {
        description: message,
        content: { 'application/json': { schema: exampleSchema(error), example: error } },
      };
    }
    const publicRoute =
      (path.startsWith('/doctors') && method === 'get') ||
      ['/auth/login', '/auth/register', '/auth/refresh'].includes(path);
    paths[`${env.API_PREFIX}${path}`] ||= {};
    paths[`${env.API_PREFIX}${path}`][method] = {
      operationId: `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
      tags: [path.split('/')[1]],
      summary: entry.summary,
      description: `${entry.description || entry.summary}. ${guards.length ? `Roles (moi nhom phai thoa): ${guards.map((group) => group.join(', ')).join(' AND ')}.` : publicRoute ? 'Cong khai.' : 'Yeu cau JWT.'} Benh nhan chi xem ho so cua minh; bac si chi thao tac ca duoc phan cong. Mau dung ID gia dinh; thay bang ID thuc te.`,
      security: publicRoute ? [] : [{ BearerAuth: [] }],
      parameters,
      ...(requestBody ? { requestBody } : {}),
      responses,
      ...(path.startsWith('/billing') ? { deprecated: true } : {}),
    };
  }
  paths['/health'] = {
    get: {
      operationId: 'health',
      tags: ['System'],
      summary: 'Trang thai tien trinh API',
      security: [],
      responses: {
        200: {
          description: 'Process running',
          content: {
            'application/json': {
              example: {
                status: 'ok',
                service: 'MediCare Clinic API',
                version: '1.0.0',
                timestamp: '2026-09-17T02:00:00.000Z',
                environment: 'development',
              },
            },
          },
        },
      },
    },
  };
  return {
    openapi: '3.0.3',
    info: {
      title: 'MediCare Clinic API',
      version: '1.1.0',
      description:
        'Tai lieu sinh tu cac route va schema Zod. Tien te VND; ngay bao cao theo Asia/Ho_Chi_Minh. Hoa don in la phieu noi bo, chua tich hop chu ky so / co quan thue.',
    },
    servers: [{ url: '/' }],
    components: {
      securitySchemes: { BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
    paths,
  };
}
