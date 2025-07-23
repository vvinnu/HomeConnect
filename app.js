const express = require('express');
const path = require('path');
const session = require('express-session');
const { check, validationResult } = require('express-validator');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const { sql, poolPromise } = require('./db');

const app = express();

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/certs', express.static('certs'));
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

// Login Page for all users
app.get('/login', (req, res) => {
  res.render('login/loginChoice', {
    isLoggedIn: req.session.isLoggedIn || false
  });
});

// Login page for cutsomers
app.get('/login/customer', (req, res) => {
  const successMessage = req.session.successMessage;
  req.session.successMessage = null;

  res.render('login/loginCustomer', {
    formErrors: [],
    isLoggedIn: req.session.isLoggedIn || false,
    successMessage
  });
});


// Login page for providers
app.get('/login/provider', (req, res) => {
  res.render('login/loginProvider', {
    formErrors: [],
    isLoggedIn: req.session.isLoggedIn || false
  });
});


// POST: Customer Login
app.post('/login/customer', [
  check('username', 'Username is required').notEmpty(),
  check('password', 'Password is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  let { username, password } = req.body;

  username = username?.trim();
  password = password?.trim();

  if (!errors.isEmpty()) {
    return res.render('login/loginCustomer', {
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

    if (!user || user.Role !== 'customer') {
      return res.render('login/loginCustomer', {
        formErrors: [{ msg: 'Customer not found or invalid role' }],
        isLoggedIn: false
      });
    }

    if (user.Password !== password) {
      return res.render('login/loginCustomer', {
        formErrors: [{ msg: 'Incorrect password' }],
        isLoggedIn: false
      });
    }

    req.session.isLoggedIn = true;
    req.session.username = user.FullName;
    req.session.role = user.Role;
    req.session.userId = user.UserID;

    return res.redirect('/dashboard'); // Or to a customer-specific dashboard if needed
  } catch (err) {
    console.error(err);
    res.render('login/loginCustomer', {
      formErrors: [{ msg: 'Server error' }],
      isLoggedIn: false
    });
  }
});

// POST: Provider Login
app.post('/login/provider', [
  check('username', 'Username is required').notEmpty(),
  check('password', 'Password is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  let { username, password } = req.body;

  username = username?.trim();
  password = password?.trim();

  if (!errors.isEmpty()) {
    return res.render('login/loginProvider', {
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

    if (!user || user.Role !== 'provider') {
      return res.render('login/loginProvider', {
        formErrors: [{ msg: 'Service provider not found or invalid role' }],
        isLoggedIn: false
      });
    }

    if (user.Password !== password) {
      return res.render('login/loginProvider', {
        formErrors: [{ msg: 'Incorrect password' }],
        isLoggedIn: false
      });
    }

        if (user.IsApproved !== true && user.IsApproved !== 1) {
      return res.render('login/loginProvider', {
        formErrors: [{ msg: 'Your account is pending admin approval.' }],
        isLoggedIn: false
      });
    }

    req.session.isLoggedIn = true;
    req.session.username = user.FullName;
    req.session.role = user.Role;
    req.session.userId = user.UserID;

    return res.redirect('/providers/dashboard'); // Redirect to provider dashboard
  } catch (err) {
    console.error(err);
    res.render('login/loginProvider', {
      formErrors: [{ msg: 'Server error' }],
      isLoggedIn: false
    });
  }
});

// Provider Dashboard Route
app.get('/providers/dashboard', async (req, res) => {
  if (!req.session.isLoggedIn || req.session.role !== 'provider') {
    return res.redirect('/login');
  }

  try {
    const pool = await poolPromise;

    // Fetch provider info based on logged-in user's ID
    const providerResult = await pool.request()
      .input('UserID', sql.Int, req.session.userId)
      .query(`
        SELECT p.ProviderID, p.ServiceType, p.Experience, p.Description, p.Rating, u.FullName
        FROM Providers p
        JOIN Users u ON p.UserID = u.UserID
        WHERE p.UserID = @UserID
      `);

    const providers = providerResult.recordset;

    res.render('providers/dashboard', {
      username: req.session.username,
      providers,
      isLoggedIn: true,
      role: req.session.role
    });

  } catch (err) {
    console.error('❌ Provider dashboard error:', err);
    res.status(500).send('Server Error');
  }
});

//// Provider Routes

// Provider Profile Page
app.get('/providers/profile', async (req, res) => {
  if (!req.session.isLoggedIn || req.session.role !== 'provider') {
    return res.redirect('/login');
  }

  const userId = req.session.userId;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT u.FullName, u.Email, u.Phone, u.Address, p.ProviderID, 
               p.ServiceType, p.Experience, p.Description
        FROM Users u
        JOIN Providers p ON u.UserID = p.UserID
        WHERE u.UserID = @UserID
      `);

    const provider = result.recordset[0];

    res.render('providers/profile', {
      isLoggedIn: true,
      username: req.session.username,
      role: req.session.role,
      provider
    });

  } catch (err) {
    console.error('❌ Error loading provider profile:', err);
    res.status(500).send('Server error while loading profile.');
  }
});

// Route to update the profiles of the providers by themselves

app.post('/providers/profile/update', async (req, res) => {
  if (!req.session.isLoggedIn || req.session.role !== 'provider') {
    return res.redirect('/login');
  }

  const userId = req.session.userId;
  const {
    FullName, Email, Phone, Address,
    ServiceType, Experience, Description
  } = req.body;

  try {
    const pool = await poolPromise;

    // Update Users table
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('FullName', sql.NVarChar, FullName)
      .input('Email', sql.NVarChar, Email)
      .input('Phone', sql.NVarChar, Phone)
      .input('Address', sql.NVarChar, Address)
      .query(`
        UPDATE Users
        SET FullName = @FullName, Email = @Email, Phone = @Phone, Address = @Address
        WHERE UserID = @UserID
      `);

    // Update Providers table
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('ServiceType', sql.NVarChar, ServiceType)
      .input('Experience', sql.Int, Experience)
      .input('Description', sql.NVarChar, Description)
      .query(`
        UPDATE Providers
        SET ServiceType = @ServiceType, Experience = @Experience,
            Description = @Description
        WHERE UserID = @UserID
      `);

    res.redirect('/providers/profile');

  } catch (err) {
    console.error('❌ Error updating provider profile:', err);
    res.status(500).send('Failed to update profile.');
  }
});

//Route to manage providers availability

app.get('/providers/availability', async (req, res) => {
  if (!req.session.isLoggedIn || req.session.role !== 'provider') {
    return res.redirect('/login');
  }

  const userId = req.session.userId;

  try {
    const pool = await poolPromise;

    // Get ProviderID from UserID
    const providerResult = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`SELECT ProviderID FROM Providers WHERE UserID = @UserID`);

    if (providerResult.recordset.length === 0) {
      return res.send('Provider profile not found.');
    }

    const providerID = providerResult.recordset[0].ProviderID;

    // Fetch availability slots
    const result = await pool.request()
      .input('ProviderID', sql.Int, providerID)
      .query(`
        SELECT SlotID, SlotStart, SlotEnd, IsAvailable
        FROM ProviderTimeSlots
        WHERE ProviderID = @ProviderID
        ORDER BY SlotStart ASC
      `);

    res.render('providers/availability', {
      slots: result.recordset,
      isLoggedIn: true,
      username: req.session.username,
      role: req.session.role
    });

  } catch (err) {
    console.error('❌ Error fetching time slots:', err);
    res.send('Failed to load availability.');
  }
});

// Route for adding the availability

app.get('/providers/availability/add', async (req, res) => {
  if (!req.session.isLoggedIn || req.session.role !== 'provider') {
    return res.redirect('/login');
  }

  res.render('providers/addSlot', {
    isLoggedIn: true,
    role: req.session.role,
    username: req.session.username,
    formErrors: []
  });
});

// Post route to add the availability

app.post('/providers/availability/add', [
  check('SlotStart', 'Start time is required').notEmpty(),
  check('SlotEnd', 'End time is required').notEmpty()
], async (req, res) => {
  if (!req.session.isLoggedIn || req.session.role !== 'provider') {
    return res.redirect('/login');
  }

  const errors = validationResult(req);
  const { SlotStart, SlotEnd } = req.body;

  if (!errors.isEmpty()) {
    return res.render('providers/addSlot', {
      isLoggedIn: true,
      role: req.session.role,
      username: req.session.username,
      formErrors: errors.array()
    });
  }

  try {
    const pool = await poolPromise;

    // Get provider ID based on session user
    const providerResult = await pool.request()
      .input('UserID', sql.Int, req.session.userId)
      .query(`SELECT ProviderID FROM Providers WHERE UserID = @UserID`);

    if (providerResult.recordset.length === 0) {
      return res.send('Provider profile not found.');
    }

    const providerId = providerResult.recordset[0].ProviderID;

    await pool.request()
      .input('ProviderID', sql.Int, providerId)
      .input('SlotStart', sql.DateTime, SlotStart)
      .input('SlotEnd', sql.DateTime, SlotEnd)
      .query(`
        INSERT INTO ProviderTimeSlots (ProviderID, SlotStart, SlotEnd)
        VALUES (@ProviderID, @SlotStart, @SlotEnd)
      `);

    res.redirect('/providers/availability');
  } catch (err) {
    console.error('❌ Error adding time slot:', err);
    res.send('Server error');
  }
});

//Get route for provider bookings

app.get('/providers/bookings', async (req, res) => {
  if (!req.session.isLoggedIn || req.session.role !== 'provider') {
    return res.redirect('/login');
  }

  try {
    const pool = await poolPromise;

    // Get ProviderID from session user
    const providerResult = await pool.request()
      .input('UserID', sql.Int, req.session.userId)
      .query(`SELECT ProviderID FROM Providers WHERE UserID = @UserID`);

    if (providerResult.recordset.length === 0) {
      return res.send('Provider not found.');
    }

    const providerId = providerResult.recordset[0].ProviderID;

    const bookingsResult = await pool.request()
      .input('ProviderID', sql.Int, providerId)
      .query(`
        SELECT b.BookingID, b.ServiceDate, b.Status, u.FullName AS CustomerName, u.Phone, u.Email
        FROM Bookings b
        JOIN Users u ON b.UserID = u.UserID
        WHERE b.ProviderID = @ProviderID
        ORDER BY b.ServiceDate DESC
      `);

    res.render('providers/myBookings', {
      isLoggedIn: true,
      role: req.session.role,
      username: req.session.username,
      bookings: bookingsResult.recordset
    });
  } catch (err) {
    console.error('Error fetching provider bookings:', err);
    res.send('Server error.');
  }
});

// Route to update the bookings
app.post('/providers/bookings/confirm/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    // Update status to Confirmed
    await pool.request()
      .input('id', id)
      .query('UPDATE Bookings SET Status = \'Confirmed\' WHERE BookingID = @id');

    res.redirect('/providers/myBookings');
  } catch (err) {
    console.error('Error confirming booking:', err);
    res.status(500).send('Server Error');
  }
});

// GET: Provider's My Bookings page
app.get('/providers/myBookings', async (req, res) => {
  try {
    const providerUserId = req.session.userId; // or wherever you store provider ID
    const pool = await poolPromise;

    const result = await pool.request()
      .input('userId', providerUserId)
      .query(`
        SELECT 
          b.BookingID, b.ServiceDate, b.Status,
          u.FullName AS CustomerName, u.Phone, u.Email
        FROM Bookings b
        JOIN Providers p ON b.ProviderID = p.ProviderID
        JOIN Users u ON b.UserID = u.UserID
        WHERE p.UserID = @userId
        ORDER BY b.ServiceDate DESC
      `);

    res.render('providers/myBookings', {
      bookings: result.recordset,
      isLoggedIn: true,
      role: 'provider'
    });

  } catch (err) {
    console.error('Error loading provider bookings:', err);
    res.status(500).send('Server Error');
  }
});


// Get route for provider view of reviews

app.get('/providers/reviews', async (req, res) => {
  if (!req.session.isLoggedIn || req.session.role !== 'provider') {
    return res.redirect('/login');
  }

  try {
    const pool = await poolPromise;

    // Find the ProviderID from the logged-in provider’s user ID
    const providerResult = await pool.request()
      .input('UserID', sql.Int, req.session.userId)
      .query(`SELECT ProviderID FROM Providers WHERE UserID = @UserID`);

    if (providerResult.recordset.length === 0) {
      return res.send('Provider not found.');
    }

    const providerId = providerResult.recordset[0].ProviderID;

    // Fetch reviews for bookings linked to this provider
    const reviewsResult = await pool.request()
      .input('ProviderID', sql.Int, providerId)
      .query(`
        SELECT r.Rating, r.Comment, r.CreatedAt, u.FullName AS CustomerName
        FROM Reviews r
        JOIN Bookings b ON r.BookingID = b.BookingID
        JOIN Users u ON b.UserID = u.UserID
        WHERE b.ProviderID = @ProviderID
        ORDER BY r.CreatedAt DESC
      `);

    res.render('providers/reviews', {
      isLoggedIn: true,
      role: req.session.role,
      username: req.session.username,
      reviews: reviewsResult.recordset
    });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.send('Server error.');
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

// Handle service provider registration

app.post('/register/provider', [
  check('FullName').notEmpty(),
  check('Username').notEmpty(),
  check('Password').notEmpty(),
  check('Role').equals('provider'),
  check('ServiceType').notEmpty(),
  check('Experience').isInt({ min: 0 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('registerProvider', {
      formErrors: errors.array(),
      isLoggedIn: false
    });
  }

  const { FullName, Username, Password, Phone, Address, Role, ServiceType, Experience } = req.body;

  let certFilePath = null;
  const cert = req.files?.CertFile;

  if (cert) {
    const uploadPath = path.join(__dirname, 'certs', cert.name);
    await cert.mv(uploadPath); // move the file
    certFilePath = `certs/${cert.name}`; // save path for DB
  }

  try {
    const pool = await poolPromise;

    // Check if username exists
    const check = await pool.request()
      .input('Username', sql.NVarChar, Username)
      .query('SELECT * FROM Users WHERE Username = @Username');

    if (check.recordset.length > 0) {
      return res.render('registerProvider', {
        formErrors: [{ msg: 'Username already exists' }],
        isLoggedIn: false
      });
    }

    // Insert into Users table
    const userInsert = await pool.request()
      .input('FullName', sql.NVarChar, FullName)
      .input('Username', sql.NVarChar, Username)
      .input('Password', sql.NVarChar, Password)
      .input('Role', sql.NVarChar, Role)
      .input('Phone', sql.NVarChar, Phone)
      .input('Email', sql.NVarChar, null)
      .input('Address', sql.NVarChar, Address)
      .query(`
        INSERT INTO Users (FullName, Username, Password, Role, Phone, Email, Address)
        OUTPUT INSERTED.UserID
        VALUES (@FullName, @Username, @Password, @Role, @Phone, @Email, @Address)
      `);

    const userId = userInsert.recordset[0].UserID;

    // Insert into Providers table
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('ServiceType', sql.NVarChar, ServiceType)
      .input('Experience', sql.Int, Experience)
      .input('CertFilePath', sql.NVarChar, certFilePath)
      .input('Description', sql.NVarChar, null)
      .input('Availability', sql.NVarChar, null)
      .query(`
        INSERT INTO Providers (UserID, ServiceType, Experience, CertFilePath, Description, Availability)
        VALUES (@UserID, @ServiceType, @Experience, @CertFilePath, @Description, @Availability)
      `);

    req.session.successMessage = 'Provider registration successful. Please log in below.';
    res.redirect('/login');

  } catch (err) {
    console.error('❌ Provider registration error:', err);
    res.render('registerProvider', {
      formErrors: [{ msg: 'Server error. Please try again.' }],
      isLoggedIn: false
    });
  }
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

    req.session.successMessage = 'Customer registration successful. Please log in below.';
    res.redirect('/login/customer');
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

// Get route for new booking

app.get('/bookings/create', async (req, res) => {
  if (!req.session.isLoggedIn || req.session.role !== 'customer') {
    return res.redirect('/login');
  }

  const flashMessage = req.session.flashMessage || null;
  delete req.session.flashMessage;

  res.render('bookings/createBooking', {
    isLoggedIn: req.session.isLoggedIn,
    username: req.session.username,
    role: req.session.role,
    formErrors: [],
    flashMessage
  });
});


// To create a new booking
app.post('/bookings/create', [
  check('slotID', 'Time slot is required').notEmpty()
], async (req, res) => {
  if (!req.session.isLoggedIn || req.session.role !== 'customer') {
    return res.redirect('/login');
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('bookings/createBooking', {
      providers: [],
      isLoggedIn: true,
      username: req.session.username,
      formErrors: errors.array()
    });
  }

  const { slotID } = req.body;
  const userID = req.session.userId;

  try {
    const pool = await poolPromise;

    // ✅ Fetch slot details
    const slotResult = await pool.request()
      .input('SlotID', sql.Int, slotID)
      .query(`
        SELECT pts.*, p.ProviderID
        FROM ProviderTimeSlots pts
        JOIN Providers p ON pts.ProviderID = p.ProviderID
        WHERE pts.SlotID = @SlotID AND pts.IsAvailable = 1
      `);

    if (slotResult.recordset.length === 0) {
      return res.render('bookings/createBooking', {
        providers: [],
        isLoggedIn: true,
        username: req.session.username,
        formErrors: [{ msg: 'Selected time slot is no longer available.' }]
      });
    }

    const slot = slotResult.recordset[0];

    // ✅ Insert booking
    await pool.request()
      .input('userID', sql.Int, userID)
      .input('providerID', sql.Int, slot.ProviderID)
      .input('serviceDate', sql.DateTime, slot.SlotStart)
      .query(`
        INSERT INTO Bookings (UserID, ProviderID, ServiceDate)
        VALUES (@userID, @providerID, @serviceDate)
      `);

    // ✅ Mark slot as unavailable
    await pool.request()
      .input('SlotID', sql.Int, slot.SlotID)
      .query(`UPDATE ProviderTimeSlots SET IsAvailable = 0 WHERE SlotID = @SlotID`);

    req.session.flashMessage = 'Booking successful!. Please check the status in Booking History';
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
app.post('/bookings/create', async (req, res) => {
  const { slotID, serviceAddress } = req.body;
  const userId = req.session.userId;

  if (!slotID || !serviceAddress || !userId) {
    return res.status(400).send('Missing required booking information');
  }

  try {
    const pool = await poolPromise;

    // Get provider ID from the selected slot
    const slotResult = await pool.request()
      .input('SlotID', sql.Int, slotID)
      .query('SELECT ProviderID, SlotStart FROM ProviderTimeSlots WHERE SlotID = @SlotID AND IsAvailable = 1');

    const slot = slotResult.recordset[0];
    if (!slot) return res.status(400).send('Selected time slot is no longer available');

    // Insert booking
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('ProviderID', sql.Int, slot.ProviderID)
      .input('ServiceDate', sql.DateTime, slot.SlotStart)
      .input('ServiceAddress', sql.NVarChar, serviceAddress)
      .query(`
        INSERT INTO Bookings (UserID, ProviderID, ServiceDate, ServiceAddress)
        VALUES (@UserID, @ProviderID, @ServiceDate, @ServiceAddress)
      `);

    // Mark the slot unavailable
    await pool.request()
      .input('SlotID', sql.Int, slotID)
      .query('UPDATE ProviderTimeSlots SET IsAvailable = 0 WHERE SlotID = @SlotID');

    req.session.flashMessage = 'Booking confirmed successfully!';
    res.redirect('/bookings/create');

  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).send('Server error');
  }
});

// Provider marks booking as completed
app.post('/providers/bookings/complete/:id', async (req, res) => {
  const bookingId = req.params.id;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('Status', sql.NVarChar, 'Completed')
      .input('BookingID', sql.Int, bookingId)
      .query('UPDATE Bookings SET Status = @Status WHERE BookingID = @BookingID');

    res.redirect('/providers/myBookings');
  } catch (err) {
    console.error('Error marking booking as completed:', err);
    res.status(500).send('Server error while updating status');
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

    // 1. Find the SlotID based on Booking's ProviderID and ServiceDate
    const slotResult = await pool.request()
      .input('BookingID', sql.Int, bookingId)
      .query(`
        SELECT b.ServiceDate, b.ProviderID, ts.SlotID
        FROM Bookings b
        JOIN ProviderTimeSlots ts
          ON b.ProviderID = ts.ProviderID
          AND b.ServiceDate = ts.SlotStart
        WHERE b.BookingID = @BookingID
      `);

    const slot = slotResult.recordset[0];

    // 2. Cancel the booking
    await pool.request()
      .input('BookingID', sql.Int, bookingId)
      .query(`UPDATE Bookings SET Status = 'Cancelled' WHERE BookingID = @BookingID`);

    // 3. Mark the slot as available again if it was matched
    if (slot?.SlotID) {
      await pool.request()
        .input('SlotID', sql.Int, slot.SlotID)
        .query(`UPDATE ProviderTimeSlots SET IsAvailable = 1 WHERE SlotID = @SlotID`);
    }

    res.redirect('/bookings/history');
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.send('❌ Failed to cancel booking.');
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

app.get('/api/providers', async (req, res) => {
  const { serviceType, datetime } = req.query;

  console.log("🔍 API Call: /api/providers");
  console.log("ServiceType:", serviceType);
  console.log("Datetime:", datetime);

  if (!serviceType || !datetime) {
    return res.status(400).json({ error: 'Missing service type or datetime' });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('ServiceType', sql.NVarChar, serviceType)
      .input('ServiceDate', sql.DateTime, new Date(datetime))
      .query(`
        SELECT p.ProviderID, u.FullName, p.ServiceType, p.Experience, p.Description, p.Rating
        FROM Providers p
        JOIN Users u ON p.UserID = u.UserID
        WHERE p.ServiceType = @ServiceType
          AND p.ProviderID NOT IN (
            SELECT ProviderID FROM Bookings WHERE ServiceDate = @ServiceDate
          )
      `);

    console.log("✅ Providers found:", result.recordset.length);
    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Error fetching available providers:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route to fetch the available timeslots

app.get('/api/providers/timeslots', async (req, res) => {
  const { serviceType, serviceDate } = req.query;

  if (!serviceType || !serviceDate) {
    return res.status(400).json({ error: 'Missing service type or service date' });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('ServiceType', sql.NVarChar, serviceType)
      .input('SelectedDate', sql.Date, new Date(serviceDate))
      .query(`
        SELECT 
          p.ProviderID, u.FullName, p.ServiceType, p.Description, p.Rating,
          ts.SlotID, ts.SlotStart, ts.SlotEnd
        FROM Providers p
        JOIN Users u ON p.UserID = u.UserID
        JOIN ProviderTimeSlots ts ON p.ProviderID = ts.ProviderID
        WHERE p.ServiceType = @ServiceType
          AND CAST(ts.SlotStart AS DATE) = CAST(@SelectedDate AS DATE)
          AND ts.IsAvailable = 1
        ORDER BY ts.SlotStart ASC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Error fetching provider time slots:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



    // API Route to fetch available providers by serviceType and serviceDate
app.get('/api/providers/available', async (req, res) => {
  const { serviceType, serviceDate } = req.query;

  if (!serviceType || !serviceDate) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ServiceType', sql.NVarChar, serviceType)
      .input('ServiceDate', sql.DateTime, new Date(serviceDate))
      .query(`
        SELECT p.ProviderID, u.FullName, p.ServiceType, p.Description, p.Rating
        FROM Providers p
        JOIN Users u ON p.UserID = u.UserID
        WHERE p.ServiceType = @ServiceType
          AND p.ProviderID NOT IN (
            SELECT ProviderID FROM Bookings
            WHERE ServiceDate = @ServiceDate
              AND Status IN ('Pending', 'Confirmed')
          )
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Error fetching available providers:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Timeslots
// Updated Timeslots API
app.get('/api/timeslots', async (req, res) => {
  const { serviceType, date, location } = req.query;

  if (!serviceType || !date || !location) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const pool = await poolPromise;

    // Get LocationID based on location name
    const locationResult = await pool.request()
      .input('City', sql.NVarChar, location)
      .query(`SELECT LocationID FROM Locations WHERE City = @City`);

    if (locationResult.recordset.length === 0) {
      return res.status(400).json({ error: 'Invalid location' });
    }

    const locationID = locationResult.recordset[0].LocationID;

    // Fetch filtered timeslots by location
    const result = await pool.request()
      .input('ServiceType', sql.NVarChar, serviceType)
      .input('SelectedDate', sql.Date, date)
      .input('LocationID', sql.Int, locationID)
      .query(`
        SELECT ts.SlotID, ts.SlotStart, ts.SlotEnd, p.ProviderID, p.ServiceType, p.Experience, 
               p.Description, p.Rating, u.FullName
        FROM ProviderTimeSlots ts
        JOIN Providers p ON ts.ProviderID = p.ProviderID
        JOIN Users u ON p.UserID = u.UserID
        WHERE ts.IsAvailable = 1
          AND p.ServiceType = @ServiceType
          AND CAST(ts.SlotStart AS DATE) = @SelectedDate
          AND p.LocationID = @LocationID
        ORDER BY ts.SlotStart ASC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Error fetching time slots:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// API to fetch the provider's details along with reviews
app.get('/api/providers/:id', async (req, res) => {
  const providerID = req.params.id;

  try {
    const pool = await poolPromise;

    // ✅ Fetch provider and user info
    const providerResult = await pool.request()
      .input('ProviderID', sql.Int, providerID)
      .query(`
        SELECT p.ProviderID, p.ServiceType, p.Experience, p.Description, p.Rating,
               u.FullName
        FROM Providers p
        JOIN Users u ON p.UserID = u.UserID
        WHERE p.ProviderID = @ProviderID
      `);

    if (providerResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const provider = providerResult.recordset[0];

    // ✅ Fetch related reviews
    const reviewResult = await pool.request()
      .input('ProviderID', sql.Int, providerID)
      .query(`
        SELECT r.Rating, r.Comment, r.CreatedAt
        FROM Reviews r
        JOIN Bookings b ON r.BookingID = b.BookingID
        WHERE b.ProviderID = @ProviderID
        ORDER BY r.CreatedAt DESC
      `);

    // ✅ Attach reviews to provider object
    provider.Reviews = reviewResult.recordset;

    // ✅ Return combined result
    res.json(provider);

  } catch (err) {
    console.error('❌ Error fetching provider details:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});


//// Admin UI routes

// Admin Login Page
app.get('/admin', (req, res) => {
  res.render('admin/login', { error: null });
});

// Admin Login POST
app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE LOWER(Username) = LOWER(@username) AND Role = \'admin\'');

    const admin = result.recordset[0];

    if (!admin || admin.Password !== password) {
      return res.render('admin/login', { error: 'Invalid credentials' });
    }

    req.session.isAdmin = true;
    req.session.adminName = admin.FullName;
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('❌ Admin login failed:', err);
    res.render('admin/login', { error: 'Server error' });
  }
});

// Admin Dashboard Overview
app.get('/admin/dashboard', (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/admin');
  res.render('admin/dashboard', {
    adminName: req.session.adminName
  });
});

// Admin: View all users
app.get('/admin/users', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT UserID, FullName, Username, Role, Phone, Email, Address, CreatedAt
      FROM Users
      ORDER BY CreatedAt DESC
    `);

    res.render('admin/users', {
      users: result.recordset
    });
  } catch (err) {
    console.error('Error loading users:', err);
    res.status(500).send('Server Error');
  }
});

// Admin: View all providers
app.get('/admin/providers', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        p.ProviderID, u.FullName, u.Email, u.Phone, p.ServiceType, 
        p.Experience, p.Rating, p.CertFilePath
      FROM Providers p
      JOIN Users u ON p.UserID = u.UserID
      ORDER BY p.ProviderID
    `);

    res.render('admin/providers', {
      providers: result.recordset
    });
  } catch (err) {
    console.error('Error loading providers:', err);
    res.status(500).send('Server Error');
  }
});

// Admin: View all bookings
app.get('/admin/bookings', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        b.BookingID, b.ServiceDate, b.Status, 
        cu.FullName AS CustomerName,
        pr.FullName AS ProviderName,
        p.ServiceType
      FROM Bookings b
      JOIN Users cu ON b.UserID = cu.UserID
      JOIN Providers p ON b.ProviderID = p.ProviderID
      JOIN Users pr ON p.UserID = pr.UserID
      ORDER BY b.ServiceDate DESC
    `);

    res.render('admin/bookings', {
      bookings: result.recordset
    });
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).send('Server Error');
  }
});

// Admin: View all reviews
app.get('/admin/reviews', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        r.ReviewID, r.Rating, r.Comment, r.CreatedAt,
        cu.FullName AS CustomerName,
        pr.FullName AS ProviderName,
        p.ServiceType
      FROM Reviews r
      JOIN Bookings b ON r.BookingID = b.BookingID
      JOIN Users cu ON b.UserID = cu.UserID
      JOIN Providers p ON b.ProviderID = p.ProviderID
      JOIN Users pr ON p.UserID = pr.UserID
      ORDER BY r.CreatedAt DESC
    `);

    res.render('admin/reviews', {
      reviews: result.recordset
    });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).send('Server Error');
  }
});


// Start Server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
