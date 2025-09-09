// backend/app.js - Complete Face Recognition Backend
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

/* ------------------- Helper Functions ------------------- */
function mapStudentRow(row) {
  let modules = [];
  try {
    if (typeof row.modules === 'string') {
      modules = JSON.parse(row.modules);
    } else if (Array.isArray(row.modules)) {
      modules = row.modules;
    }
  } catch (e) {
    console.warn("Error parsing student modules:", e);
    modules = [];
  }

  let descriptor = null;
  try {
    if (typeof row.descriptor === 'string') {
      descriptor = JSON.parse(row.descriptor);
    } else if (Array.isArray(row.descriptor)) {
      descriptor = row.descriptor;
    }
  } catch (e) {
    console.warn("Error parsing student descriptor:", e);
  }

  return {
    id: row.id,
    name: row.name,
    studentNo: row.student_no,
    email: row.email,
    modules: modules,
    face: row.face_image || null,
    descriptor: descriptor,
    createdAt: row.created_at
  };
}

function mapLecturerRow(row) {
  let modules = [];
  try {
    if (typeof row.modules_assigned === 'string') {
      modules = JSON.parse(row.modules_assigned);
    } else if (Array.isArray(row.modules_assigned)) {
      modules = row.modules_assigned;
    }
  } catch (e) {
    console.warn("Error parsing lecturer modules:", e);
    modules = [];
  }

  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    modules: modules,
    modules_assigned: modules
  };
}

