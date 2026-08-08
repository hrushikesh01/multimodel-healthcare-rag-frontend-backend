# ClinicalAssist RAG --- Multimodal Healthcare RAG Platform

> **AI-Powered Healthcare Intelligence & Patient Management**

ClinicalAssist RAG is a modern healthcare platform that combines
**Retrieval-Augmented Generation (RAG)**, **multimodal medical data**,
and **strict Role-Based Access Control (RBAC)** to provide an
intelligent and secure interface for clinical workflows.

The platform is designed to help doctors, nurses, patients, and
administrators securely manage patient information, analyze medical
history, upload clinical documents/images, and interact with an AI
assistant grounded in patient-specific records.

------------------------------------------------------------------------

## 🩺 Overview

ClinicalAssist RAG combines a **React-based frontend** with an
asynchronous **FastAPI backend**, **PostgreSQL**, and an LLM-powered RAG
pipeline.

The system is designed around healthcare data access and traceability,
with dedicated models and services for:

-   Patient management
-   User authentication and authorization
-   Role-based patient access
-   Medical documents and images
-   Document ingestion and chunking
-   Context-aware AI conversations
-   Patient consent management
-   Audit logging
-   Multimodal healthcare data
-   Secure API communication

> **Note:** This project is intended for demonstration and development
> purposes. It should not be considered a production-ready
> HIPAA-compliant healthcare system without appropriate security,
> privacy, infrastructure, legal, and clinical validation.

------------------------------------------------------------------------

## ✨ Key Features

### 🧠 AI-Powered RAG Assistant

-   Query patient records using natural language.
-   Retrieve relevant information from uploaded clinical documents.
-   Generate context-aware responses using LLMs.
-   Support for multimodal healthcare data.
-   Groq and OpenRouter integration with fallback/load-balancing
    capabilities.

### 🔐 Secure RBAC

Granular access control for different healthcare roles:

-   **Admin**
-   **Doctor**
-   **Nurse**
-   **Patient**

Access to patient information is controlled through dedicated
authorization and patient-access relationships.

### 👤 Patient Management

-   Patient registry
-   Patient profile management
-   Medical history access
-   Patient-specific document management
-   Patient access control
-   Consent management

### 📁 Medical Document & Image Management

-   Upload clinical documents.
-   Process and ingest document content.
-   Store document chunks for RAG retrieval.
-   Support medical image assets.
-   Local file persistence through the `uploads/` directory.

Supported document parsing includes:

-   PDF --- `PyPDF2`
-   DOCX --- `python-docx`

### 📋 Audit Logging

The backend includes middleware-driven auditing for tracking API
activity and data access.

Audit functionality is designed to provide traceability for:

-   Patient data reads
-   Patient data modifications
-   API requests
-   Database-related operations
-   User activity

### 🌓 Modern Clinical Interface

The frontend provides:

-   Dark / Light mode
-   High-contrast accessibility-focused UI
-   Responsive layouts
-   Clinical dashboard workflows
-   Interactive charts and analytics
-   Smooth Framer Motion animations

------------------------------------------------------------------------

# 🏗️ System Architecture

``` text
┌───────────────────────────────────────────────┐
│              ClinicalAssist RAG               │
├───────────────────────────────────────────────┤
│                                               │
│  React 19 + Vite + Tailwind CSS              │
│                 │                             │
│                 │ Axios + JWT                 │
│                 ▼                             │
│        FastAPI REST API Backend              │
│                 │                             │
│       ┌─────────┼─────────┐                  │
│       │         │         │                  │
│       ▼         ▼         ▼                  │
│   PostgreSQL   RAG      File Storage         │
│               Pipeline    uploads/            │
│                 │                             │
│                 ▼                             │
│        Vector Store / Retrieval              │
│                 │                             │
│                 ▼                             │
│       Groq / OpenRouter LLMs                 │
│                                               │
└───────────────────────────────────────────────┘
```

------------------------------------------------------------------------

# 🧰 Technology Stack

