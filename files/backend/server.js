
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


function verifyAdminToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "error",
      message: "Admin authentication required"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Admin access only"
      });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token. Please log in again."
    });
  }
}


// Home API
app.get("/", (req, res) => {
  res.json({
    message: "QUANTUM Aptitude Arena API is running!",
    status: "ok",
  });
});

// Health check: verifies database connection
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() AS server_time"
    );

    res.json({
      status: "ok",
      database: "connected",
      serverTime: result.rows[0].server_time,
    });
  } catch (error) {
    console.error("Health check failed:", error.message);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

// Student Signup API
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.post("/api/signup", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Full name, email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 8 characters long",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email is already registered
    const existingStudent = await pool.query(
      "SELECT id FROM students WHERE email = $1",
      [normalizedEmail]
    );

    if (existingStudent.rows.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "This email is already registered",
      });
    }

    // Hash the password before saving it
    const passwordHash = await bcrypt.hash(password, 12);

    // Save student in PostgreSQL
    const result = await pool.query(
      `INSERT INTO students (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, email, created_at`,
      [fullName.trim(), normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      status: "ok",
      message: "Signup successful",
      student: result.rows[0],
    });
  } catch (error) {
    console.error("Signup API failed:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Unable to complete signup",
    });
  }
});


 // Student Login API
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find student by email
    const result = await pool.query(
      `SELECT id, full_name, email, password_hash
       FROM students
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    const student = result.rows[0];

    // Verify password against stored hash
    const passwordMatches = await bcrypt.compare(
      password,
      student.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // Return student details without password hash
    return res.json({
      status: "ok",
      message: "Login successful",
      student: {
        id: student.id,
        full_name: student.full_name,
        email: student.email,
      },
    });
  } catch (error) {
    console.error("Login API failed:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Unable to complete login",
    });
  }
});


 
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required"
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminEmail || !adminPassword || !jwtSecret) {
      console.error("Admin credentials or JWT_SECRET missing in .env");
      return res.status(500).json({
        status: "error",
        message: "Admin login is not configured"
      });
    }

    if (
      String(email).trim().toLowerCase() !== adminEmail.trim().toLowerCase() ||
      String(password) !== adminPassword
    ) {
      return res.status(401).json({
        status: "error",
        message: "Invalid admin credentials"
      });
    }

    const token = jwt.sign(
      { id: "admin", role: "admin", email: adminEmail },
      jwtSecret,
      { expiresIn: "2h" }
    );

    return res.json({
      status: "ok",
      message: "Admin login successful",
      token,
      admin: {
        id: "admin",
        name: "Admin",
        email: adminEmail,
        role: "admin"
      }
    });
  } catch (error) {
    console.error("Admin login failed:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Unable to complete admin login"
    });
  }
});


// Database statistics
app.get("/api/stats", verifyAdminToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM students) AS total_students,
        (SELECT COUNT(*) FROM quizzes) AS total_quizzes,
        (SELECT COUNT(*) FROM questions) AS total_questions,
        (SELECT COUNT(*) FROM quiz_attempts) AS total_attempts
    `);

    res.json({
      status: "ok",
      stats: result.rows[0],
    });
  } catch (error) {
    console.error("Stats API failed:", error.message);

    res.status(500).json({
      status: "error",
      message: "Unable to fetch database statistics",
    });
  }
});


/* ===============================
   QUIZ API
================================ */