/* ------------------- STUDENTS API ------------------- */
app.get("/api/students", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM students ORDER BY id ASC");
    const students = result.rows.map(mapStudentRow);
    console.log(`Retrieved ${students.length} students`);
    res.json(students);
  } catch (err) {
    console.error("Get students failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/students/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("SELECT * FROM students WHERE id=$1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json(mapStudentRow(result.rows[0]));
  } catch (err) {
    console.error("Get student by id failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/students", async (req, res) => {
  const { name, studentNo, email, modules, face, descriptor } = req.body;

  if (!name || !studentNo || !email) {
    return res.status(400).json({ message: "Missing required fields: name, studentNo, email" });
  }

  try {
    const result = await db.query(
      `INSERT INTO students (name, student_no, email, modules, face_image, descriptor)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        name, 
        studentNo, 
        email, 
        JSON.stringify(modules || []), 
        face || null, 
        JSON.stringify(descriptor || null)
      ]
    );
    
    const newStudent = mapStudentRow(result.rows[0]);
    console.log(`Created student: ${newStudent.name} (${newStudent.studentNo})`);
    res.status(201).json(newStudent);
  } catch (err) {
    console.error("Insert student failed:", err);
    if (err.code === "23505") {
      res.status(400).json({ message: "Student number already exists" });
    } else {
      res.status(500).json({ message: "Database insert failed" });
    }
  }
});

app.put("/api/students/:id", async (req, res) => {
  const { id } = req.params;
  const { name, studentNo, email, modules, face, descriptor } = req.body;

  try {
    const result = await db.query(
      `UPDATE students
       SET name=$1, student_no=$2, email=$3, modules=$4, face_image=$5, descriptor=$6
       WHERE id=$7 RETURNING *`,
      [
        name || null, 
        studentNo || null, 
        email || null, 
        JSON.stringify(modules || []), 
        face || null, 
        JSON.stringify(descriptor || null), 
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const updatedStudent = mapStudentRow(result.rows[0]);
    console.log(`Updated student: ${updatedStudent.name} - Face: ${face ? 'Yes' : 'No'}, Descriptor: ${descriptor ? 'Yes' : 'No'}`);
    res.json(updatedStudent);
  } catch (err) {
    console.error("Update student failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Improved attendance recording
app.put("/api/students/:id/attendance", async (req, res) => {
  const { id } = req.params;
  const { lecturer, module, date, startTime, status, mark } = req.body;

  if (!lecturer || !module || !date || !startTime) {
    return res.status(400).json({ 
      message: "Missing required fields: lecturer, module, date, startTime" 
    });
  }

  try {
    // Get student details
    const studentResult = await db.query("SELECT * FROM students WHERE id = $1", [id]);
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const student = studentResult.rows[0];

    // Check if attendance already exists for today
    const existingResult = await db.query(
      `SELECT * FROM attendance 
       WHERE student_no = $1 AND module = $2 AND date = $3`,
      [student.student_no, module, date]
    );

    if (existingResult.rows.length > 0) {
      console.log(`Attendance already exists for ${student.name} on ${date} for ${module}`);
      return res.status(200).json({ 
        message: "Attendance already recorded for this student today",
        existing: true
      });
    }

    // Insert new attendance record
    const attendanceResult = await db.query(
      `INSERT INTO attendance (
        student_no, name, email, module, lecturer, date, 
        time_recorded, status, confidence, auto_recorded
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        student.student_no,
        student.name,
        student.email,
        module,
        lecturer,
        date,
        startTime,
        status || 'Present',
        `${mark || 95}%`,
        true
      ]
    );
    
    console.log(`Attendance recorded: ${student.name} (${student.student_no}) - ${module} - ${date}`);
    
    res.json({ 
      message: "Attendance recorded successfully",
      attendance: attendanceResult.rows[0]
    });
  } catch (err) {
    console.error("Record attendance failed:", err);
    res.status(500).json({ message: "Failed to record attendance: " + err.message });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("DELETE FROM students WHERE id=$1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }
    console.log(`Deleted student: ${result.rows[0].name}`);
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error("Delete student failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------- LECTURERS API ------------------- */
app.get("/api/lecturers", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM lecturers ORDER BY id ASC");
    res.json(result.rows.map(mapLecturerRow));
  } catch (err) {
    console.error("Get lecturers failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/lecturers/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("SELECT * FROM lecturers WHERE id=$1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Lecturer not found" });
    }
    res.json(mapLecturerRow(result.rows[0]));
  } catch (err) {
    console.error("Get lecturer by id failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/lecturers", async (req, res) => {
  const { fullName, username, password } = req.body;
  if (!fullName || !username || !password) {
    return res.status(400).json({ message: "Missing required fields: fullName, username, password" });
  }

  try {
    const result = await db.query(
      "INSERT INTO lecturers (full_name, username, password, modules_assigned) VALUES ($1, $2, $3, $4) RETURNING *",
      [fullName, username, password, JSON.stringify([])]
    );
    console.log(`Created lecturer: ${fullName}`);
    res.status(201).json(mapLecturerRow(result.rows[0]));
  } catch (err) {
    console.error("Insert lecturer failed:", err);
    if (err.code === "23505") {
      res.status(400).json({ message: "Username already exists" });
    } else {
      res.status(500).json({ message: "Server error" });
    }
  }
});

app.post("/api/lecturers/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  try {
    const result = await db.query(
      "SELECT * FROM lecturers WHERE username=$1 AND password=$2", 
      [username, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    console.log(`Lecturer login: ${result.rows[0].full_name}`);
    res.json(mapLecturerRow(result.rows[0]));
  } catch (err) {
    console.error("Lecturer login failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/lecturers/:id", async (req, res) => {
  const { id } = req.params;
  const { modules } = req.body;

  try {
    const result = await db.query(
      "UPDATE lecturers SET modules_assigned=$1 WHERE id=$2 RETURNING *",
      [JSON.stringify(modules || []), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Lecturer not found" });
    }
    console.log(`Updated lecturer modules: ${result.rows[0].full_name}`);
    res.json(mapLecturerRow(result.rows[0]));
  } catch (err) {
    console.error("Update lecturer modules failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/lecturers/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("DELETE FROM lecturers WHERE id=$1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Lecturer not found" });
    }
    console.log(`Deleted lecturer: ${result.rows[0].full_name}`);
    res.json({ message: "Lecturer deleted successfully" });
  } catch (err) {
    console.error("Delete lecturer failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------- MODULES API ------------------- */
app.get("/api/modules", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM modules ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Get modules failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/modules", async (req, res) => {
  const { name, code, description } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Module name is required" });
  }

  try {
    const result = await db.query(
      "INSERT INTO modules (name, code, description) VALUES ($1, $2, $3) RETURNING *",
      [name, code || null, description || null]
    );
    console.log(`Created module: ${name}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Insert module failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/modules/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("DELETE FROM modules WHERE id=$1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Module not found" });
    }
    console.log(`Deleted module: ${result.rows[0].name}`);
    res.json({ message: "Module deleted successfully" });
  } catch (err) {
    console.error("Delete module failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------- ATTENDANCE API ------------------- */
app.get("/api/attendance", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM attendance 
      ORDER BY date DESC, time_recorded DESC
    `);
    console.log(`Retrieved ${result.rows.length} attendance records`);
    res.json(result.rows);
  } catch (err) {
    console.error("Get attendance failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/attendance/lecturer/:lecturerName", async (req, res) => {
  const { lecturerName } = req.params;
  try {
    const result = await db.query(`
      SELECT * FROM attendance 
      WHERE lecturer = $1
      ORDER BY date DESC, time_recorded DESC
    `, [lecturerName]);
    console.log(`Retrieved ${result.rows.length} attendance records for lecturer: ${lecturerName}`);
    res.json(result.rows);
  } catch (err) {
    console.error("Get attendance by lecturer failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/attendance/module/:moduleName", async (req, res) => {
  const { moduleName } = req.params;
  try {
    const result = await db.query(`
      SELECT * FROM attendance 
      WHERE module = $1
      ORDER BY date DESC, time_recorded DESC
    `, [moduleName]);
    console.log(`Retrieved ${result.rows.length} attendance records for module: ${moduleName}`);
    res.json(result.rows);
  } catch (err) {
    console.error("Get attendance by module failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------- HEALTH CHECK ------------------- */
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Face Recognition API running", 
    timestamp: new Date().toISOString(),
    version: "2.0.0"
  });
});

/* ------------------- ERROR HANDLING ------------------- */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

/* ------------------- START SERVER ------------------- */
app.listen(PORT, () => {
  console.log(`Face Recognition API Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Available endpoints:`);
  console.log(`  GET    /api/students`);
  console.log(`  POST   /api/students`);
  console.log(`  PUT    /api/students/:id/attendance`);
  console.log(`  GET    /api/attendance`);
  console.log(`  GET    /api/modules`);
  console.log(`  GET    /api/lecturers`);
});