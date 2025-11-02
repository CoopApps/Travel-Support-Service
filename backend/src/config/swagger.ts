/**
 * Swagger/OpenAPI Configuration
 *
 * Generates interactive API documentation
 * Access at: http://localhost:3001/api-docs
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Travel Support API',
      version: '1.0.0',
      description: 'Multi-tenant travel support system for managing accessible transportation services',
      contact: {
        name: 'API Support',
        email: 'support@travelsupport.com',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://staging.travelsupport.com',
        description: 'Staging server',
      },
      {
        url: 'https://api.travelsupport.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/tenants/{tenantId}/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Invalid input data',
                },
                details: {
                  type: 'object',
                  additionalProperties: true,
                },
                statusCode: {
                  type: 'integer',
                  example: 400,
                },
              },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              additionalProperties: true,
            },
            meta: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  example: 100,
                },
                page: {
                  type: 'integer',
                  example: 1,
                },
                limit: {
                  type: 'integer',
                  example: 20,
                },
                totalPages: {
                  type: 'integer',
                  example: 5,
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                },
              },
            },
          },
        },
        Customer: {
          type: 'object',
          required: ['name', 'tenant_id'],
          properties: {
            customer_id: {
              type: 'integer',
              description: 'Unique customer ID',
              example: 1,
            },
            tenant_id: {
              type: 'integer',
              description: 'Tenant ID',
              example: 2,
            },
            name: {
              type: 'string',
              description: 'Customer full name',
              example: 'John Smith',
              maxLength: 200,
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Customer email address',
              example: 'john.smith@example.com',
            },
            phone: {
              type: 'string',
              description: 'Customer phone number',
              example: '+44 20 1234 5678',
            },
            address: {
              type: 'string',
              description: 'Customer address',
              example: '123 High Street, Sheffield, S1 1AB',
            },
            is_active: {
              type: 'boolean',
              description: 'Whether the customer is active',
              example: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Driver: {
          type: 'object',
          required: ['name', 'tenant_id'],
          properties: {
            driver_id: {
              type: 'integer',
              description: 'Unique driver ID',
              example: 1,
            },
            tenant_id: {
              type: 'integer',
              description: 'Tenant ID',
              example: 2,
            },
            name: {
              type: 'string',
              description: 'Driver full name',
              example: 'Jane Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Driver email address',
              example: 'jane.doe@example.com',
            },
            phone: {
              type: 'string',
              description: 'Driver phone number',
              example: '+44 20 9876 5432',
            },
            license_number: {
              type: 'string',
              description: 'Driving license number',
              example: 'SMITH123456AB789',
            },
            license_expiry: {
              type: 'string',
              format: 'date',
              description: 'License expiry date',
              example: '2027-12-31',
            },
            is_active: {
              type: 'boolean',
              description: 'Whether the driver is active',
              example: true,
            },
          },
        },
        Vehicle: {
          type: 'object',
          required: ['registration', 'tenant_id'],
          properties: {
            vehicle_id: {
              type: 'integer',
              description: 'Unique vehicle ID',
              example: 1,
            },
            tenant_id: {
              type: 'integer',
              description: 'Tenant ID',
              example: 2,
            },
            registration: {
              type: 'string',
              description: 'Vehicle registration number',
              example: 'AB12 CDE',
            },
            make: {
              type: 'string',
              description: 'Vehicle manufacturer',
              example: 'Ford',
            },
            model: {
              type: 'string',
              description: 'Vehicle model',
              example: 'Transit',
            },
            year: {
              type: 'integer',
              description: 'Vehicle year',
              example: 2022,
            },
            vehicle_type: {
              type: 'string',
              description: 'Type of vehicle',
              example: 'Van',
            },
            wheelchair_accessible: {
              type: 'boolean',
              description: 'Whether the vehicle is wheelchair accessible',
              example: true,
            },
            is_active: {
              type: 'boolean',
              description: 'Whether the vehicle is active',
              example: true,
            },
          },
        },
        Trip: {
          type: 'object',
          required: ['tenant_id', 'customer_id', 'trip_date'],
          properties: {
            trip_id: {
              type: 'integer',
              description: 'Unique trip ID',
              example: 1,
            },
            tenant_id: {
              type: 'integer',
              description: 'Tenant ID',
              example: 2,
            },
            customer_id: {
              type: 'integer',
              description: 'Customer ID',
              example: 5,
            },
            driver_id: {
              type: 'integer',
              description: 'Assigned driver ID',
              example: 3,
              nullable: true,
            },
            vehicle_id: {
              type: 'integer',
              description: 'Assigned vehicle ID',
              example: 7,
              nullable: true,
            },
            trip_date: {
              type: 'string',
              format: 'date',
              description: 'Date of the trip',
              example: '2025-01-15',
            },
            pickup_time: {
              type: 'string',
              format: 'time',
              description: 'Pickup time',
              example: '09:30:00',
            },
            pickup_location: {
              type: 'string',
              description: 'Pickup location name',
              example: 'Home',
            },
            pickup_address: {
              type: 'string',
              description: 'Pickup address',
              example: '123 High Street, Sheffield, S1 1AB',
            },
            destination: {
              type: 'string',
              description: 'Destination name',
              example: 'Hospital',
            },
            destination_address: {
              type: 'string',
              description: 'Destination address',
              example: 'Northern General Hospital, Sheffield, S5 7AU',
            },
            status: {
              type: 'string',
              enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'],
              description: 'Trip status',
              example: 'scheduled',
            },
            price: {
              type: 'number',
              format: 'decimal',
              description: 'Trip price',
              example: 25.50,
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              description: 'Username',
              example: 'admin',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Password',
              example: 'admin123',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 20 },
                username: { type: 'string', example: 'admin' },
                email: { type: 'string', example: 'admin@example.com' },
                role: { type: 'string', example: 'admin' },
                tenantId: { type: 'integer', example: 2 },
              },
            },
          },
        },
      },
      parameters: {
        tenantId: {
          name: 'tenantId',
          in: 'path',
          required: true,
          schema: {
            type: 'integer',
            example: 2,
          },
          description: 'Tenant ID',
        },
        page: {
          name: 'page',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
          description: 'Page number for pagination',
        },
        limit: {
          name: 'limit',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
          description: 'Number of items per page',
        },
      },
      responses: {
        Unauthorized: {
          description: 'Unauthorized - Invalid or missing authentication token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required',
                  statusCode: 401,
                },
              },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions',
                  statusCode: 403,
                },
              },
            },
          },
        },
        NotFound: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                  statusCode: 404,
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation Error - Invalid request data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Validation failed',
                  details: {
                    email: 'Invalid email format',
                  },
                  statusCode: 400,
                },
              },
            },
          },
        },
        RateLimitExceeded: {
          description: 'Too Many Requests - Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  message: 'Too many requests, please try again later',
                  statusCode: 429,
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication and authorization endpoints',
      },
      {
        name: 'Customers',
        description: 'Customer management operations',
      },
      {
        name: 'Drivers',
        description: 'Driver management operations',
      },
      {
        name: 'Vehicles',
        description: 'Vehicle management operations',
      },
      {
        name: 'Trips',
        description: 'Trip scheduling and management',
      },
      {
        name: 'Dashboard',
        description: 'Dashboard and statistics',
      },
      {
        name: 'Invoices',
        description: 'Invoice generation and management',
      },
      {
        name: 'Health',
        description: 'Health check and monitoring',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/*.js'], // Path to route files
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger documentation
 */
export function setupSwagger(app: Application): void {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Travel Support API Documentation',
    customfavIcon: '/favicon.ico',
  }));

  // Swagger JSON
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 API Documentation available at: http://localhost:3001/api-docs');
}

export default swaggerSpec;
