# QMarket E-commerce API

Production-ready REST API for **QMarket**, an e-commerce system used by a Flutter customer app, Flutter web storefront, and an admin management interface.

The API handles product catalog management, authentication, carts, orders, coupons, reviews, Stripe payments, Cloudinary image uploads, OneSignal push notifications, and production monitoring.

## Live Services

- API: https://api.levanquang.com/
- Web storefront: https://shop.levanquang.com/
- Privacy policy: https://policy.levanquang.com/
- Deployment: Render
- Domain/DNS: Cloudflare
- Mobile app: Flutter app, store release in progress

## Highlights

- RESTful API built with Node.js, Express 5, and MongoDB.
- JWT authentication with access tokens, refresh tokens, hashed refresh-token storage, logout, and refresh-token rotation.
- Role-based authorization for user, admin, and superadmin access.
- Product catalog with categories, sub-categories, brands, variants, SKU-level stock, pricing, offer pricing, and Cloudinary image uploads.
- Cart and order flow with server-side price calculation and stock validation.
- COD and Stripe prepaid checkout support.
- Stripe PaymentIntent integration with signed webhook verification and idempotent stock decrement after payment success.
- Coupon system with fixed/percentage discounts, minimum purchase amount, status, expiry, and product/category applicability.
- Verified purchase review flow with rating summary aggregation.
- OneSignal push notifications for customer engagement.
- Production hardening with Helmet, CORS allowlist, compression, rate limiting, request IDs, centralized error responses, and Sentry monitoring.
- Jest and Supertest coverage for authentication, authorization, coupons, orders, payments, and production-critical behavior.

## Tech Stack

- Runtime: Node.js, Express.js
- Database: MongoDB, Mongoose
- Authentication: JWT, bcrypt
- Validation: Joi
- Payments: Stripe
- File upload: Multer, Cloudinary
- Notifications: OneSignal
- Monitoring: Sentry, Winston, Morgan
- Security: Helmet, CORS, express-rate-limit
- Testing: Jest, Supertest

## Project Structure

```txt
.
|-- app.js                         # Express app, global middleware, route mounting, error handling
|-- index.js                       # Server bootstrap
|-- instrument.js                  # Sentry setup and sensitive data sanitization
|-- uploadFile.js                  # Multer + Cloudinary upload configuration
|-- config/
|   `-- env.js                     # Environment validation and typed runtime config
|-- middleware/
|   |-- admin.js                   # Admin/superadmin authorization guard
|   |-- auth.js                    # JWT access-token authentication
|   |-- rateLimit.js               # API, auth, and payment rate limiters
|   |-- requestContext.js          # Request ID and Sentry request context
|   `-- validate.js                # Joi request-body validation middleware
|-- routes/                        # REST route definitions by resource
|   |-- user.js
|   |-- product.js
|   |-- order.js
|   |-- payment.js
|   |-- cart.js
|   |-- couponCode.js
|   |-- review.js
|   `-- ...
|-- controllers/                   # HTTP handlers and response formatting
|   |-- user.controller.js
|   |-- product.controller.js
|   |-- order.controller.js
|   |-- payment.controller.js
|   `-- ...
|-- services/                      # Business logic and database workflows
|   |-- user.service.js            # Auth, token rotation, profile, favorites
|   |-- product.service.js         # Product CRUD, SKU variants, image uploads
|   |-- order.service.js           # Order snapshots, stock transactions, coupons
|   |-- payment.service.js         # Stripe PaymentIntent and webhook handling
|   `-- ...
|-- model/                         # Mongoose schemas and indexes
|   |-- user.js
|   |-- product.js
|   |-- order.js
|   |-- cart.js
|   |-- couponCode.js
|   |-- review.js
|   `-- ...
|-- validators/                    # Joi schemas for request validation
|   |-- user.validator.js
|   |-- product.validator.js
|   |-- order.validator.js
|   |-- payment.validator.js
|   `-- ...
`-- tests/                         # Jest/Supertest test suites
    |-- auth.test.js
    |-- user.test.js
    |-- coupon.validator.test.js
    `-- production-critical.test.js