// Get all quizzes with their questions
app.get("/api/quizzes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        q.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', qu.id,
              'question_text', qu.question_text,
              'option_a', qu.option_a,
              'option_b', qu.option_b,
              'option_c', qu.option_c,
              'option_d', qu.option_d,
              'correct_option', qu.correct_option,
              'explanation', qu.explanation,
              'marks', qu.marks
            )
          ) FILTER (WHERE qu.id IS NOT NULL),
          '[]'::json
        ) AS questions
      FROM quizzes q
      LEFT JOIN questions qu ON qu.quiz_id = q.id
      GROUP BY q.id
      ORDER BY q.id DESC
    `);

    res.json({ status: "ok", quizzes: result.rows.map(({ password_hash, ...quiz }) => quiz) });
  } catch (error) {
    console.error("Fetch quizzes failed:", error.message);
    res.status(500).json({
      status: "error",
      message: "Unable to fetch quizzes",
    });
  }
});

// Create a quiz with settings and questions
app.post("/api/quizzes", verifyAdminToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      title,
      description = "",
      duration_minutes = 30,
      category = "General",
      points = 1,
      shuffle_questions = false,
      shuffle_options = false,
      question_count = 1,
      password_protected = false,
      password_hash = null,
      scheduled_at = null,
      expires_at = null,
      status = "draft",
      questions = [],
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        status: "error",
        message: "Quiz title is required",
      });
    }

    if (!Number.isInteger(Number(duration_minutes)) ||
        Number(duration_minutes) < 1) {
      return res.status(400).json({
        status: "error",
        message: "Valid duration is required",
      });
    }

    if (!Array.isArray(questions)) {
      return res.status(400).json({
        status: "error",
        message: "Questions must be an array",
      });
    }

    await client.query("BEGIN");

    const quizResult = await client.query(
      `INSERT INTO quizzes (
        title, description, duration_minutes, category, points,
        shuffle_questions, shuffle_options, question_count,
        password_protected, password_hash, scheduled_at,
        expires_at, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        title.trim(),
        description,
        Number(duration_minutes),
        category,
        Number(points),
        Boolean(shuffle_questions),
        Boolean(shuffle_options),
        Number(question_count),
        Boolean(password_protected),
        password_protected ? (req.body.password ? await bcrypt.hash(String(req.body.password), 12) : password_hash) : null,
        scheduled_at || null,
        expires_at || null,
        status,
      ]
    );

    const quiz = quizResult.rows[0];

    for (const question of questions) {
      const questionText =
        question.question_text ?? question.question ?? "";

      if (!questionText.trim()) continue;

      await client.query(
        `INSERT INTO questions (
          quiz_id, question_text, option_a, option_b,
          option_c, option_d, correct_option, explanation, marks
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          quiz.id,
          questionText,
          question.option_a ?? question.options?.[0] ?? "",
          question.option_b ?? question.options?.[1] ?? "",
          question.option_c ?? question.options?.[2] ?? "",
          question.option_d ?? question.options?.[3] ?? "",
          question.correct_option ?? question.answer ?? "A",
          question.explanation ?? "",
          Number(question.marks ?? points),
        ]
      );
    }

    await client.query("COMMIT");

    const { password_hash: _passwordHash, ...safeQuiz } = quiz;
    res.status(201).json({
      status: "ok",
      quiz: safeQuiz,
      message: "Quiz and questions saved successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create quiz failed:", error.message);

    res.status(500).json({
      status: "error",
      message: "Unable to create quiz",
    });
  } finally {
    client.release();
  }
});



 // Update a quiz while preserving question IDs used by saved attempts.
app.put("/api/quizzes/:id", verifyAdminToken, async (req, res) => {
  const client = await pool.connect();
  let inTransaction = false;

  try {
    const { id } = req.params;
    const b = req.body || {};

    if (!String(b.title || "").trim()) {
      return res.status(400).json({
        status: "error",
        message: "Quiz title is required"
      });
    }

    if (!Array.isArray(b.questions)) {
      return res.status(400).json({
        status: "error",
        message: "Questions must be an array"
      });
    }

    await client.query("BEGIN");
    inTransaction = true;

    const old = await client.query(
      "SELECT id, password_hash FROM quizzes WHERE id=$1 FOR UPDATE",
      [id]
    );

    if (!old.rows.length) {
      await client.query("ROLLBACK");
      inTransaction = false;
      return res.status(404).json({
        status: "error",
        message: "Quiz not found"
      });
    }

    let passwordHash = old.rows[0].password_hash;

    if (!b.password_protected) {
      passwordHash = null;
    } else if (b.password && String(b.password).length) {
      passwordHash = await bcrypt.hash(String(b.password), 12);
    }

    await client.query(
      `UPDATE quizzes SET
        title=$1, description=$2, duration_minutes=$3, category=$4,
        points=$5, shuffle_questions=$6, shuffle_options=$7,
        question_count=$8, password_protected=$9, password_hash=$10,
        scheduled_at=$11, expires_at=$12, status=$13
       WHERE id=$14`,
      [
        String(b.title).trim(),
        b.description || "",
        Math.max(1, Number(b.duration_minutes) || 30),
        b.category || "General",
        Math.max(1, Number(b.points) || 1),
        !!b.shuffle_questions,
        !!b.shuffle_options,
        Math.max(1, Number(b.question_count) || b.questions.length || 1),
        !!b.password_protected,
        passwordHash,
        b.scheduled_at || null,
        b.expires_at || null,
        b.status || "draft",
        id
      ]
    );

    const existingResult = await client.query(
      `SELECT q.id,
              EXISTS (
                SELECT 1 FROM attempt_answers aa
                WHERE aa.question_id = q.id
              ) AS has_answers
       FROM questions q
       WHERE q.quiz_id=$1
       ORDER BY q.id
       FOR UPDATE`,
      [id]
    );

    const existing = existingResult.rows;
    const incoming = b.questions.filter(
      q => String(q.question_text ?? q.question ?? "").trim()
    );

    for (let i = 0; i < incoming.length; i++) {
      const q = incoming[i];
      const questionText = String(q.question_text ?? q.question).trim();
      const answer =
        String(q.correct_option ?? q.answer ?? "A")
          .toUpperCase().replace(/[^A-D]/g, "").slice(0, 1) || "A";

      const values = [
        questionText,
        q.option_a ?? q.optionA ?? q.options?.[0] ?? "",
        q.option_b ?? q.optionB ?? q.options?.[1] ?? "",
        q.option_c ?? q.optionC ?? q.options?.[2] ?? "",
        q.option_d ?? q.optionD ?? q.options?.[3] ?? "",
        answer,
        q.explanation || "",
        Math.max(1, Number(q.marks) || Number(b.points) || 1)
      ];

      if (existing[i]) {
        // Preserve the existing ID so saved answers remain linked.
        await client.query(
          `UPDATE questions SET
             question_text=$1, option_a=$2, option_b=$3, option_c=$4,
             option_d=$5, correct_option=$6, explanation=$7, marks=$8
           WHERE id=$9 AND quiz_id=$10`,
          [...values, existing[i].id, id]
        );
      } else {
        await client.query(
          `INSERT INTO questions
             (quiz_id, question_text, option_a, option_b, option_c,
              option_d, correct_option, explanation, marks)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [id, ...values]
        );
      }
    }

    // Remove surplus questions only if no saved answer references them.
    for (const q of existing.slice(incoming.length)) {
      if (q.has_answers) {
        throw new Error(
          "Cannot remove a question that has saved student answers. Keep it in the quiz."
        );
      }

      await client.query(
        "DELETE FROM questions WHERE id=$1 AND quiz_id=$2",
        [q.id, id]
      );
    }

    const result = await client.query(
      "SELECT * FROM quizzes WHERE id=$1",
      [id]
    );

    await client.query("COMMIT");
    inTransaction = false;

    const { password_hash: _passwordHash, ...safeQuiz } = result.rows[0];

    return res.json({
      status: "ok",
      quiz: safeQuiz,
      message: "Quiz updated successfully"
    });
  } catch (error) {
    if (inTransaction) {
      await client.query("ROLLBACK");
    }

    console.error("Update quiz failed:", error.message);

    return res.status(500).json({
      status: "error",
      message: error.message.includes("saved student answers")
        ? error.message
        : "Unable to update quiz"
    });
  } finally {
    client.release();
  }
});


