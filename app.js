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
    username: req.session.username || null,
    role: req.session.role || null
  });
});

// 👉 Registration Choice Page
app.get('/register', (req, res) => {
  res.render('registerChoice', {
    isLoggedIn: req.session.isLoggedIn || false,
    role: req.session.role || null
  });
});

// Login Page
app.get('/login', (req, res) => {
  res.render('login', {
    formErrors: [],
    isLoggedIn: req.session.isLoggedIn || false,
    role: req.session.role || null
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
    req.session.userId = user.UserID;
    return res.redirect('/dashboard');

  } catch (err) {
    console.error(err);
    res.render('login', {
      formErrors: [{ msg: 'Server error' }],
      isLoggedIn: false,
      role: null
    });
  }
});

// Customer Registration Page
app.get('/register/customer', (req, res) => {
  res.render('registerCustomer', {
    formErrors: [],
    isLoggedIn: req.session.isLoggedIn || false,
    role: req.session.role || null
  });
});

// Provider Registration Page
app.get('/register/provider', (req, res) => {
  res.render('registerProvider', {
    formErrors: [],
    isLoggedIn: req.session.isLoggedIn || false,
    role: req.session.role || null
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
      isLoggedIn: false,
      role: null
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

// To create a new booking
app.post('/bookings/create', [
  check('providerID', 'Provider is required').notEmpty(),
  check('serviceDate', 'Service date is required').notEmpty()
], async (req, res) => {
  if (!req.session.isLoggedIn || req.session.role !== 'customer') {
    return res.redirect('/login');
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('bookings/createBooking', {
      providers: [],
      isLoggedIn: req.session.isLoggedIn,
      username: req.session.username,
      formErrors: errors.array()
    });
  }

  const { providerID, serviceDate } = req.body;
  const userID = req.session.userId;

  try {
    const pool = await poolPromise;

    // Check if this provider is already booked by the user at the same time
    const existingBooking = await pool.request()
      .input('userID', sql.Int, userID)
      .input('providerID', sql.Int, providerID)
      .input('serviceDate', sql.DateTime, new Date(serviceDate))
      .query(`
        SELECT * FROM Bookings 
        WHERE UserID = @userID 
          AND ProviderID = @providerID 
          AND CAST(ServiceDate AS DATETIME) = CAST(@serviceDate AS DATETIME)
      `);

    if (existingBooking.recordset.length > 0) {
      return res.render('bookings/createBooking', {
        providers: [],
        isLoggedIn: true,
        username: req.session.username,
        formErrors: [{ msg: 'You already booked this provider at the same time.' }],
        role: req.session.role || null
      });
    }

    // Proceed with booking
    await pool.request()
      .input('userID', sql.Int, userID)
      .input('providerID', sql.Int, providerID)
      .input('serviceDate', sql.DateTime, new Date(serviceDate))
      .query(`
        INSERT INTO Bookings (UserID, ProviderID, ServiceDate)
        VALUES (@userID, @providerID, @serviceDate)
      `);

    // ✅ Show success message using TempData-style approach (req.session.flashMessage)
    req.session.flashMessage = 'Booking successful!';
    return res.redirect('/bookings/create');
    

  } catch (err) {
    console.error('❌ Booking failed:', err);
    res.render('bookings/createBooking', {
      providers: [],
      isLoggedIn: true,
      username: req.session.username,
      formErrors: [{ msg: 'Server error. Please try again later.' }]
    });
  }
});

// Show Booking Form
app.get('/bookings/create', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT p.ProviderID, u.FullName, p.ServiceType, p.Availability
      FROM Providers p
      JOIN Users u ON p.UserID = u.UserID
    `);

    const flashMessage = req.session.flashMessage || null;
    delete req.session.flashMessage;

    res.render('bookings/createBooking', {
      providers: result.recordset,
      isLoggedIn: req.session.isLoggedIn,
      username: req.session.username,
      role: req.session.role || null,
      formErrors: [],
      flashMessage
    });

  } catch (err) {
    console.error('❌ Error fetching providers:', err);
    res.send('Error loading booking form.');
  }
});


// Bookings History Route

app.get('/bookings/history', async (req, res) => {
  if (!req.session.isLoggedIn || req.session.role !== 'customer') {
    return res.redirect('/login');
  }

  const userId = req.session.userId;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT b.BookingID, b.ServiceDate, b.Status,
               p.ServiceType, u.FullName AS ProviderName
        FROM Bookings b
        JOIN Providers p ON b.ProviderID = p.ProviderID
        JOIN Users u ON p.UserID = u.UserID
        WHERE b.UserID = @UserID
        ORDER BY b.ServiceDate DESC
      `);

    res.render('bookings/bookingsHistory', {
      bookings: result.recordset,
      isLoggedIn: true,
      username: req.session.username,
      role: req.session.role || null
    });
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.send('Failed to load booking history.');
  }
});

// To cancel a booking from History page
app.post('/bookings/cancel/:id', async (req, res) => {
  if (!req.session.isLoggedIn || req.session.role !== 'customer') {
    return res.redirect('/login');
  }

  const bookingId = req.params.id;

  try {
    const pool = await poolPromise;

    await pool.request()
      .input('BookingID', sql.Int, bookingId)
      .query(`
        UPDATE Bookings
        SET Status = 'Cancelled'
        WHERE BookingID = @BookingID
      `);

    res.redirect('/bookings/history');
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.send('❌ Failed to cancel booking.');
  }
});


// Handle provider section

app.get('/api/providers', async (req, res) => {
  const { serviceType, datetime } = req.query;

  if (!serviceType || !datetime) {
    return res.status(400).json({ error: 'Missing service type or datetime' });
  }

  try {
    const pool = await poolPromise;

    // Get providers of selected service type who are not already booked at that time
    const result = await pool.request()
      .input('ServiceType', sql.NVarChar, serviceType)
      .input('ServiceDate', sql.DateTime, new Date(datetime))
      .query(`
        SELECT p.ProviderID, u.FullName, p.ServiceType, p.Experience, p.Description, p.Availability, p.Rating
        FROM Providers p
        JOIN Users u ON p.UserID = u.UserID
        WHERE p.ServiceType = @ServiceType
          AND p.ProviderID NOT IN (
            SELECT ProviderID FROM Bookings WHERE ServiceDate = @ServiceDate
          )
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Error fetching available providers:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// To fetch the providers info

app.get('/providers/:id', async (req, res) => {
  const providerId = req.params.id;

  try {
    const pool = await poolPromise;

    // Get provider details
    const providerResult = await pool.request()
      .input('ProviderID', sql.Int, providerId)
      .query(`
        SELECT p.*, u.FullName, u.Email, u.Phone
        FROM Providers p
        JOIN Users u ON p.UserID = u.UserID
        WHERE p.ProviderID = @ProviderID
      `);

    const provider = providerResult.recordset[0];
    if (!provider) {
      return res.status(404).send('Provider not found');
    }

    // Get provider reviews
    const reviewsResult = await pool.request()
      .input('ProviderID', sql.Int, providerId)
      .query(`
        SELECT r.Rating, r.Comment, r.CreatedAt
        FROM Reviews r
        JOIN Bookings b ON r.BookingID = b.BookingID
        WHERE b.ProviderID = @ProviderID
        ORDER BY r.CreatedAt DESC
      `);

    const reviews = reviewsResult.recordset;

    res.render('providers/detail', {
      provider,
      reviews
    });

  } catch (err) {
    console.error('❌ Error loading provider details:', err);
    res.status(500).send('Server error');
  }
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
