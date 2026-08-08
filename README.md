# multimodel-healthcare-rag-frontend-backend
Healthcare Contextual RAG Backend Architecture
Overview
This is a robust, asynchronous Python backend built using FastAPI to power a Multimodal Healthcare RAG (Retrieval-Augmented Generation) system with strict RBAC (Role-Based Access Control) mechanisms. It uses PostgreSQL for data persistence.

This document serves as a guide for AI developers to quickly understand the current contextual state, abstractions, and conventions used in the system for smooth extension and code generation.

Core Tech Stack
Framework: FastAPI (async context managers, granular router system)
Database: PostgreSQL
ORM: SQLAlchemy (v2.0+) (psycopg2-binary)
Authentication: JWT & passlib[bcrypt] (secure password hashing)
File Handling: python-multipart & aiofiles
Parsing/Ingestion: PyPDF2, python-docx
LLM/RAG Integration: groq, OpenRouter API (Fallbacks and Load-balancing)
Data Validation: Pydantic v2 & pydantic-settings (Environment management)
Directory Structure
backend/
├── app/
│   ├── config.py           # Pydantic Settings & Environment Variables
│   ├── database.py         # SQLAlchemy engine, session maker, Base declarative
│   ├── deps.py             # Dependency injection (db sessions, auth retrieval)
│   ├── middleware/         # Custom ASGI middlewares (e.g., Audit logs)
│   ├── models/             # SQLAlchemy ORM definitions (12+ relations)
│   ├── routers/            # Feature-based API endpoint routing
│   ├── schemas/            # Pydantic models for request/response serialization
│   ├── services/           # Core business logic separated from routing
│   ├── utils/              # Helper utilities
│   └── vector_store/       # Vector database abstraction for RAG queries
├── main.py                 # Application factory, lifespan, and CORS setup
├── seed.py                 # Initial database seeder (Roles, Admins, Dummy data)
├── requirements.txt        # Python dependency manifest
├── .env.example            # Boilerplate configuration schema
└── uploads/                # Local persistence layer for Images/Documents
Relational Models
The database encapsulates a complex access-management domain, specifically structured for healthcare data limits:

User/Auth: User, SignupRequest.
Medical Core: Patient, PatientAccess (binds specific Users to Patients with distinct access logic), Consent.
Audit: AuditLog (immutable tracking of API and database-level manipulation operations).
Multimodal Asset Storage: Document, DocumentChunk, MedicalImage.
Interactions: Chat (stores RAG LLM interactions securely mapped to individuals).
Key Architecture Points
Middleware-driven Auditing: The application implements an AuditMiddleware to passively record requests, mapping changes and read events accurately to ensure HIPAA-level traceability without cluttering standard router logic.
Robust Multi-source LLM: Environment defaults load through app/config.py enabling dynamic switches between Groq and OpenRouter LLMs seamlessly based on limits, fallbacks, or token thresholds.
Frontend Integration Ready: main.py is dynamically configured to statically mount and securely proxy a compiled Single-Page Application (React/Vue) directly from ../frontend/dist.
Router Modularity: The api/ endpoints are separated deeply using FastAPI routers (auth, users, patients, documents, images, chat, consent, audit, admin).
Setup Instructions
# 1. Create native Python virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate

# 2. Pull down requirements
pip install -r requirements.txt

# 3. Handle Local configuration
cp .env.example .env
# Required: Inject a valid PostgreSQL DATABASE_URL and SECRET_KEY into .env

# 4. Bootstrap schemas and populate baseline logic
python seed.py

# 5. Bring Server Online
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
Notes for AI System
When extending this codebase, adhere to the following standards:

Dependency Injection: Use app.deps heavily for routing validation. Operations requiring database access must consume Depends(get_db). Endpoint handlers needing verified users must lock themselves via Depends(get_current_active_user) or exact permission requirements.
DTOs & Pydantic: Separate database models (models/) from serialization structures (schemas/). Never leak SQLAlchemy mapped classes directly from returning routes.
Audit Constraints: Operations that mutate patient information (POST/PUT/DELETE) should document their actions properly to align with the active Audit implementations mapping. Modifying routes require careful alignment with system audits.
Service Abstraction: Limit the complexity inside of routers/*.py. Pushing database logic, LLM calling, and document ingestion explicitly into app/services/ maintains testability and DRY definitions.


ClinicalAssist Banner
ClinicalAssist RAG
AI-Powered Healthcare Intelligence & Patient Management
🩺 Overview
ClinicalAssist RAG is a modern, secure healthcare platform designed for high-stakes clinical environments. It combines Retrieval-Augmented Generation (RAG) with strict Role-Based Access Control (RBAC) to provide doctors, nurses, and patients with an intelligent interface for medical history analysis and chart management.

Built with React (Vite), Tailwind CSS, and Framer Motion, it offers a premium, high-performance user experience tailored for clinical workflows.

✨ Key Features
🧠 AI-Powered RAG Assistant: Query patient records using context-aware AI that sources truth from uploaded clinical notes.
🔐 Secure RBAC: Granular permissions for Admins, Doctors, Nurses, and Patients.
📁 Patient Management: Comprehensive registry with chart editing, document uploads, and audit logging.
🌓 Dynamic Interface: Dark/Light mode support with a focus on high-contrast accessibility.
⚡ Real-time Connectivity: Seamlessly integrated with a FastAPI + PostgreSQL backend.
🚀 Getting Started
Prerequisites
Node.js (v18+)
NPM or Yarn
Installation
Clone and Enter Directory:

git clone https://github.com/Mohammed-Akramuddin/multimodel-healthcare-rag-frontend.git
cd clinicalassist-rag
Install Dependencies:

npm install
Environment Setup: Create a .env file from the example:

cp .env.example .env
Set your backend URL (the repository is pre-configured to proxy to the hosted Render backend).

Run Development Server:

npm run dev
🏗️ Architecture
Frontend: React 19 + Vite 6 + Tailwind CSS.
State Management: Context API for Auth and Patient data.
API Client: Axios with interceptors for JWT handling.
Visuals: Recharts for analytics and Framer Motion for micro-animations.
📄 License
This project is for demo purposes. See the root repository for licensing details.