## Backend

  Technology          Purpose
  ------------------- -----------------------------------
  Python              Backend programming language
  FastAPI             Asynchronous REST API framework
  PostgreSQL          Relational database
  SQLAlchemy 2.x      ORM and database access
  Pydantic v2         Data validation and serialization
  pydantic-settings   Environment configuration
  JWT                 Authentication
  Passlib + bcrypt    Secure password hashing
  python-multipart    Multipart/file uploads
  aiofiles            Asynchronous file handling
  PyPDF2              PDF parsing
  python-docx         DOCX parsing
  Groq                LLM integration
  OpenRouter          LLM fallback/load balancing
  Vector Store        RAG retrieval abstraction

## Frontend

  Technology      Purpose
  --------------- ------------------------------
  React 19        Frontend framework
  Vite 6          Development/build tooling
  Tailwind CSS    UI styling
  Framer Motion   Animations
  Axios           API communication
  Context API     Application state management
  Recharts        Analytics and charts

------------------------------------------------------------------------

# 📂 Project Structure

``` text
clinicalassist-rag/
│
├── backend/
│   ├── app/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── deps.py
│   │   │
│   │   ├── middleware/
│   │   │   └── audit.py
│   │   │
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── patient.py
│   │   │   ├── document.py
│   │   │   └── ...
│   │   │
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── patients.py
│   │   │   ├── documents.py
│   │   │   ├── images.py
│   │   │   ├── chat.py
│   │   │   ├── consent.py
│   │   │   ├── audit.py
│   │   │   └── admin.py
│   │   │
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── utils/
│   │   └── vector_store/
│   │
│   ├── main.py
│   ├── seed.py
│   ├── requirements.txt
│   ├── .env.example
│   └── uploads/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
└── README.md
```

------------------------------------------------------------------------

# 🗄️ Database Models

The PostgreSQL database contains a healthcare-focused relational model.

### User & Authentication

-   `User`
-   `SignupRequest`

### Medical Core

-   `Patient`
-   `PatientAccess`
-   `Consent`

### Auditing

-   `AuditLog`

### Multimodal Assets

-   `Document`
-   `DocumentChunk`
-   `MedicalImage`

### AI Interactions

-   `Chat`

The `PatientAccess` relationship connects users to individual patients
and allows the system to enforce role-specific and patient-specific
access rules.

------------------------------------------------------------------------

# 🔐 Authentication & RBAC

ClinicalAssist RAG uses JWT-based authentication.

The typical authentication flow is:

``` text
User Login
    │
    ▼
Credentials Verification
    │
    ▼
Password Hash Validation
    │
    ▼
JWT Token Generated
    │
    ▼
Frontend Stores Authentication State
    │
    ▼
Axios Sends JWT
    │
    ▼
FastAPI Dependency Validation
    │
    ▼
RBAC / Permission Check
    │
    ▼
Protected Resource
```

Backend routes should use dependency injection for authentication and
authorization.

Example pattern:

``` python
Depends(get_current_active_user)
```

Database-dependent routes should use:

``` python
Depends(get_db)
```

------------------------------------------------------------------------

# 🧠 RAG Pipeline

The RAG system is designed to ground AI responses in patient-specific
clinical information.

``` text
Clinical Document
       │
       ▼
Document Upload
       │
       ▼
Text Extraction
       │
       ▼
Document Chunking
       │
       ▼
Vector Store
       │
       ▼
User Question
       │
       ▼
Relevant Context Retrieval
       │
       ▼
LLM Prompt + Clinical Context
       │
       ▼
Groq / OpenRouter
       │
       ▼
Contextual AI Response
```

The system separates retrieval and LLM logic from API routers through
the service layer.

------------------------------------------------------------------------

# 🤖 LLM Integration

ClinicalAssist RAG supports multiple LLM providers.

### Groq

Used as a primary or configurable LLM provider for fast inference.

### OpenRouter

Provides access to multiple models and can act as a fallback or
load-balancing provider.

The provider configuration is controlled through environment variables
in the backend configuration layer.

------------------------------------------------------------------------

# 📋 Audit Architecture

Auditing is implemented through custom ASGI middleware.

Instead of adding audit code repeatedly to every route, the middleware
can passively track application activity.

``` text
HTTP Request
     │
     ▼
Audit Middleware
     │
     ├── User
     ├── Endpoint
     ├── Method
     ├── Action
     └── Request Metadata
     │
     ▼
FastAPI Router
     │
     ▼
Service Layer
     │
     ▼
PostgreSQL
```

Operations involving patient information should always be aligned with
the application's audit requirements.

