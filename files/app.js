const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const KEY = 'quantum_aptitude_v2';
const API_BASE = 'http://localhost:5000';
const sampleQuestions = [
    { question: 'A number is increased by 20% and then decreased by 20%. What is the net change?', optionA: 'No change', optionB: '4% decrease', optionC: '4% increase', optionD: '2% decrease', answer: 'B', explanation: 'Let the number be 100. After a 20% increase it becomes 120. A 20% decrease on 120 gives 96, which is 4% below 100.', category: 'Quantitative Aptitude' },
    { question: 'Find the next number in the series: 3, 8, 15, 24, 35, ?', optionA: '46', optionB: '47', optionC: '48', optionD: '49', answer: 'C', explanation: 'The differences are 5, 7, 9, 11. The next difference is 13, so 35 + 13 = 48.', category: 'Logical Reasoning' },
    { question: 'If 5 workers complete a task in 12 days, how many days will 10 workers take at the same rate?', optionA: '3 days', optionB: '6 days', optionC: '8 days', optionD: '10 days', answer: 'B', explanation: 'Total work is 5 × 12 = 60 worker-days. With 10 workers, 60 ÷ 10 = 6 days.', category: 'Quantitative Aptitude' },
    { question: 'Choose the word closest in meaning to “meticulous”.', optionA: 'Careless', optionB: 'Hasty', optionC: 'Precise', optionD: 'Ordinary', answer: 'C', explanation: 'Meticulous means showing great attention to detail; precise is the closest option.', category: 'Verbal Ability' },
    { question: 'A train 180 m long crosses a pole in 9 seconds. What is its speed?', optionA: '60 km/h', optionB: '72 km/h', optionC: '80 km/h', optionD: '90 km/h', answer: 'B', explanation: 'Speed = 180/9 = 20 m/s. Converting to km/h: 20 × 18/5 = 72 km/h.', category: 'Quantitative Aptitude' },
    { question: 'In a code, MATH is written as NZUI. How is LOGIC written using the same pattern?', optionA: 'MPHJD', optionB: 'KNFHB', optionC: 'MNHJD', optionD: 'MPHIC', answer: 'A', explanation: 'Each letter moves one step forward: L→M, O→P, G→H, I→J, C→D.', category: 'Logical Reasoning' },
    { question: 'The average of 6 numbers is 14. If one number is removed, the average of the remaining five is 12. What number was removed?', optionA: '20', optionB: '22', optionC: '24', optionD: '26', answer: 'C', explanation: 'Sum of six numbers = 6 × 14 = 84. Sum of five = 5 × 12 = 60. Removed number = 84 − 60 = 24.', category: 'Quantitative Aptitude' },
    { question: 'Select the grammatically correct sentence.', optionA: 'Neither of the answers are correct.', optionB: 'Neither of the answers is correct.', optionC: 'Neither answers is correct.', optionD: 'Neither of answers are correct.', answer: 'B', explanation: '“Neither” is treated as singular in formal usage here, so it takes “is”.', category: 'Verbal Ability' },
    { question: 'A shopkeeper marks an item at ₹1,500 and gives a 10% discount. What is the selling price?', optionA: '₹1,250', optionB: '₹1,300', optionC: '₹1,350', optionD: '₹1,400', answer: 'C', explanation: '10% of ₹1,500 is ₹150. Selling price = ₹1,500 − ₹150 = ₹1,350.', category: 'Quantitative Aptitude' },
    { question: 'Pointing to a person, Riya says, “He is the son of my mother’s only daughter.” How is the person related to Riya?', optionA: 'Brother', optionB: 'Nephew', optionC: 'Son', optionD: 'Cousin', answer: 'C', explanation: 'Riya’s mother’s only daughter is Riya. Her son is Riya’s son.', category: 'Logical Reasoning' }
].map((q, i) => ({ ...q, id: 'q' + (i + 1) }));
let lastRaw = '', db = loadDB(), authRole = 'student', authMode = 'login', currentUser = null, currentPage = 'overview', quizConfig = null, questions = [], quizRun = null, timerInterval = null, csvImported = null;
try {
    const savedUser = localStorage.getItem('quantum_logged_in_user');

    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
} catch (error) {
    localStorage.removeItem('quantum_logged_in_user');
}
function loadDB() { try { return JSON.parse(localStorage.getItem(KEY)) || { users: [], results: [], questions: sampleQuestions, quizConfig: null } } catch (e) { return { users: [], results: [], questions: sampleQuestions, quizConfig: null } } }
function saveDB() { lastRaw = JSON.stringify(db); localStorage.setItem(KEY, lastRaw) }
function initials(n = 'User') { return n.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'U' }
function esc(s = '') { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function toast(msg) { let t = $('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600) }
function goAuth() { clearInterval(timerInterval); $('#quizOverlay').classList.add('hidden'); $('#appView').classList.add('hidden'); $('#authView').classList.remove('hidden') }
function setAuthMode(mode) { authMode = mode; $('#authTitle').textContent = mode === 'login' ? 'Enter the arena.' : 'Create your player card.'; $('#authEyebrow').textContent = mode === 'login' ? 'YOUR ARENA AWAITS' : 'JOIN THE CHALLENGE'; $('#authSubtitle').textContent = mode === 'login' ? 'Sign in to see the challenge and claim your rank.' : 'Register once, then head straight to the aptitude arena.'; $('#confirmWrap').classList.toggle('hidden', mode === 'login'); $('#authName').required = mode === 'signup'; $('#authSubmit').innerHTML = mode === 'login' ? 'Enter dashboard <span>↗</span>' : 'Create account <span>↗</span>'; $('#authToggleText').innerHTML = mode === 'login' ? 'New here? <button id="toggleAuth">Create an account</button>' : 'Already registered? <button id="toggleAuth">Sign in</button>'; $('#toggleAuth').onclick = () => setAuthMode(authMode === 'login' ? 'signup' : 'login'); resetEyes(); $('#authToggleText').classList.toggle('hidden', authRole === 'admin') }
$$('.role-option').forEach(b => b.onclick = () => { $$('.role-option').forEach(x => x.classList.toggle('active', x === b)); authRole = b.dataset.role; $('#authName').placeholder = authRole === 'admin' ? 'Admin' : 'e.g. Krish Garg'; $('#authEyebrow').textContent = authRole === 'admin' ? 'ADMIN CONTROL ROOM' : 'YOUR ARENA AWAITS'; $('#authSubtitle').textContent = authRole === 'admin' ? 'Sign in to manage the challenge, participants and results.' : 'Sign in to see the challenge and claim your rank.'; if (authRole === 'admin' && authMode === 'signup') { setAuthMode('login'); $('#authEyebrow').textContent = 'ADMIN CONTROL ROOM'; $('#authSubtitle').textContent = 'Sign in to manage the challenge, participants and results.' } $('#authToggleText').classList.toggle('hidden', authRole === 'admin'); });


$('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = $('#authName').value.trim();
    const email = $('#authEmail').value.trim().toLowerCase();
    const pass = $('#authPassword').value;

    if (authRole === 'admin' && authMode === 'signup') {
        return toast('Admin accounts cannot be created here.');
    }

    if (authRole === 'student' && authMode === 'signup') {
        if (!name) return toast('Please enter your full name.');

        if (pass.length < 8) {
            return toast('Password must be at least 8 characters.');
        }

        if (pass !== $('#authConfirm').value) {
            return toast('Passwords do not match.');
        }
    }

    const isAdmin = authRole === 'admin';

    const endpoint = isAdmin
        ? '/api/admin/login'
        : authMode === 'signup'
            ? '/api/signup'
            : '/api/login';

    const payload = authMode === 'signup' && !isAdmin
        ? { fullName: name, email, password: pass }
        : { email, password: pass };

    const submitButton = $('#authSubmit');
    submitButton.disabled = true;

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            return toast(data.message || 'Authentication failed.');
        }

        if (isAdmin) {
            if (!data.admin || data.admin.role !== 'admin') {
                return toast('Admin verification failed.');
            }

            currentUser = {
                id: String(data.admin.id),
                name: data.admin.name || 'Admin',
                email: data.admin.email,
                role: 'admin'
            };

            localStorage.setItem(
                'quantum_logged_in_user',
                JSON.stringify(currentUser)
            );

            // Admin JWT token save karo
localStorage.setItem('quantum_admin_token', data.token);

            toast('Admin login successful!');
            openApp();
            return;
        }

        const student = data.student;

        currentUser = {
            id: String(student.id),
            name: student.full_name,
            email: student.email,
            role: 'student'
        };

        localStorage.setItem(
            'quantum_logged_in_user',
            JSON.stringify(currentUser)
        );

        const existingIndex = db.users.findIndex(
            u => u.email === student.email
        );

        const safeProfile = {
            id: String(student.id),
            name: student.full_name,
            email: student.email,
            role: 'student',
            registeredAt: student.created_at || new Date().toISOString()
        };

        if (existingIndex >= 0) {
            db.users[existingIndex] = safeProfile;
        } else {
            db.users.push(safeProfile);
        }

        saveDB();

        toast(
            authMode === 'signup'
                ? 'Account created successfully!'
                : 'Login successful!'
        );

        openApp();
    } catch (error) {
        console.error('Authentication error:', error);
        toast('Cannot connect to server. Make sure the backend is running.');
    } finally {
        submitButton.disabled = false;
    }
});