// Delete a quiz; dependent questions and answer rows are removed explicitly.
app.delete('/api/quizzes/:id', verifyAdminToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const attempts = await client.query('SELECT id FROM quiz_attempts WHERE quiz_id=$1', [req.params.id]);
    for (const a of attempts.rows) await client.query('DELETE FROM attempt_answers WHERE attempt_id=$1', [a.id]);
    await client.query('DELETE FROM quiz_attempts WHERE quiz_id=$1', [req.params.id]);
    await client.query('DELETE FROM questions WHERE quiz_id=$1', [req.params.id]);
    const deleted = await client.query('DELETE FROM quizzes WHERE id=$1 RETURNING id', [req.params.id]);
    await client.query('COMMIT');
    if (!deleted.rows.length) return res.status(404).json({ status: 'error', message: 'Quiz not found' });
    res.json({ status: 'ok', message: 'Quiz deleted' });
  } catch (error) { await client.query('ROLLBACK'); console.error('Delete quiz failed:', error.message); res.status(500).json({ status: 'error', message: 'Unable to delete quiz' }); }
  finally { client.release(); }
});

app.post('/api/quizzes/:id/verify-password', async (req, res) => {
  try {
    const r = await pool.query('SELECT password_protected,password_hash FROM quizzes WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ status: 'error', message: 'Quiz not found' });
    const q = r.rows[0];
    if (!q.password_protected) return res.json({ status: 'ok', verified: true });
    const verified = !!q.password_hash && !!req.body.password && await bcrypt.compare(String(req.body.password), q.password_hash);
    res.json({ status: 'ok', verified });
  } catch (error) { console.error('Verify quiz password failed:', error.message); res.status(500).json({ status: 'error', message: 'Unable to verify password' }); }
});

// Submit an attempt. Correct answers and scores are calculated on the server.
app.post('/api/attempts', async (req, res) => {
  const client = await pool.connect();
  try {
    const studentId = req.body.student_id;
    const quizId = req.body.quiz_id;
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    if (!studentId || !quizId) return res.status(400).json({ status: 'error', message: 'Student and quiz are required' });
    await client.query('BEGIN');
    const existing = await client.query("SELECT id FROM quiz_attempts WHERE student_id=$1 AND quiz_id=$2 AND status='submitted'", [studentId, quizId]);
    if (existing.rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ status: 'error', message: 'You have already submitted this quiz' }); }
    const qs = await client.query('SELECT id,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,marks FROM questions WHERE quiz_id=$1', [quizId]);
    const qMap = new Map(qs.rows.map(q => [String(q.id), q]));
    const valid = answers.filter(a => qMap.has(String(a.question_id)));
    let score = 0;
    const attempt = await client.query("INSERT INTO quiz_attempts (student_id,quiz_id,started_at,submitted_at,score,status) VALUES ($1,$2,$3,NOW(),0,'submitted') RETURNING *", [studentId, quizId, req.body.started_at ? new Date(req.body.started_at) : new Date()]);
    const attemptId = attempt.rows[0].id;
    for (const a of valid) {
      const q = qMap.get(String(a.question_id));
      const selected = String(a.selected_option || '').toUpperCase().replace(/[^A-D]/g,'').slice(0,1) || null;
      const correct = !!selected && selected === String(q.correct_option).toUpperCase();
      const marks = correct ? Number(q.marks || 1) : 0; score += marks;
      await client.query('INSERT INTO attempt_answers (attempt_id,question_id,selected_option,is_correct,marks_awarded) VALUES ($1,$2,$3,$4,$5)', [attemptId,q.id,selected,correct,marks]);
    }
    await client.query('UPDATE quiz_attempts SET score=$1 WHERE id=$2', [score,attemptId]);
    await client.query('COMMIT');
    res.status(201).json({ status: 'ok', attempt: { ...attempt.rows[0], score, answer_count: valid.length }, message: 'Attempt submitted successfully' });
  } catch (error) { await client.query('ROLLBACK'); console.error('Submit attempt failed:', error.message); res.status(500).json({ status: 'error', message: 'Unable to submit quiz attempt' }); }
  finally { client.release(); }
});