------------------------------------------------------------------------

# 🚀 Getting Started

## Prerequisites

Make sure the following are installed:

-   Python 3.10+
-   Node.js 18+
-   npm or Yarn
-   PostgreSQL
-   Git

------------------------------------------------------------------------

# ⚙️ Backend Setup

### 1. Clone the Repository

``` bash
git clone <YOUR_BACKEND_REPOSITORY_URL>
cd clinicalassist-rag/backend
```

### 2. Create a Virtual Environment

#### Windows

``` bash
python -m venv venv
venv\Scripts\activate
```

#### Linux / macOS

``` bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

``` bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Copy the example environment file:

``` bash
cp .env.example .env
```

On Windows, you can also create `.env` manually from `.env.example`.

Configure at minimum:

``` env
DATABASE_URL=postgresql://username:password@localhost:5432/clinicalassist
SECRET_KEY=your_secure_secret_key
```

Configure the required LLM/vector-store variables according to the
providers used by your project.

### 5. Initialize the Database

Run the database seeder:

``` bash
python seed.py
```

The seeder initializes baseline data such as:

-   Roles
-   Admin user
-   Initial permissions
-   Dummy/development data where configured

### 6. Start the Backend

``` bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend API:

``` text
http://localhost:8000
```

FastAPI Swagger documentation:

``` text
http://localhost:8000/docs
```

------------------------------------------------------------------------

# 💻 Frontend Setup

Open a new terminal:

``` bash
cd frontend
```

### 1. Install Dependencies

``` bash
npm install
```

### 2. Configure Environment Variables

Create the frontend `.env` file from `.env.example`.

Example:

``` env
VITE_API_BASE_URL=http://localhost:8000
```

If your project uses a hosted backend, replace the URL with the deployed
API endpoint.

### 3. Start Development Server

``` bash
npm run dev
```

The Vite development server will provide a local URL, usually:

``` text
http://localhost:5173
```

------------------------------------------------------------------------

# 🌐 Frontend Integration

The FastAPI application can serve the compiled Single Page Application
directly.

The backend `main.py` can be configured to mount:

``` text
../frontend/dist
```

This allows the deployed application to provide both:

-   REST API endpoints
-   React frontend

through the same application environment.

------------------------------------------------------------------------

# 🔌 API Modules

The backend uses modular FastAPI routers.

  Router        Responsibility
  ------------- ----------------------------------------
  `auth`        Login, registration and authentication
  `users`       User management
  `patients`    Patient records and management
  `documents`   Medical document upload and management
  `images`      Medical image management
  `chat`        RAG-powered AI conversations
  `consent`     Patient consent management
  `audit`       Audit log access
  `admin`       Administrative operations

------------------------------------------------------------------------

# 🧱 Development Architecture

The project follows a layered architecture.

### Routers

Handle:

-   HTTP requests
-   Request validation
-   Dependency injection
-   Response serialization

Routers should remain lightweight.

### Services

Handle:

-   Business logic
-   Database operations
-   LLM calls
-   RAG processing
-   Document ingestion

### Models

Contain SQLAlchemy database definitions.

### Schemas

Contain Pydantic request and response models.

### Dependencies

Provide:

-   Database sessions
-   Current authenticated users
-   Authorization checks

### Vector Store

Provides an abstraction around vector storage and retrieval for RAG
operations.

------------------------------------------------------------------------

# 🛡️ Development Guidelines

When extending the project, follow these conventions.

## Dependency Injection

Use the application's dependencies for database and authentication
access.

``` python
db = Depends(get_db)
```

For authenticated routes:

``` python
current_user = Depends(get_current_active_user)
```

Use exact permission dependencies where required.

## DTO / Schema Separation

Do not return SQLAlchemy ORM objects directly from API endpoints.

Use Pydantic schemas for:

-   Request validation
-   Response serialization
-   API contracts

## Audit Requirements

Any route that creates, updates, or deletes patient-related information
should be reviewed against the application's audit requirements.

Examples:

``` text
POST
PUT
PATCH
DELETE
```

## Service Abstraction

Avoid placing complex logic directly inside:

``` text
routers/*.py
```

Move complex operations into:

``` text
services/
```

This keeps the application:

-   Testable
-   Maintainable
-   Reusable
-   Easier to extend

------------------------------------------------------------------------

# 🧪 Development Workflow

A typical development workflow is:

``` text
1. Create / modify SQLAlchemy model
             ↓
2. Create Pydantic schema
             ↓
3. Implement service logic
             ↓
4. Add FastAPI router endpoint
             ↓
5. Add authentication / permission checks
             ↓
6. Validate audit requirements
             ↓
7. Connect frontend API service
             ↓
8. Test end-to-end workflow
```

------------------------------------------------------------------------

# 🔒 Security Considerations

Healthcare applications require significantly stronger security controls
than ordinary applications.

For any production deployment, consider implementing and validating:

-   HTTPS/TLS
-   Secure JWT handling
-   Strong secret management
-   Database encryption
-   Encryption at rest
-   Encryption in transit
-   Secure file storage
-   Access logging
-   Data retention policies
-   Consent enforcement
-   Input validation
-   Rate limiting
-   CORS restrictions
-   Secure HTTP headers
-   Backup and disaster recovery
-   Secrets rotation
-   Vulnerability scanning
-   Dependency updates
-   Production-grade authentication
-   Appropriate privacy and regulatory controls

Never commit secrets, API keys, database credentials, or production
`.env` files to Git.

------------------------------------------------------------------------

# 📌 Environment Variables

A typical backend environment may contain:

``` env
DATABASE_URL=
SECRET_KEY=

GROQ_API_KEY=
OPENROUTER_API_KEY=

LLM_PROVIDER=
LLM_MODEL=

VECTOR_STORE_URL=
VECTOR_STORE_API_KEY=
```

Use the actual variables defined by your `.env.example` and
`app/config.py`.

------------------------------------------------------------------------

# 🖥️ Production Build

## Frontend

Build the React application:

``` bash
npm run build
```

This generates:

``` text
frontend/dist/
```

The FastAPI application can then be configured to serve the compiled
frontend.

## Backend

For production, avoid:

``` bash
--reload
```

Use a production deployment configuration appropriate to your hosting
environment.

------------------------------------------------------------------------

# 📊 High-Level Data Flow

``` text
             ┌───────────────┐
             │     User      │
             └───────┬───────┘
                     │
                     ▼
             ┌───────────────┐
             │ React Frontend│
             └───────┬───────┘
                     │ JWT / API
                     ▼
             ┌───────────────┐
             │    FastAPI    │
             └───────┬───────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
      Auth/RBAC   Services    Audit
          │          │          │
          ▼          ▼          ▼
      PostgreSQL   RAG Flow   AuditLog
                     │
             ┌───────┴────────┐
             ▼                ▼
        Vector Store       LLM Provider
                              │
                       ┌──────┴──────┐
                       ▼             ▼
                     Groq       OpenRouter
```

------------------------------------------------------------------------

# 📁 File Upload Flow

``` text
User
 │
 ▼
Frontend Upload
 │
 ▼
FastAPI Endpoint
 │
 ▼
File Validation
 │
 ▼
Local / Configured Storage
 │
 ▼
Document Parser
 │
 ├── PDF → PyPDF2
 └── DOCX → python-docx
 │
 ▼
Text Chunking
 │
 ▼
Vector Store
 │
 ▼
Available for RAG Retrieval
```

------------------------------------------------------------------------

# 🎯 Project Goals

ClinicalAssist RAG aims to provide a unified healthcare intelligence
platform that makes patient information easier to access while
maintaining strong authorization and traceability.

The main goals are:

1.  **Secure patient data management**
2.  **Context-aware clinical AI assistance**
3.  **Role-based access control**
4.  **Multimodal medical data support**
5.  **Traceable healthcare data access**
6.  **Modular and maintainable backend architecture**
7.  **Modern and accessible clinical user experience**

------------------------------------------------------------------------

# 📜 License

This project is currently intended for **demonstration and educational
purposes**.

Refer to the repository's license file for the applicable licensing
terms.

------------------------------------------------------------------------

# 👨‍💻 Project

**ClinicalAssist RAG**

**Multimodal Healthcare RAG Backend + Frontend**

Built with:

``` text
React + Vite + Tailwind CSS
FastAPI + PostgreSQL
SQLAlchemy + Pydantic
RAG + Vector Retrieval
Groq + OpenRouter
JWT + RBAC
```
