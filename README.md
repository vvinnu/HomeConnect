
# 🏠 HomeConnect

**HomeConnect** is a web-based platform that connects customers with verified home service providers such as plumbers, electricians, painters, and more. Built using **Node.js, Express, EJS, and SQL Server**, it offers a smooth registration, login, and booking experience.

---

## 🚀 Features

- Customer & Provider registration with role-based UI
- Secure login & session handling
- Bookings, Reviews, Ratings
- Provider profile with service type, experience, and certification
- Fully responsive design using Bootstrap

---

## 🔧 Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: EJS, HTML5, Bootstrap
- **Database**: Microsoft SQL Server
- **ORM**: `mssql` package for DB connectivity
- **Session**: `express-session` for user sessions

---

## 📂 Folder Structure

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

## 👨‍💻 Authors

- **Vineeth Kanoor**   
- **Yamini Reddy Alugubelli**
- **Bhanuchand Yarlagadda**

---

## 📝 License

This project is for academic purposes. No commercial use without permission.
