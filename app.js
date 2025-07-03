const express = require('express');
const path = require('path');
const session = require('express-session');
const { check, validationResult } = require('express-validator');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const { sql, poolPromise } = require('./db');
// ... (All imports and setup remain the same)

const app = express();

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session
app.use(session({
  secret: 'homeconnect_secret_key',
  resave: false,
  saveUninitialized: true
}));

// ✅ Routes

// Home Page
app.get('/', (req, res) => {
  res.redirect('/home');
});

app.get('/home', (req, res) => {
  res.render('home', {
    isLoggedIn: req.session.isLoggedIn || false,
    username: req.session.username || null
  });
});

// 👉 Registration Choice Page
app.get('/register', (req, res) => {
  res.render('registerChoice', {
    isLoggedIn: req.session.isLoggedIn || false
  });
});

// Login Page
app.get('/login', (req, res) => {
  res.render('login', {
    formErrors: [],
    isLoggedIn: req.session.isLoggedIn || false
  });
});

// Login POST
app.post('/login', [
  check('username', 'Username is required').notEmpty(),
  check('password', 'Password is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  let { username, password } = req.body;

  username = username?.trim();
  password = password?.trim();

  if (!errors.isEmpty()) {
    return res.render('login', {
      formErrors: errors.array(),
      isLoggedIn: false
    });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE LOWER(Username) = LOWER(@username)');

    const user = result.recordset[0];

    if (!user) {
      return res.render('login', {
        formErrors: [{ msg: 'User not found' }],
        isLoggedIn: false
      });
    }

    if (user.Password !== password) {
      return res.render('login', {
        formErrors: [{ msg: 'Incorrect password' }],
        isLoggedIn: false
      });
    }

    req.session.isLoggedIn = true;
    req.session.username = user.FullName;
    req.session.role = user.Role;
    return res.redirect('/dashboard');

  } catch (err) {
    console.error(err);
    res.render('login', {
      formErrors: [{ msg: 'Server error' }],
      isLoggedIn: false
    });
  }
});

// Customer Registration Page
app.get('/register/customer', (req, res) => {
  res.render('registerCustomer', {
    formErrors: [],
    isLoggedIn: req.session.isLoggedIn || false
  });
});

// Provider Registration Page
app.get('/register/provider', (req, res) => {
  res.render('registerProvider', {
    formErrors: [],
    isLoggedIn: req.session.isLoggedIn || false
  });
});

// Handle Customer Registration
app.post('/register/customer', [
  check('FullName', 'Full Name is required').notEmpty(),
  check('Username', 'Username is required').notEmpty(),
  check('Password', 'Password is required').notEmpty(),
  check('Role').equals('customer').withMessage('Invalid role')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('registerCustomer', {
      formErrors: errors.array(),
      isLoggedIn: false
    });
  }

  const { FullName, Username, Password, Role } = req.body;

  try {
    const pool = await poolPromise;
    const check = await pool.request()
      .input('Username', sql.NVarChar, Username)
      .query('SELECT * FROM Users WHERE Username = @Username');

    if (check.recordset.length > 0) {
      return res.render('registerCustomer', {
        formErrors: [{ msg: 'Username already exists' }],
        isLoggedIn: false
      });
    }

    await pool.request()
      .input('FullName', sql.NVarChar, FullName)
      .input('Username', sql.NVarChar, Username)
      .input('Password', sql.NVarChar, Password)
      .input('Role', sql.NVarChar, Role)
      .query(`
        INSERT INTO Users (FullName, Username, Password, Role)
        VALUES (@FullName, @Username, @Password, @Role)
      `);

    res.send('✅ Customer registration successful. <a href="/login">Login here</a>.');
  } catch (err) {
    console.error(err);
    res.render('registerCustomer', {
      formErrors: [{ msg: 'Server error, try again.' }],
      isLoggedIn: false
    });
  }
});

// Dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect('/login');
  res.render('dashboard', {
    username: req.session.username || 'User',
    role: req.session.role || 'guest'
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Start Server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