```

The repository follows a route-controller-service-model structure. Routes define the public HTTP surface, controllers handle request/response concerns, services contain business rules, and models define MongoDB persistence.

## Main Features

### Authentication and Users

- Register, login, logout, refresh token, and current-user profile.
- Password hashing with bcrypt.
- Access token and refresh token separation.
- Refresh tokens are stored as SHA-256 hashes in MongoDB.
- Users can manage address information and favorite products.
- Admin-only user listing.

### Catalog Management

- Public read access for categories, sub-categories, brands, variants, posters, and products.
- Admin-protected create, update, and delete operations.
- Product variants support SKU, attributes, variant images, active status, and stock per SKU.
- Delete safeguards prevent removing catalog entities that are still referenced by products.

### Cart and Orders

- Authenticated cart per user.
- Add, update, remove, and clear cart items.
- Variant-aware cart items with SKU, attributes, image, and price snapshot.
- Order creation uses authenticated user identity, not client-provided user IDs.
- Prices and totals are calculated server-side from product data.
- Stock is decremented transactionally for COD orders.

### Payments

- COD orders are created through `/orders`.
- Prepaid orders are created through `/payment/stripe`.
- Stripe PaymentIntent returns `client_secret`, ephemeral key, customer ID, publishable key, and order total for Flutter Stripe checkout.
- Stripe webhook validates signatures before processing.
- Successful payment marks the order as paid and decrements stock exactly once.
- Failed or canceled payment marks the order as cancelled.

### Coupons

- Admin CRUD for coupon codes.
- Supports fixed and percentage discounts.
- Supports expiry date, active/inactive status, minimum purchase amount, and applicability rules.
- Public coupon validation endpoint for checkout.

### Reviews

- Reviews are tied to delivered orders.
- Users can only review products they purchased.
- One review per user per product.
- Product review summary is refreshed after create, update, and delete.

### Observability and Security

- `/health` endpoint for service health.
- `/ready` endpoint for database readiness.
- Request ID propagation through `x-request-id`.
- Sentry error tracking with sensitive data redaction.
- Rate limits for general API, auth endpoints, and payment endpoints.
- Production CORS allowlist.
- Helmet security headers and response compression.

## API Overview

Base URL:

```txt
https://api.levanquang.com
```

Local URL:

```txt
http://localhost:3000
```

Common response shape:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

Error response shape:

```json
{
  "success": false,
  "requestId": "request-id",
  "message": "Error message"
}
```

Authenticated endpoints require:

```txt
Authorization: Bearer <accessToken>
```

### Core Endpoints

| Area | Method | Endpoint | Access |
| --- | --- | --- | --- |
| Health | GET | `/health` | Public |
| Readiness | GET | `/ready` | Public |
| Auth | POST | `/users/register` | Public |
| Auth | POST | `/users/login` | Public |
| Auth | POST | `/users/refresh-token` | Public |
| Auth | POST | `/users/logout` | User |
| Users | GET | `/users/me` | User |
| Users | PUT | `/users/me/address` | User |
| Users | GET | `/users` | Admin |
| Favorites | GET | `/users/favorites` | User |
| Favorites | POST | `/users/favorite` | User |
| Categories | GET | `/categories` | Public |
| Categories | POST/PUT/DELETE | `/categories` | Admin |
| Sub-categories | GET | `/subCategories` | Public |
| Sub-categories | POST/PUT/DELETE | `/subCategories` | Admin |
| Brands | GET | `/brands` | Public |
| Brands | POST/PUT/DELETE | `/brands` | Admin |
| Variant types | GET | `/variantTypes` | Public |
| Variant types | POST/PUT/DELETE | `/variantTypes` | Admin |
| Variants | GET | `/variants` | Public |
| Variants | POST/PUT/DELETE | `/variants` | Admin |
| Products | GET | `/products` | Public |
| Products | POST/PUT/DELETE | `/products` | Admin |
| Posters | GET | `/posters` | Public |
| Posters | POST/PUT/DELETE | `/posters` | Admin |
| Cart | GET | `/cart` | User |
| Cart | POST | `/cart/items` | User |
| Cart | PUT | `/cart/items` | User |
| Cart | DELETE | `/cart/items` | User |
| Cart | DELETE | `/cart/clear` | User |
| Coupons | GET/POST/PUT/DELETE | `/couponCodes` | Admin |
| Coupons | POST | `/couponCodes/check-coupon` | Public |
| Orders | GET | `/orders` | Admin |
| Orders | GET | `/orders/orderByUserId/:userId` | Owner/Admin |
| Orders | GET | `/orders/:id` | Owner/Admin |
| Orders | POST | `/orders` | User |
| Orders | PUT/DELETE | `/orders/:id` | Admin |
| Payments | POST | `/payment/stripe` | User |
| Payments | POST | `/payment/webhook` | Stripe |
| Reviews | GET | `/reviews/product/:productId` | Public |
| Reviews | POST | `/reviews/product/:productId` | User |
| Reviews | PUT/DELETE | `/reviews/:id` | Owner |
| Notifications | POST | `/notification/send-notification` | Admin |
| Notifications | GET | `/notification/all-notification` | Admin |
| Notifications | GET | `/notification/track-notification/:id` | Admin |
| Notifications | DELETE | `/notification/delete-notification/:id` | Admin |

## Getting Started

### Prerequisites

- Node.js 20+ recommended
- npm
- MongoDB database
- Stripe account for prepaid checkout
- Cloudinary account for image upload
- OneSignal account for push notifications
- Sentry project for production monitoring

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=3000
MONGO_URL=mongodb+srv://...

ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ACCESS_TOKEN_EXPIRES_IN=2m
REFRESH_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_MAX_AGE=24h

CORS_ORIGINS=http://localhost:3000,https://shop.levanquang.com

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
AUTH_RATE_LIMIT_MAX=100
PAYMENT_RATE_LIMIT_MAX=100

STRIPE_SKRT_KET_TST=sk_test_or_live_key
STRIPE_PBLK_KET_TST=pk_test_or_live_key
STRIPE_WEBHOOK_SECRET=whsec_...

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

ONE_SIGNAL_APP_ID=your_app_id
ONE_SIGNAL_REST_API_KEY=your_rest_api_key

SENTRY_DSN=https://...
SENTRY_RELEASE=store_api@1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0
SENTRY_SEND_DEFAULT_PII=false
```

