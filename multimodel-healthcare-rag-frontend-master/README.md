<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="ClinicalAssist Banner" width="800">
  
  # ClinicalAssist RAG
  ### AI-Powered Healthcare Intelligence & Patient Management
</div>

---

## 🩺 Overview

**ClinicalAssist RAG** is a modern, secure healthcare platform designed for high-stakes clinical environments. It combines **Retrieval-Augmented Generation (RAG)** with strict **Role-Based Access Control (RBAC)** to provide doctors, nurses, and patients with an intelligent interface for medical history analysis and chart management.

Built with **React (Vite)**, **Tailwind CSS**, and **Framer Motion**, it offers a premium, high-performance user experience tailored for clinical workflows.

## ✨ Key Features

- 🧠 **AI-Powered RAG Assistant**: Query patient records using context-aware AI that sources truth from uploaded clinical notes.
- 🔐 **Secure RBAC**: Granular permissions for Admins, Doctors, Nurses, and Patients.
- 📁 **Patient Management**: Comprehensive registry with chart editing, document uploads, and audit logging.
- 🌓 **Dynamic Interface**: Dark/Light mode support with a focus on high-contrast accessibility.
- ⚡ **Real-time Connectivity**: Seamlessly integrated with a FastAPI + PostgreSQL backend.

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **NPM** or **Yarn**

### Installation

1.  **Clone and Enter Directory**:
    ```bash
    git clone https://github.com/Mohammed-Akramuddin/multimodel-healthcare-rag-frontend.git
    cd clinicalassist-rag
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file from the example:
    ```bash
    cp .env.example .env
    ```
    Set your backend URL (the repository is pre-configured to proxy to the hosted Render backend).

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## 🏗️ Architecture

- **Frontend**: React 19 + Vite 6 + Tailwind CSS.
- **State Management**: Context API for Auth and Patient data.
- **API Client**: Axios with interceptors for JWT handling.
- **Visuals**: Recharts for analytics and Framer Motion for micro-animations.

## 📄 License

This project is for demo purposes. See the root repository for licensing details.

---

<p align="center">
  Created by <a href="https://github.com/Mohammed-Akramuddin">Mohammed Akramuddin</a>
</p>