// Results are normalized into the shape used by the existing frontend.
app.get('/api/results', async (req, res) => {
  try {
    const params = []; let where = '';
    if (req.query.studentId) { params.push(req.query.studentId); where = 'WHERE a.student_id=$1'; }
    const r = await pool.query(`SELECT a.id,a.student_id,a.quiz_id,a.started_at,a.submitted_at,a.score,a.status,
      s.full_name,s.email,q.title,q.points,q.duration_minutes
      FROM quiz_attempts a JOIN students s ON s.id=a.student_id JOIN quizzes q ON q.id=a.quiz_id ${where}
      ORDER BY a.submitted_at DESC NULLS LAST`, params);
    const results = [];
    for (const row of r.rows) {
      const detail = await pool.query(`SELECT aa.question_id,aa.selected_option,aa.is_correct,aa.marks_awarded,
        qu.question_text,qu.option_a,qu.option_b,qu.option_c,qu.option_d,qu.correct_option,qu.explanation,qu.marks
        FROM attempt_answers aa JOIN questions qu ON qu.id=aa.question_id WHERE aa.attempt_id=$1 ORDER BY aa.id`, [row.id]);
      const maxScore = detail.rows.reduce((sum,x)=>sum+Number(x.marks||1),0);
      const correct = detail.rows.filter(x=>x.is_correct).length;
      results.push({ id: `r${row.id}`, attemptId: String(row.id), userId: String(row.student_id), userName: row.full_name, userEmail: row.email,
        quizId: String(row.quiz_id), quizTitle: row.title, score: Number(row.score||0), maxScore, correct,
        totalTime: Math.max(1, Math.round((new Date(row.submitted_at||Date.now())-new Date(row.started_at||row.submitted_at||Date.now()))/1000)),
        finishedAt: row.submitted_at, answers: detail.rows.map(x=>({selected:x.selected_option, correct: x.is_correct})),
        questionSnapshot: detail.rows.map(x=>({id:String(x.question_id),question:x.question_text,optionA:x.option_a,optionB:x.option_b,optionC:x.option_c,optionD:x.option_d,answer:x.correct_option,explanation:x.explanation,marks:Number(x.marks||1)})) });
    }
    res.json({ status: 'ok', results });
  } catch (error) { console.error('Fetch results failed:', error.message); res.status(500).json({ status: 'error', message: 'Unable to fetch results' }); }
});

app.get('/api/students', verifyAdminToken, async (req,res) => {
  try { const r = await pool.query('SELECT id,full_name,email,created_at FROM students ORDER BY created_at DESC');
    res.json({status:'ok', students:r.rows.map(s=>({id:String(s.id),name:s.full_name,email:s.email,role:'student',registeredAt:s.created_at}))});
  } catch(error) { console.error('Fetch students failed:',error.message); res.status(500).json({status:'error',message:'Unable to fetch students'}); }
});

// Handle unknown API routes
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`QUANTUM API running at http://localhost:${PORT}`);
});

// Graceful shutdown
async function shutdown() {
  console.log("\nShutting down QUANTUM API...");

  server.close(async () => {
    try {
      await pool.end();
      console.log("Database pool closed.");
      process.exit(0);
    } catch (error) {
      console.error("Shutdown error:", error.message);
      process.exit(1);
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