Notes:

- `MONGO_URL` and `ACCESS_TOKEN_SECRET` are required.
- In production, Stripe, Cloudinary, and OneSignal variables are required.
- `ACCESS_TOKEN_SECRET` should be at least 32 characters in production.
- `CORS_ORIGINS` accepts a comma-separated allowlist.

### Run Locally

```bash
npm start
```

The server listens on:

```txt
http://localhost:3000
```

Check service status:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

### Run Tests

```bash
npm run test:ci
```

For watch mode:

```bash
npm test
```

The test suite covers authentication, authorization, coupon validation, order creation, Stripe webhook behavior, and production-critical API flows.

## Deployment Notes

This API is deployed on Render and uses Cloudflare-managed domains.

Production checklist:

- Set `NODE_ENV=production`.
- Configure production MongoDB connection.
- Configure production CORS origins.
- Configure Stripe webhook endpoint: `/payment/webhook`.
- Configure Cloudinary credentials.
- Configure OneSignal credentials.
- Configure Sentry DSN and release metadata.
- Use strong JWT secrets.
- Verify `/health` and `/ready` after deployment.

## Author

Le Van Quang

- Email: levanquang27122005@gmail.com
- API: https://api.levanquang.com/
- Storefront: https://shop.levanquang.com/
- Privacy Policy: https://policy.levanquang.com/

## Project Status

The backend API and Flutter web storefront are currently deployed. The Flutter mobile app is being prepared for app store release.
