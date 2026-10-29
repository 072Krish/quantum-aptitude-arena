QUANTUM APTITUDE ARENA — UPDATED PROJECT

WHAT'S INCLUDED
- Existing index.html and style.css retained; no intended visual redesign.
- PostgreSQL-backed quiz loading, create/update/delete routes.
- Server-side quiz password hashing and password verification endpoint.
- PostgreSQL attempt submission and results retrieval routes.
- Student list endpoint for the admin dashboard.
- SQL schema for a fresh database.

IMPORTANT STATUS
This is an implementation build, not yet a security-certified or end-to-end-tested release. Database connection and browser flows must be tested on your machine. Security work remains: replace the demo admin login, add authenticated sessions/tokens and role-based authorization to all admin/attempt routes, prevent correct answers being sent to students before submission, add rate limiting and production CORS/HTTPS settings, and verify one-attempt enforcement under concurrent requests.

SETUP
1. Keep a backup of your original project folder.
2. Open backend/.env.example and create backend/.env with your local PostgreSQL credentials. Never share the real .env file.
3. Create the database (e.g. quantum_arena) in PostgreSQL if it does not exist.
4. If this is a new database, run backend/schema.sql in pgAdmin Query Tool. If you already have tables, do not blindly re-run schema changes; compare the existing schema first.
5. In a terminal, go to the backend folder and run:
   npm install
   npm start
6. Check http://localhost:5000/api/health. It should report database connected.
7. Open index.html using your usual local development server. Keep the backend running on port 5000.

ADMIN DEMO LOGIN
The current frontend still contains the original demo admin credentials (admin@quantum.demo / admin123). This is NOT secure and must be replaced before real users use the app. Do not deploy this build publicly until the security phase is complete.

NOTES
- Existing UI files were retained.
- The app still uses localStorage for UI preferences and a cache/fallback; main quiz and attempt persistence now has PostgreSQL API integration.
- Test on a copy first. Do not delete your original folder or database.
