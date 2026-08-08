import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-clinical-key";

app.use(express.json());

// --- Mock Database ---
const users = [
  { id: 1, email: "admin@demo.local", password: "", role: "admin", name: "Admin User" },
  { id: 2, email: "doctor@demo.local", password: "", role: "doctor", name: "Dr. Smith" },
  { id: 3, email: "nurse@demo.local", password: "", role: "nurse", name: "Nurse Joy" },
  { id: 4, email: "patient@demo.local", password: "", role: "patient", name: "Alex Morgan", patient_profile_id: 1 },
];

// Hash passwords on startup
async function hashPasswords() {
  console.log("Hashing passwords...");
  users[0].password = await bcrypt.hash("admin123!", 10);
  users[1].password = await bcrypt.hash("doctor123!", 10);
  users[2].password = await bcrypt.hash("nurse123!", 10);
  users[3].password = await bcrypt.hash("patient123!", 10);
  console.log("Passwords hashed.");
}
hashPasswords();

const patients = [
  { id: 1, external_id: "P-1001", name: "Alex Morgan", dob: "1990-05-15", gender: "Female", condition: "Hypertension" },
  { id: 2, external_id: "P-1002", name: "Jordan Rivera", dob: "1985-11-22", gender: "Male", condition: "Type 2 Diabetes" },
  { id: 3, external_id: "P-1003", name: "Casey Chen", dob: "1978-03-10", gender: "Non-binary", condition: "Asthma" },
  { id: 4, external_id: "P-1004", name: "Sam Taylor", dob: "1995-08-30", gender: "Female", condition: "Post-op Recovery" },
  { id: 5, external_id: "P-1005", name: "Riley West", dob: "1962-12-05", gender: "Male", condition: "Hyperlipidemia" },
];

const patient_access = [
  { user_id: 2, patient_id: 1, access_level: "write" },
  { user_id: 2, patient_id: 2, access_level: "write" },
  { user_id: 2, patient_id: 3, access_level: "write" },
  { user_id: 2, patient_id: 4, access_level: "write" },
  { user_id: 2, patient_id: 5, access_level: "write" },
  { user_id: 3, patient_id: 1, access_level: "read" },
];

const documents = [
  { id: 1, patient_id: 1, filename: "alex_morgan_visit.txt", content: "Patient presents with elevated blood pressure. History of hypertension. Current BP 145/95.", created_at: new Date().toISOString() },
];

const audit_logs = [
  { id: 1, user_id: 2, action: "VIEW_PATIENT", resource: "Patient #1", timestamp: new Date().toISOString() },
];

// --- Auth Middleware ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API Routes ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, patient_profile_id: user.patient_profile_id }, JWT_SECRET);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  const user = users.find(u => u.id === req.user.id);
  res.json(user);
});

app.get("/api/patients", authenticateToken, (req: any, res) => {
  if (req.user.role === "admin") return res.json(patients);
  if (req.user.role === "patient") return res.json(patients.filter(p => p.id === req.user.patient_profile_id));
  
  const allowedIds = patient_access.filter(a => a.user_id === req.user.id).map(a => a.patient_id);
  res.json(patients.filter(p => allowedIds.includes(p.id)));
});

app.get("/api/patients/:id", authenticateToken, (req: any, res) => {
  const patient = patients.find(p => p.id === parseInt(req.params.id));
  if (!patient) return res.status(404).json({ message: "Patient not found" });
  res.json(patient);
});

app.get("/api/documents", authenticateToken, (req: any, res) => {
  const patientId = parseInt(req.query.patient_id as string);
  res.json(documents.filter(d => d.patient_id === patientId));
});

app.post("/api/chat/message", authenticateToken, (req: any, res) => {
  const { patient_id, message } = req.body;
  // Mock RAG response
  const relevantDocs = documents.filter(d => d.patient_id === patient_id);
  const context = relevantDocs.map(d => d.content).join("\n");
  
  res.json({
    answer: `Based on the clinical notes for patient ${patient_id}, the patient has a history of ${context.includes('hypertension') ? 'hypertension' : 'the recorded conditions'}. Recent notes indicate: "${context.substring(0, 100)}..."`,
    excerpts: relevantDocs.map(d => ({ filename: d.filename, content: d.content }))
  });
});

app.get("/api/audit", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  res.json(audit_logs);
});

app.get("/api/admin/stats", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  res.json({
    total_patients: patients.length,
    total_users: users.length,
    total_documents: documents.length,
    active_sessions: 12
  });
});

// --- Vite / Static Files ---
async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Explicitly handle SPA fallback in dev mode
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        // 1. Read index.html
        let template = await fs.promises.readFile(
          path.resolve(process.cwd(), "index.html"),
          "utf-8"
        );

        // 2. Apply Vite HTML transforms
        template = await vite.transformIndexHtml(url, template);

        // 3. Send the transformed HTML back
        console.log(`Serving transformed index.html for ${url}`);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        console.error(`Error serving index.html for ${url}:`, e);
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
