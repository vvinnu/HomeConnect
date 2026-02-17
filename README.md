
# 🏠 HomeConnect

**HomeConnect** is a web-based platform that connects customers with verified home service providers such as plumbers, electricians, painters, and more. 
The platform handles authentication, role-based access, booking workflows, and provider reviews, offering a structured and scalable solution for service marketplace management   .

---

## 🚀 Key Features

- Customer & Provider registration with role-based UI
- Secure login & session handling
- Bookings, Reviews, Ratings
- Provider profile with service type, experience, and certification
- Fully responsive design using Bootstrap

---

## 🧱 Architecture Overview

- HomeConnect follows a layered Express architecture:
- Route handling via Express
- Server-side rendering with EJS
- SQL Server relational database
- Session-based authentication using express-session
- Database connectivity using the mssql package

## 🔧 Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: EJS, HTML5, Bootstrap
- **Database**: Microsoft SQL Server
- **ORM**: `mssql` package for DB connectivity
- **Session**: `express-session` for user sessions

---

## 📂 Project Structure

```
/HomeConnect
├── public/              # Static assets (CSS, images, etc.)
├── views/               # EJS views (pages)
│   ├── partials/        # Shared partials like navbar, footer
├── routes/              # Express routes (if modularized)
├── db.js                # SQL connection setup
├── app.js               # Main Express app
└── package.json         # Node dependencies
```

---

## ⚙️ Setup Instructions

1. Clone the repo:  
   `git clone https://github.com/vvinnu/HomeConnect.git`

2. Install dependencies:  
   `npm install`

3. Set up SQL Server and create the database using the provided SQL schema(setup.sql).

4. Run the server:  
   `node app.js`

5. Open in browser:  
   `http://localhost:5000`

---

## 👨‍💻 Contributor  

- **Vineeth Kanoor**   

---

## 📝 License

All rights reserved.
Unauthorized copying, modification, or distribution is prohibited without prior written permission.
