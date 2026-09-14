# Electricity Consumption & Carbon Emission Tracker

A simple full-stack SaaS application for organisations to record their monthly electricity consumption and calculate estimated carbon emissions.

The application allows organisations to:

- Add monthly electricity consumption records
- Automatically calculate estimated CO₂ emissions
- View, edit, and delete emission records
- View validated electricity and CO₂ totals
- Support multiple organisations with backend-enforced data isolation
- Support Client and Admin roles
- Allow Admin users to review and validate submitted records

## Carbon Emission Calculation

The application uses the following emission factor:

**Carbon Emission = Electricity Consumption × 0.82**

For example:

**10,000 kWh × 0.82 = 8,200 kg CO₂**

## Technology Stack

### Frontend

- Angular 19
- TypeScript
- HTML5
- CSS3
- Angular Reactive Forms
- Angular HttpClient

### Backend

- Node.js
- Express.js
- TypeScript
- REST APIs
- PostgreSQL client (`pg`)

### Database

- PostgreSQL 17

### Development Tools

- Git
- npm
- NVM

## Architecture

The application follows a simple three-layer architecture:

```text
Angular 19 Frontend
       |
       | HTTP / REST API
       v
Node.js + Express Backend
       |
       | SQL Queries
       v
PostgreSQL Database
Request Flow
Angular Component
       ↓
Angular Service
       ↓
REST API
       ↓
Express Controller
       ↓
PostgreSQL

The Angular component is responsible for the UI and user interactions.

The Angular service handles communication with the backend REST APIs.

The Node.js/Express backend handles:

Request validation
Role-based access control
Organization-level data isolation
CO₂ calculation
Database operations
API responses and error handling

PostgreSQL stores organizations and emission records.

Database

The application uses PostgreSQL with two main tables.

1. Organizations

Stores the organizations supported by the application.

Column	Type	Description
id	SERIAL PRIMARY KEY	Unique organization ID
name	VARCHAR(255)	Organization name
2. Emission Records

Stores monthly electricity consumption and calculated carbon emissions.

Column	Type	Description
id	SERIAL PRIMARY KEY	Unique emission record ID
organization_id	INTEGER	References the organization
month	DATE	Consumption month
electricity_consumption	NUMERIC(12,2)	Electricity consumption in kWh
emission_factor	NUMERIC(5,2)	Emission factor, default 0.82
co2_emission	NUMERIC(14,2)	Calculated CO₂ emission in kg
created_date	TIMESTAMP	Record creation timestamp
status	VARCHAR(20)	Pending, Validated, or Rejected
Relationship
Organizations
     |
     | 1
     |
     | N
     ↓
Emission Records

Each emission record belongs to one organization through organization_id.

A foreign key constraint maintains referential integrity between the two tables.

The database also enforces that electricity consumption must be greater than zero and that status must be one of Pending, Validated, or Rejected.

API Endpoints

Base URL:

http://localhost:3000/api/emissions
Method	Endpoint	Purpose
POST	/api/emissions	Create a new emission record
GET	/api/emissions	Retrieve emission records
GET	/api/emissions/totals?organizationId={organizationId}	Retrieve validated totals
PATCH	/api/emissions/:id	Update an emission record
DELETE	/api/emissions/:id	Delete an emission record
PATCH	/api/emissions/:id/status	Admin validates or rejects a record
Create Record
POST /api/emissions

The backend validates the request, determines the organization from the Client context, calculates CO₂ using the emission factor 0.82, and creates the record with status Pending.

Get Records
GET /api/emissions

Clients receive records belonging only to their organization. Admins can review records across organizations and optionally filter by organization.

Get Totals
GET /api/emissions/totals?organizationId={organizationId}

Returns electricity consumption and CO₂ totals based only on records with status Validated.

Update Record
PATCH /api/emissions/:id

Clients can update records belonging to their own organization. The CO₂ value is recalculated when electricity consumption is changed.

Delete Record
DELETE /api/emissions/:id

Clients can delete records belonging to their own organization.

Validate / Reject Record
PATCH /api/emissions/:id/status

Admin users can change a Pending record to either Validated or Rejected.

User Roles

The application supports two roles.

Client

A Client can:

Add new electricity consumption records
View records belonging to their organization
Edit their organization's records
Delete their organization's records

New records created by a Client are assigned the status:

Pending
Admin

An Admin can:

Review records across organizations
View Pending records
Validate records
Reject records

An Admin cannot edit or delete emission records through the current application workflow.

Validation Workflow
Client submits record
        ↓
     Pending
        ↓
   Admin Review
      /      \
     /        \
Validated    Rejected
    ↓
Included in Client totals

Only records with status Validated are included in the totals displayed to Clients.

Organization Data Isolation

The backend enforces organization-level data isolation.

For Client requests, the organization ID is taken from the user context rather than trusting an organization ID supplied in the request body.

For example, if a Client belongs to organization 1 and attempts to access or modify records belonging to organization 2, the backend does not allow the Client to operate on organization 2's data.

The same ownership checks are applied when viewing, updating, and deleting records.

The frontend organization selector is therefore only used to represent the current user context; it is not considered a security boundary.

Mock Authentication

A complete authentication system is outside the scope of this assignment.

For demonstration purposes, the application uses HTTP headers:

x-user-role
x-organization-id

The backend middleware converts these headers into a user context containing the user's role and organization.

In a production application, these values would come from a properly authenticated session or signed access token rather than being directly supplied by the client.

Setup & Installation
Prerequisites

Make sure the following are installed:

Node.js 22+
npm
Angular CLI 19
PostgreSQL 17
Git
1. Clone the Repository
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd emission-tracker
2. Database Setup

Make sure PostgreSQL is running.

Create the database:

createdb emission_tracker

Run the database schema:

psql -d emission_tracker -f backend/database/schema.sql

The schema creates the required tables, constraints, indexes, and sample organizations.

3. Backend Setup

Open a terminal and run:

cd backend
npm install

Create a .env file in the backend directory:

DB_HOST=localhost
DB_PORT=5432
DB_USER=<YOUR_POSTGRES_USER>
DB_PASSWORD=<YOUR_POSTGRES_PASSWORD>
DB_NAME=emission_tracker
PORT=3000

Start the backend:

npm run dev

The backend will run at:

http://localhost:3000

Health check:

http://localhost:3000/api/health
4. Frontend Setup

Open another terminal:

cd frontend
npm install
npm start

The Angular application will run at:

http://localhost:4200
5. Run the Application

Keep the following services running:

Angular Frontend → http://localhost:4200
Node.js Backend  → http://localhost:3000
PostgreSQL       → localhost:5432

Open the Angular application in a browser:

http://localhost:4200
Validation & Error Handling

The application performs validation at both the frontend and backend levels.

Frontend Validation

The Angular form validates:

Organization selection
Month
Electricity consumption
Electricity consumption must be greater than 0

The user receives a meaningful validation message before an API request is made.

Backend Validation

The Node.js backend validates incoming API requests before performing database operations.

It also verifies:

Required fields
Valid organization
Valid month
Positive electricity consumption
Valid record ID
Valid emission status
User role and organization permissions
API Errors

The API returns appropriate HTTP status codes and meaningful error messages for cases such as:

Invalid request
Unauthorized request
Forbidden operation
Record not found
Invalid organization
Database failure
User Feedback

The Angular application displays success and error messages after API operations such as:

Creating a record
Updating a record
Deleting a record
Validating or rejecting a record
Loading records or totals
Performance Considerations

The current application is intentionally simple, but the following approaches would help support millions of records.

Database Indexes

Indexes are created on commonly filtered columns:

organization_id
status
month
(organization_id, status)

These indexes help PostgreSQL locate relevant records efficiently instead of scanning the entire table.

Pagination

For a large number of records, the GET records API should support pagination using parameters such as:

?page=1&limit=50

The backend would return only the required page of records instead of loading all records at once.

Efficient Queries

The backend uses SQL queries that retrieve only the required data and joins the organization table when organization information is needed.

Totals are calculated by the backend using database aggregation rather than calculating them from all records in the Angular application.

Backend Filtering

Filtering is performed on the backend/database rather than downloading records for every organization and filtering them in the browser.

This also supports organization-level data isolation.

Avoiding Unnecessary API Calls

The Angular application uses an Angular service for API communication and loads records and validated totals from the backend.

For a larger production application, caching, smarter refresh strategies, and pagination could further reduce unnecessary network requests.

Assumptions
The emission factor is fixed at 0.82 as specified in the assignment.
Electricity consumption is recorded in kWh.
CO₂ emissions are stored in kg.
Each emission record belongs to exactly one organization.
New Client records start with Pending status.
Only Validated records are included in Client totals.
A complete authentication system is outside the scope of this assignment.
The role and organization selectors are used to demonstrate role-based behavior.
Security

The backend is responsible for enforcing authorization and organization-level data isolation.

Client requests are associated with an organization through the user context created by the backend middleware.

The backend does not trust an organization ID supplied in the request body when creating a Client record.

For operations on existing records, the backend verifies that the record belongs to the Client's organization before allowing the operation.

Admin-only operations such as validating or rejecting records are protected by role checks.

For a production application, the mock authentication mechanism would be replaced with a secure authentication and authorization solution using authenticated sessions or signed access tokens.

Additional production security improvements would include:

HTTPS/TLS
Secure authentication
Password/token protection
Rate limiting
Input sanitization
Security headers
Audit logging
Environment-based secret management
Future Improvements

If more development time were available, the application could be extended with:

Complete user authentication and authorization
Organization/user management
JWT or session-based authentication
Server-side pagination
Advanced filtering and searching
Dashboard with charts and trends
Monthly and yearly emission reports
Export to CSV/PDF
Automated tests
API documentation using OpenAPI/Swagger
Docker-based deployment
Production logging and monitoring
More configurable emission factors
Cloud deployment with managed PostgreSQL
Project Structure
emission-tracker/
│
├── backend/
│   ├── database/
│   │   └── schema.sql
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts
│   │   ├── controllers/
│   │   │   └── emission.controller.ts
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts
│   │   ├── routes/
│   │   │   └── emission.routes.ts
│   │   ├── types/
│   │   │   └── emission.types.ts
│   │   └── server.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── models/
│   │       │   └── emission.model.ts
│   │       ├── services/
│   │       │   └── emission.service.ts
│   │       ├── app.component.ts
│   │       ├── app.component.html
│   │       └── app.component.css
│   └── package.json
│
└── README.md
Conclusion

This project demonstrates a simple full-stack implementation using Angular, Node.js, Express, TypeScript, and PostgreSQL, with role-based behavior, organization-level data isolation, Admin validation, and backend-based carbon emission calculations.