function mapApiQuiz(q) {
    return {
        id: String(q.id),
        title: q.title || '',
        description: q.description || '',
        category: q.category || 'General',

        points: Number(q.points || 1),

        seconds: Math.max(
            1,
            Math.round(
                Number(q.duration_minutes || 1) * 60 /
                Math.max(1, (q.questions || []).length)
            )
        ),

        shuffleQuestions: !!q.shuffle_questions,
        shuffleOptions: !!q.shuffle_options,
        questionCount: Number(q.question_count || 0),

        passwordProtected: !!q.password_protected,
        password: '',
        startAt: q.scheduled_at || '',
        expiresAt: q.expires_at || '',
        createdAt: q.created_at || '',

        questions: (q.questions || []).map(x => ({
            id: String(x.id),
            question: x.question_text || '',

            optionA: String(x.option_a ?? x.optionA ?? x.a ?? ''),
            optionB: String(x.option_b ?? x.optionB ?? x.b ?? ''),
            optionC: String(x.option_c ?? x.optionC ?? x.c ?? ''),
            optionD: String(x.option_d ?? x.optionD ?? x.d ?? ''),

            answer: String(
                x.correct_option ?? x.answer ?? 'A'
            ).trim().toUpperCase(),

            explanation: x.explanation || '',
            marks: Number(x.marks || q.points || 1),
            category: q.category || 'General'
        }))
    };
}
function mapApiResult(r) { return { ...r, id: String(r.id), userId: String(r.userId), quizId: String(r.quizId), score: Number(r.score || 0), maxScore: Number(r.maxScore || 0), correct: Number(r.correct || 0), totalTime: Number(r.totalTime || 0), answers: r.answers || [], questionSnapshot: r.questionSnapshot || [] }; }
async function hydrateFromServer() {
    try {
        const qr = await fetch(`${API_BASE}/api/quizzes`); if (!qr.ok) throw new Error('quiz fetch failed');
        const qd = await qr.json(); if (qd.status === 'ok') { db.quizzes = (qd.quizzes || []).map(mapApiQuiz); quizConfig = db.quizzes[0] || null; questions = quizConfig ? quizConfig.questions : []; }
        if (currentUser && currentUser.role === 'student') {
            const rr = await fetch(`${API_BASE}/api/results?studentId=${encodeURIComponent(currentUser.id)}`);
            if (rr.ok) { const rd = await rr.json(); if (rd.status === 'ok') { const other = db.results.filter(x => String(x.userId) !== String(currentUser.id)); db.results = [...other, ...(rd.results || []).map(mapApiResult)]; } }
        } else if (currentUser && currentUser.role === 'admin') {
            const [rr, ur] = await Promise.all([fetch(`${API_BASE}/api/results`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('quantum_admin_token')}` } }), fetch(`${API_BASE}/api/students`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('quantum_admin_token')}` } })]);
            if (rr.ok) { const rd = await rr.json(); if (rd.status === 'ok') db.results = (rd.results || []).map(mapApiResult); }
            if (ur.ok) { const ud = await ur.json(); if (ud.status === 'ok') db.users = ud.students || []; }
        }
        saveDB(); if (currentUser) { renderNav(); renderPage(); }
    } catch (e) { console.warn('PostgreSQL sync unavailable; using cached data until API is reachable.', e.message); }
}
function openApp() { if (!currentUser) return; if (currentUser.role === 'admin') { currentUser.name = 'Admin'; saveDB() } settleInterrupted(); $('#authView').classList.add('hidden'); $('#appView').classList.remove('hidden'); $('#sideName').textContent = currentUser.name; $('#sideRole').textContent = currentUser.role === 'admin' ? 'Arena administrator' : 'Registered participant'; $('#sideAvatar').textContent = initials(currentUser.name); $('#topAvatar').textContent = initials(currentUser.name); $('#topName').textContent = currentUser.name.split(' ')[0]; currentPage = localStorage.getItem('quantum_last_page') || 'overview'; renderNav(); renderPage(); hydrateFromServer(); }
$('#logoutBtn').onclick = () => { currentUser = null; goAuth(); setAuthMode('login') }; $('#themeToggle').onclick = () => { document.body.classList.toggle('light-theme'); $('#themeToggle').textContent = document.body.classList.contains('light-theme') ? '☾' : '☼' };
function renderNav() {
    if (!currentUser) {
        console.error('renderNav: currentUser is null');
        return;
    }

    const admin = currentUser.role === 'admin';

    let items = admin
        ? [
            ['overview', '⌂', 'Overview'],
            ['leaderboard', '♜', 'Leaderboard'],
            ['users', '♙', 'Registered users'],
            ['quiz', '∑', 'Quiz settings']
        ]
        : [
            ['overview', '⌂', 'Dashboard'],
            ['myresult', '◷', 'My results']
        ];

    $('#sideNav').innerHTML = items.map(([id, ic, label]) =>
        `<button class="nav-link ${currentPage === id ? 'active' : ''}"
            data-page="${id}">
            <span class="nav-icon">${ic}</span>
            <span>${label}</span>
        </button>`
    ).join('');

    $$('.nav-link').forEach(b => {
        b.onclick = () => {
            currentPage = b.dataset.page;
            renderNav();
            renderPage();
        };
    });
}
function allResults() { return [...db.results].sort((a, b) => b.score - a.score || a.totalTime - b.totalTime || new Date(a.finishedAt) - new Date(b.finishedAt)) }
function leaderboard(quizId) { const best = {}; allResults().forEach(r => { if (quizId && r.quizId !== quizId) return; const k = r.userId + '|' + r.quizId; if (!best[k]) best[k] = r }); return Object.values(best) }
function averageTimeForUser(userId) { let arr = db.results.filter(r => r.userId === userId); if (!arr.length) return null; return arr.reduce((s, r) => s + r.totalTime, 0) / arr.length }
function fmtTime(sec) { if (sec == null || !Number.isFinite(sec)) return '—'; let s = Math.round(sec); return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` }
function userFor(id) { return db.users.find(u => u.id === id) || { name: 'Deleted participant', email: '—' } }
function head(title, sub, action = '') { return `<div class="welcome-row"><div><span class="tag-line">✳ QUANTUM / ${esc(title.toUpperCase())}</span><h1>${title}</h1><p>${sub}</p></div>${action}</div>` }
function stat(label, value, foot, icon) { return `<div class="stat-card"><div class="stat-head"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-foot">${foot}</div></div>` }
function renderPage() { const admin = currentUser.role === 'admin'; localStorage.setItem('quantum_last_page', currentPage); $('#crumb').textContent = `${admin ? 'ADMIN CONSOLE' : 'WORKSPACE'} / ${currentPage.toUpperCase()}`; $('#pageHeading').innerHTML = `${greeting()}, ${esc(currentUser.name.split(' ')[0])} <span>✦</span>`; let html = ''; if (currentPage === 'overview') html = admin ? adminOverview() : studentOverview(); else if (currentPage === 'leaderboard' && admin) html = leaderboardPage(); else if (currentPage === 'users' && admin) html = usersPage(); else if (currentPage === 'quiz' && admin) html = quizSettingsPage(); else if (currentPage === 'myresult' && !admin) html = myResultsPage(); else { currentPage = 'overview'; localStorage.setItem('quantum_last_page', currentPage); renderNav(); html = admin ? adminOverview() : studentOverview() } $('#pageContent').innerHTML = html; bindPage() }
function greeting() { let h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }
function recent(n, a) { return [...a].sort((x, y) => new Date(y.finishedAt) - new Date(x.finishedAt)).slice(0, n) }
function fmtDT(i) { return i ? new Date(i).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '' }
function quizState(q = quizConfig) { if (!q) return 'none'; const n = Date.now(); if (q.startAt && n < new Date(q.startAt)) return 'scheduled'; if (q.expiresAt && n >= new Date(q.expiresAt)) return 'closed'; return 'open' }
function statusPill(q = quizConfig) { return { open: '● LIVE', scheduled: '● SCHEDULED', closed: '● CLOSED', none: '● NO QUIZ' }[quizState(q)] }
function userCell(u) { return `<div class="user-cell"><span class="avatar">${initials(u.name)}</span><span><strong>${esc(u.name)}</strong><small class="subtext">${esc(u.email)}</small></span></div>` }
function adminOverview() {
    const users = db.users.filter(u => u.role === 'student'), res = db.results, L = quizzes(), live = L.filter(q => quizState(q) === 'open').length, avg = res.length ? res.reduce((s, r) => s + r.totalTime, 0) / res.length : 0, latest = recent(10, res), seen = new Set(), lat7 = recent(999, res).filter(r => !seen.has(r.userId) && seen.add(r.userId)).slice(0, 7), mx = Math.max(...lat7.map(r => averageTimeForUser(r.userId) || 0), 1);
    return `${head('Control the arena', 'Your competition at a glance. Latest activity first.', '<button class="btn btn-primary" id="openCreate">＋ Create quiz</button>')}<div class="stats-grid">${stat('REGISTERED USERS', users.length, 'Student accounts', '♙')}${stat('QUIZZES', L.length, `${live} live right now`, '∑')}${stat('QUIZ ATTEMPTS', res.length, 'Across all quizzes', '◷')}${stat('AVG. COMPLETION TIME', res.length ? fmtTime(avg) : '—', 'Across attempts', '◴')}</div><div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h3>Participant performance</h3><p>Latest ${latest.length} of ${res.length} submissions</p></div><button class="text-link" data-go="leaderboard">View more ↗</button></div>${latest.length ? `<div class="table-wrap"><table><thead><tr><th>PARTICIPANT</th><th>QUIZ</th><th>SCORE</th><th>TIME</th><th>RANK</th></tr></thead><tbody>${latest.map(r => `<tr><td>${userCell(userFor(r.userId))}</td><td>${esc(r.quizTitle)}</td><td><strong>${r.score}/${r.maxScore}</strong></td><td>${fmtTime(r.totalTime)}</td><td><span class="badge muted-badge">#${leaderboard(r.quizId).findIndex(x => x.userId === r.userId) + 1}</span></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-state"><strong>No scores yet</strong>Submissions will appear here.</div>`}</section><section class="panel"><div class="panel-head"><div><h3>Quizzes</h3><p>${L.length} total · ${live} live</p></div><button class="text-link" data-go="quiz">Manage ↗</button></div>${L.length ? `<div class="mini-list">${L.slice(-4).reverse().map(q => `<div class="mini-row"><div><strong>${esc(q.title)}</strong><small class="subtext">${qCount(q)} questions · ${q.seconds}s each</small></div><span class="badge">${statusPill(q).replace('● ', '')}</span></div>`).join('')}</div>` : `<div class="empty-state"><strong>No quizzes yet.</strong>Create one to open a challenge.</div>`}</section></div><div class="analytics-grid"><section class="panel"><div class="panel-head"><div><h3>Average time per participant</h3><p>Latest ${lat7.length} participants</p></div><button class="text-link" data-go="leaderboard">View more ↗</button></div>${lat7.length ? `<div class="bar-chart">${lat7.map(r => { const u = userFor(r.userId), t = averageTimeForUser(r.userId) || 0; return `<div class="bar-row"><span>${esc(u.name.split(' ')[0])}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, t / mx * 100)}%"></div></div><b>${Math.round(t)}s</b></div>` }).join('')}</div>` : `<div class="empty-state">Timing analytics will appear after the first submission.</div>`}</section><section class="panel"><div class="panel-head"><div><h3>Quick actions</h3><p>Manage your competition</p></div></div><div class="quick-actions"><button class="btn btn-secondary" data-go="users">♙ View registered users</button> <button class="btn btn-secondary" data-go="leaderboard">♜ Open leaderboard</button> <button class="btn btn-secondary" data-go="quiz">∑ Quiz settings</button></div></section></div>`
}
function quizCardS(q) { const my = myResult(q), st = quizState(q), n = qCount(q), rr = my ? myRank(q.id) : null, pill = my ? 'COMPLETED' : st === 'open' ? 'OPEN FOR ENTRY' : st === 'scheduled' ? 'OPENS ' + fmtDT(q.startAt).toUpperCase() : 'CLOSED'; return `<section class="quiz-card"><div class="quiz-card-top"><span class="pill pill-purple">${esc(q.category)}</span><span class="pill pill-live">● ${pill}</span></div><h2>${esc(q.title)}</h2><p>${my ? `You scored <b>${my.score}/${my.maxScore}</b> in ${fmtTime(my.totalTime)}. One attempt is allowed per quiz.` : 'One attempt only. The quiz opens in full screen and every question has its own timer.'}</p><div class="quiz-meta"><span>▤ <b>${n} questions</b></span><span>◷ <b>${q.seconds}s each</b></span><span>✦ <b>${n * q.points} max points</b></span>${q.passwordProtected ? '<span>🔒 <b>Password</b></span>' : ''}${q.expiresAt ? `<span>⏰ closes <b>${fmtDT(q.expiresAt)}</b></span>` : ''}</div><div class="card-actions">${my ? `<button class="btn btn-secondary" data-res="${my.id}">View result</button>${st !== 'closed' ? `<span class="rank-note">🔒 Rank unlocks ${q.expiresAt ? 'after ' + fmtDT(q.expiresAt) : 'when the quiz closes'}</span>` : rankShown[q.id] && rr ? `<span class="rank-note">Expected rank <b>#${rr.rank}</b> of ${rr.total}</span>` : `<button class="btn btn-ghost" data-rank="${q.id}">Show expected rank</button>`}` : st === 'open' ? `<button class="btn btn-primary" data-start="${q.id}">Start quiz <span>↗</span></button>` : `<button class="btn btn-secondary" disabled>${st === 'closed' ? 'Quiz closed' : 'Not open yet'}</button>`}</div></section>` }
function studentOverview() { const L = quizzes(), mine = db.results.filter(r => r.userId === currentUser.id), acc = mine.length ? Math.round(mine.reduce((s, r) => s + r.score / Math.max(1, r.maxScore), 0) / mine.length * 100) : 0; lastState = sig(); return `${head('Your arena', 'One attempt per quiz. Make each one count.')}${L.length ? `<div class="stats-grid">${stat('QUIZZES', L.length, `${L.filter(q => quizState(q) === 'open').length} open now`, '∑')}${stat('COMPLETED', mine.length, 'Attempts used', '✦')}${stat('ACCURACY', mine.length ? acc + '%' : '—', 'Average across attempts', '◎')}${stat('TIME SPENT', mine.length ? fmtTime(mine.reduce((s, r) => s + r.totalTime, 0)) : '—', 'Across attempts', '◷')}</div><div class="quiz-list">${L.map(quizCardS).join('')}</div>` : `<div class="empty-state"><strong>No quiz is live right now.</strong>Check back when your teacher schedules the next challenge.</div>`}` }
function lbUpdate() { lbState.quiz = $('#lbQuiz').value; lbState.sort = $('#lbSort').value; lbState.q = $('#lbSearch').value; const rows = lbRows(); $('#lbCount').textContent = `${rows.length} entries · best attempt per participant per quiz`; $('#lbTable').innerHTML = lbTable(rows); const lv = $('#lbLive'); if (lv) lv.textContent = '● LIVE · ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }) }
let lbState = { quiz: null, q: '', sort: 'rank' };
function quizOptions() { const m = new Map(); db.results.forEach(r => m.set(r.quizId, r.quizTitle)); quizzes().forEach(q => m.set(q.id, q.title)); return [...m] }
function lbRows() { const per = {}, rk = {}; leaderboard().forEach(r => { per[r.quizId] = (per[r.quizId] || 0) + 1; rk[r.id] = per[r.quizId] }); const pc = r => r.score / Math.max(1, r.maxScore), q = lbState.q.toLowerCase(); let rows = leaderboard(lbState.quiz === 'all' ? '' : lbState.quiz).filter(r => { const u = userFor(r.userId); return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) }).map(r => ({ ...r, rank: rk[r.id] })); const S = { rank: (a, b) => pc(b) - pc(a) || a.totalTime - b.totalTime, low: (a, b) => pc(a) - pc(b) || b.totalTime - a.totalTime, time: (a, b) => a.totalTime - b.totalTime, latest: (a, b) => new Date(b.finishedAt) - new Date(a.finishedAt), name: (a, b) => userFor(a.userId).name.localeCompare(userFor(b.userId).name), quiz: (a, b) => String(a.quizTitle).localeCompare(String(b.quizTitle)) || a.rank - b.rank }; return rows.sort(S[lbState.sort] || S.rank) }
function lbTable(rows) { if (!rows.length) return `<div class="empty-state"><strong>No entries match.</strong>Try another quiz or clear the search.</div>`; return `<div class="table-wrap"><table><thead><tr><th>RANK</th><th>PARTICIPANT</th><th>QUIZ</th><th>SCORE</th><th>TIME TAKEN</th><th>AVG TIME</th><th>SUBMITTED</th></tr></thead><tbody>${rows.map(r => `<tr class="lb-row ${r.rank < 4 ? 'top' + r.rank : ''}"><td><span class="rank-badge ${r.rank === 1 ? 'gold' : ''}">#${r.rank}</span></td><td>${userCell(userFor(r.userId))}</td><td>${esc(r.quizTitle)}</td><td><strong>${r.score}/${r.maxScore}</strong><small class="subtext">${Math.round(r.score / Math.max(1, r.maxScore) * 100)}%</small></td><td>${fmtTime(r.totalTime)}</td><td>${fmtTime(averageTimeForUser(r.userId))}</td><td>${fmtDT(r.finishedAt)}</td></tr>`).join('')}</tbody></table></div>` }
function leaderboardPage() { if (lbState.quiz == null) lbState.quiz = 'all'; const sorts = [['rank', 'Rank (best first)'], ['time', 'Fastest time'], ['latest', 'Latest submission'], ['low', 'Lowest score'], ['name', 'Name A–Z'], ['quiz', 'Quiz name']]; return `${head('Leaderboard', 'Rank is per quiz: higher score first, then faster time.')}<section class="panel"><div class="panel-head"><div><h3>Standings</h3><p id="lbCount"></p></div><span class="badge" id="lbLive">● LIVE</span></div><div class="lb-filters"><label>Quiz<select id="lbQuiz"><option value="all">All quizzes</option>${quizOptions().map(([id, t]) => `<option value="${esc(id)}" ${lbState.quiz === id ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label><label>Sort by<select id="lbSort">${sorts.map(([v, l]) => `<option value="${v}" ${lbState.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label>Search<input id="lbSearch" class="search-input" placeholder="Name or email…" value="${esc(lbState.q)}"/></label></div><div id="lbTable"></div></section>` }
function usersPage() { let users = db.users.filter(u => u.role === 'student'); return `${head('Registered users', 'Every successful student signup is listed here.', '<button class="btn btn-secondary" id="exportUsers">↓ Export CSV</button>')}<div class="stats-grid">${stat('TOTAL SIGNUPS', users.length, 'Student accounts', '♙')}${stat('ATTEMPTED', users.filter(u => db.results.some(r => r.userId === u.id)).length, 'Started and submitted', '✓')}${stat('NOT ATTEMPTED', users.filter(u => !db.results.some(r => r.userId === u.id)).length, 'Still to take the quiz', '◷')}${stat('COMPLETION RATE', users.length ? `${Math.round(users.filter(u => db.results.some(r => r.userId === u.id)).length / users.length * 100)}%` : '0%', 'Registered users who submitted', '↗')}</div><section class="panel"><div class="panel-head"><div><h3>Participant directory</h3><p>Signup details and quiz activity</p></div><div class="page-tools"><input id="userSearch" class="search-input" placeholder="Search name or email…"/></div></div><div id="usersTable">${usersTable(users)}</div></section>` }
function usersTable(users) { if (!users.length) return `<div class="empty-state"><strong>No registered students yet.</strong>Successful student signups will be stored and listed here.</div>`; return `<div class="table-wrap"><table><thead><tr><th>PARTICIPANT</th><th>REGISTERED ON</th><th>QUIZ STATUS</th><th>BEST SCORE</th><th>AVG TIME</th></tr></thead><tbody>${users.map(u => { let rs = db.results.filter(r => r.userId === u.id), best = rs.reduce((a, r) => !a || r.score > a.score ? r : a, null); return `<tr><td><div class="user-cell"><span class="avatar">${initials(u.name)}</span><span><strong>${esc(u.name)}</strong><small class="subtext">${esc(u.email)}</small></span></div></td><td>${new Date(u.registeredAt).toLocaleDateString()}</td><td><span class="badge ${rs.length ? '' : 'muted-badge'}">${rs.length ? 'Completed' : 'Not attempted'}</span></td><td>${best ? `${best.score}/${best.maxScore}` : '—'}</td><td>${fmtTime(averageTimeForUser(u.id))}</td></tr>` }).join('')}</tbody></table></div>` }
function settingsCard(q) { const sh = [q.shuffleQuestions && 'Questions', q.shuffleOptions && 'Options'].filter(Boolean).join(' + ') || 'Off'; return `<section class="quiz-card settings-card"><div class="quiz-card-top"><span class="pill pill-purple">${esc(q.category)}</span><span class="pill pill-live">${statusPill(q)}</span></div><h2>${esc(q.title)}</h2><div class="quiz-meta"><span>▤ <b>${qCount(q)} of ${q.questions.length} questions</b></span><span>◷ <b>${q.seconds}s each</b></span><span>✦ <b>${q.points} pts each</b></span><span>∑ <b>${qCount(q) * q.points} max points</b></span></div><dl class="set-grid"><div><dt>Opens</dt><dd>${q.startAt ? fmtDT(q.startAt) : 'Immediately'}</dd></div><div><dt>Closes</dt><dd>${q.expiresAt ? fmtDT(q.expiresAt) : 'No expiry'}</dd></div><div><dt>Password</dt><dd>${q.passwordProtected ? `<span data-pw="${q.id}">••••••</span> <button class="text-link" data-pwview="${q.id}">View</button>` : 'Not protected'}</dd></div><div><dt>Shuffle</dt><dd>${sh}</dd></div></dl><div class="card-actions"><button class="btn btn-primary" data-edit="${q.id}">✎ Edit settings</button><button class="btn btn-danger" data-del="${q.id}">🗑 Delete</button></div></section>` }
function quizSettingsPage() { const L = quizzes(); return `${head('Quiz settings', 'One card per quiz. Edit opens a form with all its settings.', '<button class="btn btn-primary" id="openCreate">＋ Create quiz</button>')}${L.length ? `<div class="quiz-list">${L.map(settingsCard).join('')}</div>` : `<div class="empty-state"><strong>No quizzes yet.</strong>Create one to open a challenge. Past results remain on the leaderboard.</div>`}` }
function resCard(r) { const q = quizzes().find(x => x.id === r.quizId), rr = myRank(r.quizId), open = rankOpen(r.quizId), n = r.answers.length, acc = Math.round(r.score / Math.max(1, r.maxScore) * 100), on = resView === r.id, rk = !open ? `<b>🔒</b><small>RANK · AFTER QUIZ CLOSES</small>` : rankShown[r.quizId] && rr ? `<b>#${rr.rank} <span class="of">of ${rr.total}</span></b><small>EXPECTED RANK</small>` : `<button class="text-link" data-rank="${r.quizId}">Show</button><small>EXPECTED RANK</small>`; return `<article class="res-card ${on ? 'active' : ''}"><div>${q ? `<span class="pill pill-purple">${esc(q.category)}</span>` : ''}<h3>${esc(r.quizTitle)}</h3><span class="when">Submitted ${fmtDT(r.finishedAt)}</span></div><div class="res-score"><b>${r.score}</b><span>/ ${r.maxScore} pts</span><em>${acc}%</em></div><div class="bar-track"><div class="bar-fill" style="width:${acc}%"></div></div><div class="res-metrics"><div>${rk}</div><div><b>${fmtTime(r.totalTime)}</b><small>TIME TAKEN</small></div><div><b>${r.correct}/${n}</b><small>CORRECT</small></div><div><b>${Math.round(r.totalTime / Math.max(1, n))}s</b><small>AVG / QUESTION</small></div></div><button class="btn ${on ? 'btn-primary' : 'btn-secondary'}" data-res="${r.id}">${on ? 'Hide answers' : 'View answers'}</button></article>` }
function myResultsPage() {
    const my = db.results.filter(r => r.userId === currentUser.id).sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt)), done = new Set(my.map(r => r.quizId)), todo = quizzes().filter(q => !done.has(q.id)), pc = r => Math.round(r.score / Math.max(1, r.maxScore) * 100), sel = my.find(r => r.id === resView);
    const pending = todo.length ? `<section class="panel" style="margin-top:20px"><div class="panel-head"><div><h3>Not attempted</h3><p>Quizzes without a result yet</p></div></div><div class="mini-list">${todo.map(q => { const st = quizState(q); return `<div class="mini-row"><div><strong>${esc(q.title)}</strong><small class="subtext">${st === 'closed' ? 'Closed · you missed this one' : st === 'scheduled' ? 'Opens ' + fmtDT(q.startAt) : 'Open now'}</small></div>${st === 'open' ? '<button class="btn btn-primary" data-go="overview">Start</button>' : `<span class="badge muted-badge">${st === 'closed' ? 'MISSED' : 'SOON'}</span>`}</div>` }).join('')}</div></section>` : '';
    if (!my.length) return `${head('My results', 'Your scorecard, time and rank for every quiz.')}<div class="empty-state"><strong>No completed attempts yet.</strong>Head back to the dashboard and start a quiz.</div>${pending}`;
    const best = my.reduce((a, b) => pc(b) > pc(a) ? b : a), wrong = sel ? sel.answers.filter((a, i) => a.selected && a.selected !== sel.questionSnapshot[i].answer).length : 0, skip = sel ? sel.answers.filter(a => !a.selected).length : 0;
    return `${head('My results', 'Every quiz you have taken, with score, time and rank.')}<div class="stats-grid">${stat('QUIZZES TAKEN', my.length, `of ${quizzes().length} available`, '∑')}${stat('AVG. ACCURACY', Math.round(my.reduce((s, r) => s + pc(r), 0) / my.length) + '%', 'Across all attempts', '◎')}${stat('BEST SCORE', pc(best) + '%', esc(best.quizTitle), '✦')}${stat('TOTAL TIME', fmtTime(my.reduce((s, r) => s + r.totalTime, 0)), 'Across all attempts', '◷')}</div><div class="res-grid">${my.map(resCard).join('')}</div>${sel ? `<section class="panel" id="reviewPanel"><div class="panel-head"><div><h3>Answer review · ${esc(sel.quizTitle)}</h3><p>Correct answers and explanations for this attempt</p></div></div><div class="review-summary"><span class="badge">✓ ${sel.correct} correct</span><span class="badge muted-badge">✕ ${wrong} wrong</span><span class="badge muted-badge">– ${skip} skipped</span></div><div class="answer-review">${sel.answers.map((a, i) => { let q = sel.questionSnapshot[i], correct = a.selected === q.answer; return `<div class="review-item"><h4>${i + 1}. ${esc(q.question)}</h4><p class="${correct ? 'correct-text' : 'wrong-text'}">Your answer: ${a.selected ? esc(q['option' + a.selected]) : 'Not answered'} ${correct ? '✓' : '✕'}</p><p class="correct-text">Correct answer: ${esc(q['option' + q.answer])}</p><p>✳ ${esc(q.explanation || 'Review the correct option above.')}</p></div>` }).join('')}</div></section>` : ''}${pending}`
}
function bindPage() { $$('[data-go]').forEach(b => b.onclick = () => { currentPage = b.dataset.go; renderNav(); renderPage() }); let oc = $('#openCreate'); if (oc) oc.onclick = () => openCreateModal('new'); $$('[data-edit]').forEach(b => b.onclick = () => openCreateModal('edit', b.dataset.edit)); $$('[data-del]').forEach(b => b.onclick = () => deleteQuiz(b.dataset.del)); $$('[data-pwview]').forEach(b => b.onclick = () => { const t = $(`[data-pw="${b.dataset.pwview}"]`), q = quizzes().find(x => x.id === b.dataset.pwview), s = t.textContent === '••••••'; t.textContent = s ? q.password : '••••••'; b.textContent = s ? 'Hide' : 'View' }); if ($('#lbQuiz')) { $('#lbQuiz').onchange = $('#lbSort').onchange = lbUpdate; $('#lbSearch').oninput = lbUpdate; lbUpdate() } $$('[data-rank]').forEach(b => b.onclick = () => { if (!rankOpen(b.dataset.rank)) return toast('Rank unlocks once the quiz closes.'); rankShown[b.dataset.rank] = true; renderPage() }); $$('[data-start]').forEach(b => b.onclick = () => startQuiz(b.dataset.start)); $$('[data-res]').forEach(b => b.onclick = () => { resView = (currentPage === 'myresult' && resView === b.dataset.res) ? null : b.dataset.res; currentPage = 'myresult'; renderNav(); renderPage(); if (resView) { const p = document.getElementById('reviewPanel'); if (p && p.scrollIntoView) p.scrollIntoView({ behavior: 'smooth', block: 'start' }) } }); let exp = $('#exportUsers'); if (exp) exp.onclick = exportUsers; let search = $('#userSearch'); if (search) search.oninput = () => { let q = search.value.toLowerCase(); $('#usersTable').innerHTML = usersTable(db.users.filter(u => u.role === 'student' && (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)))) } }
let modalMode = 'edit', editId = null;
function toLocalInput(i) { if (!i) return ''; const d = new Date(i), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }
function syncPw() { const on = $('#pwProtect').checked; $('#pwWrap').classList.toggle('hidden', !on); $('#quizPassword').required = on }
$('#pwProtect').onchange = syncPw;

function openCreateModal(mode, id) { editId = mode === 'edit' ? id : null; const cur = editId ? quizzes().find(x => x.id === editId) : null, e = !!cur; modalMode = e ? 'edit' : 'new'; const c = cur || { title: '', category: 'Mixed Aptitude', points: 10, seconds: 45, shuffleQuestions: true, shuffleOptions: true, passwordProtected: false, password: '', startAt: '', expiresAt: '' }, bank = e ? cur.questions.length : sampleQuestions.length; $('#modalTitle').textContent = e ? 'Edit quiz' : 'Create quiz'; $('#quizTitleInput').value = c.title; $('#quizTitleInput').placeholder = 'e.g. Weekly Aptitude Sprint'; $('#quizCategoryInput').value = c.category; $('#pointsInput').value = c.points; $('#secondsInput').value = c.seconds; $('#questionCountInput').max = bank; $('#questionCountInput').value = e ? qCount(cur) : Math.min(10, bank); updateBankHint(bank); if (!e) $('#bankHint').textContent += ' Upload a CSV to use your own questions.'; $('#startAtInput').value = toLocalInput(c.startAt); $('#expiresAtInput').value = toLocalInput(c.expiresAt); $('#pwProtect').checked = !!c.passwordProtected; $('#quizPassword').value = c.password || ''; resetEyes(); syncPw(); $('#shuffleQuestions').checked = c.shuffleQuestions; $('#shuffleOptions').checked = c.shuffleOptions; $('#csvFile').value = ''; $('#csvFileName').textContent = 'No file selected'; csvImported = null; $('#createModal').classList.remove('hidden') }
$('#closeModal').onclick = $('#cancelModal').onclick = () => $('#createModal').classList.add('hidden'); $('#csvFile').onchange = async e => { const f = e.target.files[0]; if (!f) return; $('#csvFileName').textContent = f.name; try { csvImported = parseCSV(await f.text()); if (!csvImported.length) throw Error('No questions found'); $('#questionCountInput').max = csvImported.length; updateBankHint(csvImported.length); toast(`${csvImported.length} questions ready to import.`) } catch (err) { csvImported = null; toast('CSV format could not be read. Check the sample CSV.') } };
function parseCSV(text) { let lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/); if (lines.length < 2) throw Error('empty'); let headers = splitCSVLine(lines.shift()).map(x => x.trim().toLowerCase()); const aliases = { question: ['question', 'questions'], optionA: ['optiona', 'option a', 'a'], optionB: ['optionb', 'option b', 'b'], optionC: ['optionc', 'option c', 'c'], optionD: ['optiond', 'option d', 'd'], answer: ['answer', 'correct answer', 'correct'], explanation: ['explanation', 'solution'], category: ['category', 'topic'] }; let idx = {}; Object.entries(aliases).forEach(([k, vs]) => idx[k] = headers.findIndex(h => vs.includes(h))); if (idx.question < 0 || idx.answer < 0 || ['optionA', 'optionB', 'optionC', 'optionD'].some(k => idx[k] < 0)) throw Error('headers'); return lines.filter(l => l.trim()).map((l, i) => { let c = splitCSVLine(l), o = {}; Object.keys(idx).forEach(k => o[k] = idx[k] >= 0 ? (c[idx[k]] || '').trim() : ''); o.answer = o.answer.toUpperCase().replace('OPTION ', '').trim(); if (!['A', 'B', 'C', 'D'].includes(o.answer) || !o.question || !o.optionA || !o.optionB || !o.optionC || !o.optionD) throw Error('row ' + (i + 2)); return { ...o, id: 'csv' + (i + 1), category: o.category || 'Mixed Aptitude' } }) }
function splitCSVLine(line) { let out = [], cur = '', q = false; for (let i = 0; i < line.length; i++) { let c = line[i]; if (c === '"' && line[i + 1] === '"' && q) { cur += '"'; i++ } else if (c === '"') q = !q; else if (c === ',' && !q) { out.push(cur); cur = '' } else cur += c } out.push(cur); return out }
$('#createQuizForm').onsubmit = async e => {
    e.preventDefault();

    const prot = $('#pwProtect').checked;
    const pw = $('#quizPassword').value.trim();
    const sv = $('#startAtInput').value;
    const ev = $('#expiresAtInput').value;

    const sa = sv ? new Date(sv).toISOString() : null;
    const ea = ev ? new Date(ev).toISOString() : null;

    if (prot && pw.length < 4)
        return toast('Set a quiz password of at least 4 characters.');

    if (ea && new Date(ea) <= new Date())
        return toast('Closing time must be in the future.');

    if (sa && ea && new Date(ea) <= new Date(sa))
        return toast('Closing time must be after the opening time.');

    const cur = editId ? quizzes().find(x => x.id === editId) : null;
    const bank = csvImported?.length
        ? csvImported
        : (cur ? cur.questions : sampleQuestions.map(q => ({ ...q })));

    const title = $('#quizTitleInput').value.trim();
    if (!title) return toast('Enter a quiz title.');

    const payload = {
        title,
        description: '',
        category: $('#quizCategoryInput').value || 'General',
        duration_minutes: Math.max(
            1,
            Math.ceil((+$('#secondsInput').value * Math.max(1, bank.length)) / 60)
        ),
        points: +$('#pointsInput').value || 1,
        shuffle_questions: $('#shuffleQuestions').checked,
        shuffle_options: $('#shuffleOptions').checked,
        question_count: Math.max(
            1,
            Math.min(+$('#questionCountInput').value || 1, bank.length)
        ),
        password_protected: prot,
        password: prot ? pw : null,
        password_hash: null,
        scheduled_at: sa,
        expires_at: ea,
        status: 'draft',
        questions: bank.map(q => ({
            question_text: q.question_text ?? q.question ?? q.text ?? '',
            
option_a: q.option_a ?? q.optionA ?? q.options?.[0] ?? q.a ?? '',
option_b: q.option_b ?? q.optionB ?? q.options?.[1] ?? q.b ?? '',
option_c: q.option_c ?? q.optionC ?? q.options?.[2] ?? q.c ?? '',
option_d: q.option_d ?? q.optionD ?? q.options?.[3] ?? q.d ?? '',
            correct_option: String(
                q.correct_option ?? q.answer ?? q.correctAnswer ?? 'A'
            ).toUpperCase().replace(/[^A-D]/g, '').slice(0, 1) || 'A',
            explanation: q.explanation ?? '',
            marks: +q.marks || (+$('#pointsInput').value || 1)
        }))
    };

    try {
        const response = await fetch(
            cur
                ? `${API_BASE}/api/quizzes/${cur.id}`
                : `${API_BASE}/api/quizzes`,
            {
                method: cur ? 'PUT' : 'POST',
                headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('quantum_admin_token')}`
},
                body: JSON.stringify(payload)
            }
        );

        const data = await response.json();

        if (!response.ok || data.status !== 'ok') {
            throw new Error(data.message || 'Unable to save quiz.');
        }

        const savedQuiz = {
            id: String(data.quiz.id),
            createdAt: data.quiz.created_at || new Date().toISOString(),
            title: payload.title,
            category: payload.category,
            points: payload.points,
            seconds: +$('#secondsInput').value,
            shuffleQuestions: payload.shuffle_questions,
            shuffleOptions: payload.shuffle_options,
            questionCount: payload.question_count,
            passwordProtected: prot,
            password: prot ? pw : '',
            startAt: sa || '',
            expiresAt: ea || '',
            questions: bank
        };

        if (cur) {
            db.quizzes[db.quizzes.indexOf(cur)] = savedQuiz;
        } else {
            db.quizzes.push(savedQuiz);
        }

        if (quizConfig && cur && quizConfig.id === cur.id) {
            useQuiz(savedQuiz);
        }

        saveDB();
        $('#createModal').classList.add('hidden');
        await hydrateFromServer();
        renderPage();
        toast(cur ? 'Quiz updated.' : 'Quiz created and saved to database.');
    } catch (error) {
        console.error('Quiz save failed:', error);
        toast(error.message || 'Could not save quiz. Check backend server.');
    }
};
function exportUsers() { let rows = [['Name', 'Email', 'Role', 'Registered At', 'Quiz Status', 'Best Score', 'Average Time Seconds']]; db.users.filter(u => u.role === 'student').forEach(u => { let rs = db.results.filter(r => r.userId === u.id), best = rs.reduce((a, r) => !a || r.score > a.score ? r : a, null); rows.push([u.name, u.email, u.role, u.registeredAt, rs.length ? 'Completed' : 'Not attempted', best ? best.score : '', averageTimeForUser(u.id) ?? '']) }); let csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n'), url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), a = document.createElement('a'); a.href = url; a.download = 'quantum_registered_users.csv'; a.click(); URL.revokeObjectURL(url); toast('Registered users CSV exported.') }
function shuffle(arr) { let a = [...arr]; for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a }
function stopQuestionTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null } }
function renderQuestion() { stopQuestionTimer(); let q = quizRun.questions[quizRun.index]; console.log("QUESTION OPTIONS:", { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD }); quizRun.remaining = quizConfig.seconds; quizRun.questionStarted = Date.now(); $('#quizTopCount').textContent = `QUESTION ${String(quizRun.index + 1).padStart(2, '0')} / ${String(quizRun.questions.length).padStart(2, '0')}`; $('#questionIndex').innerHTML = `${String(quizRun.index + 1).padStart(2, '0')} <span>/ ${quizRun.questions.length}</span>`; $('#questionCategory').textContent = q.category || quizConfig.category.toUpperCase(); $('#questionText').textContent = q.question; $('#timerValue').textContent = quizRun.remaining; $('#timerRing').style.borderColor = 'var(--lime)'; $('#quizProgressFill').style.width = `${quizRun.index / quizRun.questions.length * 100}%`; $('#optionsGrid').innerHTML = q.optionOrder.map((letter, i) => `<button class="option-card ${quizRun.answers[quizRun.index] === letter ? 'selected' : ''}" data-answer="${letter}"><span class="option-letter">${String.fromCharCode(65 + i)}</span><span class="option-text">${esc(q['option' + letter])}</span></button>`).join(''); $$('[data-answer]').forEach(b => b.onclick = () => { quizRun.answers[quizRun.index] = b.dataset.answer; persistRun(); $$('[data-answer]').forEach(x => x.classList.toggle('selected', x === b)); renderDots() }); $('#prevQuestion').disabled = quizRun.index === 0; $('#prevQuestion').style.opacity = quizRun.index === 0 ? '.45' : '1'; $('#nextQuestion').classList.toggle('hidden', quizRun.index === quizRun.questions.length - 1); $('#submitQuiz').classList.toggle('hidden', quizRun.index !== quizRun.questions.length - 1); $('#clearAnswer').onclick = () => { delete quizRun.answers[quizRun.index]; persistRun(); $$('[data-answer]').forEach(x => x.classList.remove('selected')); renderDots() }; $('#prevQuestion').onclick = () => moveQuestion(-1); $('#nextQuestion').onclick = () => moveQuestion(1); $('#submitQuiz').onclick = () => submitQuiz(); renderDots(); timerInterval = setInterval(() => { if (['closed', 'none'].includes(quizState())) { stopQuestionTimer(); return submitQuiz(true) } quizRun.remaining--; $('#timerValue').textContent = quizRun.remaining; if (quizRun.remaining <= 10) $('#timerRing').style.borderColor = 'var(--pink)'; if (quizRun.remaining <= 0) { stopQuestionTimer(); if (quizRun.index < quizRun.questions.length - 1) moveQuestion(1); else submitQuiz(true) } }, 1000) }
function renderDots() { $('#questionDots').innerHTML = quizRun.questions.map((q, i) => `<button class="question-dot ${i === quizRun.index ? 'current' : ''} ${quizRun.answers[i] ? 'answered' : ''}" title="Question ${i + 1}" data-dot="${i}"></button>`).join(''); $$('[data-dot]').forEach(b => b.onclick = () => { quizRun.index = +b.dataset.dot; renderQuestion() }) }
function moveQuestion(d) { quizRun.index = Math.max(0, Math.min(quizRun.questions.length - 1, quizRun.index + d)); renderQuestion() }

let rankShown = {}, resView = null; db.inProgress = db.inProgress || {};
function qCount(q = quizConfig) { const n = q.questions.length; return Math.max(1, Math.min(+q.questionCount || n, n)) }
function updateBankHint(n) { $('#bankHint').textContent = `Question bank has ${n}. Each student gets this many, picked at random.` }
let lastState = ''; const quizzes = () => db.quizzes, sig = () => db.quizzes.map(q => q.id + quizState(q)).join('|'); function rankOpen(id) { const q = quizzes().find(x => x.id === id); return !q || quizState(q) === 'closed' } function useQuiz(q) { quizConfig = q; questions = q.questions }
const swalBase = () => ({ buttonsStyling: false, reverseButtons: true, customClass: { popup: 'sw-popup', confirmButton: 'btn btn-primary', cancelButton: 'btn btn-secondary' } });
async function ask(title, text, ok, icon = 'warning') { if (!window.Swal) return confirm(title + '\n' + text); return (await Swal.fire({ ...swalBase(), title, text, icon, showCancelButton: true, confirmButtonText: ok, cancelButtonText: 'Cancel' })).isConfirmed }
async function askPassword() {
    const verify = async password => { const r = await fetch(`${API_BASE}/api/quizzes/${quizConfig.id}/verify-password`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})}); const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Password verification failed'); return !!d.verified; };
    if (!window.Swal) { const pw = prompt('Enter the quiz password'); if (pw == null) return false; try { return await verify(pw); } catch(e) { toast(e.message); return false; } }
    return (await Swal.fire({ ...swalBase(), title: 'Password required', html: '<p class="sw-text">Enter the password shared by your teacher.</p><div class="pw-wrap"><input id="swPw" type="password" class="swal2-input" placeholder="Quiz password" autocomplete="off"/>' + eyeBtn('swPw') + '</div>', showCancelButton: true, confirmButtonText: 'Unlock quiz', cancelButtonText: 'Cancel', preConfirm: async () => { try { if (!(await verify($('#swPw').value))) { Swal.showValidationMessage('Incorrect password. Try again.'); return false; } return true; } catch(e) { Swal.showValidationMessage(e.message); return false; } } })).isConfirmed;
}
async function deleteQuiz(id) { const q = quizzes().find(x => x.id === id); if (!q || !(await ask('Delete this quiz?', `“${q.title}” will be removed for everyone. Past results stay on the leaderboard.`, 'Yes, delete'))) return; try { const resp = await fetch(`${API_BASE}/api/quizzes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('quantum_admin_token')}` } }); const body = await resp.json(); if (!resp.ok) throw new Error(body.message || 'Delete failed'); } catch(err) { return toast(err.message || 'Could not delete quiz.'); } db.quizzes = db.quizzes.filter(x => x.id !== id); if (quizConfig && quizConfig.id === id) { quizConfig = db.quizzes[0] || null; questions = quizConfig ? quizConfig.questions : [] } saveDB(); renderPage(); toast('Quiz deleted.') }
function myResult(q = quizConfig) { return db.results.find(r => r.userId === currentUser.id && r.quizId === q.id) }
function myRank(quizId) { const b = leaderboard(quizId), i = b.findIndex(r => r.userId === currentUser.id); return i < 0 ? null : { rank: i + 1, total: b.length } }
function enterFullscreen() { const el = document.documentElement, f = el.requestFullscreen || el.webkitRequestFullscreen; try { const p = f && f.call(el); if (p && p.catch) p.catch(() => { }) } catch (e) { } }
function leaveFullscreen() { try { if (document.fullscreenElement) { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => { }) } } catch (e) { } }
document.addEventListener('fullscreenchange', () => { const live = quizRun && !$('#quizOverlay').classList.contains('hidden'); $('#fsPrompt').classList.toggle('hidden', !(live && !document.fullscreenElement)) });
$('#fsResume').onclick = enterFullscreen;
function persistRun() { if (quizRun && currentUser) { db.inProgress[currentUser.id] = { questions: quizRun.questions, answers: quizRun.answers, startedAt: quizRun.startedAt, meta: quizRun.meta }; saveDB() } }
async function startQuiz(id) { const q = quizzes().find(x => x.id === id); if (!q) return toast('This quiz is no longer available.'); useQuiz(q); if (myResult(q) || db.inProgress[currentUser.id]) return toast('You have already used your one attempt.'); const st = quizState(q); if (st === 'scheduled') return toast('This quiz has not opened yet.'); if (st !== 'open') return toast('This quiz has closed.'); if (q.passwordProtected && !(await askPassword())) return; if (quizState(q) !== 'open') return toast('This quiz has closed.'); const pool = q.shuffleQuestions ? shuffle(q.questions) : [...q.questions], qs = pool.slice(0, qCount(q)).map(x => ({ ...x, optionOrder: q.shuffleOptions ? shuffle(['A', 'B', 'C', 'D']) : ['A', 'B', 'C', 'D'] })); quizRun = { questions: qs, index: 0, answers: {}, startedAt: Date.now(), meta: { quizId: q.id, title: q.title, points: q.points, seconds: q.seconds } }; persistRun(); $('#quizOverlay').classList.remove('hidden'); enterFullscreen(); renderQuestion() }
async function finalizeAttempt(run, userId) {
    const m = run.meta || { quizId: quizConfig.id, title: quizConfig.title, points: quizConfig.points, seconds: quizConfig.seconds };
    const ql = run.questions;
    const answers = ql.map((q, i) => ({ selected: run.answers[i] || null }));
    const correct = ql.reduce((n, q, i) => n + (run.answers[i] === q.answer ? 1 : 0), 0);
    const local = { id: 'r' + Date.now(), userId: String(userId), quizId: String(m.quizId), quizTitle: m.title, score: correct * m.points, maxScore: ql.length * m.points, correct,
        totalTime: Math.max(1, Math.min(ql.length * m.seconds, Math.round((Date.now() - run.startedAt) / 1000))), answers,
        questionSnapshot: ql.map(q => ({ ...q })), finishedAt: new Date().toISOString() };
    const payload = { student_id: userId, quiz_id: m.quizId, started_at: new Date(run.startedAt).toISOString(), answers: ql.map((q,i)=>({question_id:q.id, selected_option:run.answers[i] || null})) };
    const response = await fetch(`${API_BASE}/api/attempts`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not save attempt to PostgreSQL.');
    local.id = String(data.attempt.id); local.attemptId = local.id;
    local.score = Number(data.attempt.score || 0); local.finishedAt = data.attempt.submitted_at || local.finishedAt;
    db.results.push(local); delete db.inProgress[userId]; saveDB();
    try { const rr = await fetch(`${API_BASE}/api/results?studentId=${encodeURIComponent(userId)}`); if (rr.ok) { const rd = await rr.json(); if (rd.status === 'ok') { db.results = db.results.filter(x=>String(x.userId)!==String(userId)).concat((rd.results||[]).map(mapApiResult)); saveDB(); return db.results.find(x=>String(x.id)===String(local.id)) || local; } } } catch(e) {}
    return local;
}
async function submitQuiz(auto = false) {
    stopQuestionTimer(); if (!quizRun) return;
    const run = quizRun; quizRun = null;
    try { await finalizeAttempt(run, currentUser.id); }
    catch (error) { quizRun = run; toast(error.message || 'Submission failed. Your answers are still available; try submitting again.'); return; }
    $('#quizOverlay').classList.add('hidden'); $('#fsPrompt').classList.add('hidden'); leaveFullscreen(); currentPage = 'myresult'; renderNav(); renderPage();
    toast(auto ? 'Time is up. Your answers have been submitted.' : 'Quiz submitted. Your score is ready!');
}
async function settleInterrupted() { const p = db.inProgress[currentUser.id]; if (p && !quizRun) { try { await finalizeAttempt(p, currentUser.id); toast('Your unfinished attempt was submitted automatically.'); } catch(e) { console.warn('Could not submit interrupted attempt:', e.message); } } }
function doLogout() { stopQuestionTimer(); leaveFullscreen(); $('#fsPrompt').classList.add('hidden'); localStorage.removeItem('quantum_logged_in_user'); currentUser = null; rankShown = {}; resView = null; goAuth(); setAuthMode('login') }
$('#logoutBtn').onclick = async () => { if (await ask('Sign out?', 'You will return to the login screen.', 'Yes, sign out', 'question')) doLogout() };
$('#quizLogout').onclick = async () => { if (await ask('Log out of the quiz?', 'Your answers so far will be submitted and you cannot retake it.', 'Submit & log out')) { submitQuiz(); doLogout() } };
function applyTheme(l) { document.body.classList.toggle('light-theme', l); $('#themeToggle').textContent = l ? '☾' : '☼'; try { localStorage.setItem('quantum_theme', l ? 'light' : 'dark') } catch (e) { } }
$('#themeToggle').onclick = () => applyTheme(!document.body.classList.contains('light-theme'));
try { if (localStorage.getItem('quantum_theme') === 'light') applyTheme(true) } catch (e) { }
if (!db.quizzes) { const c = db.quizConfig; db.quizzes = (c && c.active === false) ? [] : [{ ...(c || { title: 'Aptitude Sprint: The Brain Run', category: 'Mixed Aptitude', points: 10, seconds: 45, shuffleQuestions: true, shuffleOptions: true }), id: (c && c.id) || 'quiz-1', questions: db.questions || sampleQuestions, createdAt: new Date().toISOString() }]; delete db.quizConfig; delete db.questions }
db.quizzes.forEach(q => { q.id = q.id || 'quiz-' + Math.random().toString(36).slice(2, 8); delete q.active }); db.results.forEach(r => { if (!r.quizId) { const q = db.quizzes[0]; r.quizId = q ? q.id : 'quiz-1'; r.quizTitle = q ? q.title : 'Quiz' } }); quizConfig = db.quizzes[0] || null; questions = quizConfig ? quizConfig.questions : []; saveDB();
setInterval(() => { const s = sig(); if (s !== lastState) { lastState = s; if (currentUser && currentUser.role === 'student' && !quizRun && (currentPage === 'overview' || currentPage === 'myresult')) renderPage() } }, 5000);
const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>', EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7c2 0 3.8.7 5.3 1.6M22 12s-3.6 7-10 7c-2 0-3.8-.7-5.3-1.6"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/></svg>';
function eyeBtn(id) { return `<button type="button" class="eye-btn" data-eye="${id}" aria-label="Show password">${EYE}</button>` }
function resetEyes() { $$('[data-eye]').forEach(b => { const i = document.getElementById(b.dataset.eye); if (i) i.type = 'password'; b.innerHTML = EYE; b.setAttribute('aria-label', 'Show password') }) }
document.addEventListener('click', e => { const b = e.target.closest('[data-eye]'); if (!b) return; e.preventDefault(); const i = document.getElementById(b.dataset.eye); if (!i) return; const show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.innerHTML = show ? EYE_OFF : EYE; b.setAttribute('aria-label', show ? 'Hide password' : 'Show password') });
function refreshLive() { if (currentPage === 'leaderboard' && $('#lbQuiz')) { if ($$('#lbQuiz option').length - 1 !== quizOptions().length) renderPage(); else lbUpdate() } else if (currentPage === 'overview') renderPage() }
function syncFromStorage() { if (!currentUser || currentUser.role !== 'admin') return; let raw; try { raw = localStorage.getItem(KEY) } catch (e) { return } if (!raw || raw === lastRaw) return; lastRaw = raw; try { const nd = JSON.parse(raw); nd.inProgress = nd.inProgress || {}; db = nd; quizConfig = quizConfig ? db.quizzes.find(q => q.id === quizConfig.id) || null : null; questions = quizConfig ? quizConfig.questions : []; refreshLive() } catch (e) { } }
window.addEventListener('storage', e => { if (e.key === KEY) syncFromStorage() }); setInterval(syncFromStorage, 3000);
// Initialize login screen
setAuthMode('login');

if (currentUser) {
    openApp();
}