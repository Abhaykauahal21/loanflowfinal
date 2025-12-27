# 🚀 LoanFlow - Modern Loan Management System

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-blueviolet.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.3-38B2AC.svg)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg)](https://www.mongodb.com/)

**LoanFlow** is a sophisticated full-stack loan management application built with the **MERN** stack. It features separate portals for users and administrators, real-time loan status updates, secure document uploads, and a modern, responsive interface powered by **TailwindCSS**.

## ✨ Features

### 👤 User Features
- **Secure Authentication**
  - JWT-based login and registration
  - Protected routes
  - Persistent sessions
- **Loan Management**
  - Apply for new loans
  - Track application status
  - View loan history
  - Upload supporting documents
- **Dashboard**
  - View all loans at a glance
  - Track total borrowed amount
  - Monitor application status
  - Quick access to apply for new loans

### 👨‍💼 Admin Features
- **Comprehensive Dashboard**
  - Total loans overview
  - Pending applications count
  - Total loan volume statistics
  - Active loans monitoring
- **Loan Processing**
  - Review loan applications
  - Approve/Reject requests
  - Add admin notes
  - Update loan status
- **Analytics**
  - Loan application trends
  - Approval rate analytics
  - System status monitoring
  - User activity tracking

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite
- **TailwindCSS** for styling
- **React Router** for navigation
- **Axios** for API requests
- **Redux Toolkit** for app state (notifications, loans, users, payments, settings)
- **react-hot-toast** for notifications
- **Recharts** for dashboards/analytics

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Multer** for file uploads
- **CORS** enabled

### Data Storage
- Application data stored in **MongoDB** (see `server/config/db.js`)
- Uploaded documents stored on disk in `server/uploads/` and served via `/uploads`
- Client stores JWT token in `localStorage` and sends it via `Authorization: Bearer <token>` header

## 📦 Installation

1. **Clone the repository**
```bash
git clone https://github.com/Abhaykauahal21/LoanFlow.git
cd LoanFlow
```

2. **Set up the server**
```bash
cd server
npm install
```

Create a .env file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/loan_app
JWT_SECRET=your_secret_key
```

3. **Set up the client**
```bash
cd ../client
npm install
```

No client `.env` required for development. Vite dev server proxies `/api` to the backend automatically per `client/vite.config.js`.

## 🚀 Running the Application

1. **Start the server**
```bash
cd server
npm start
```

2. **Start the client**
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:3003` (Vite dev server)
- Backend: `http://localhost:5000` (Express server)

Notes:
- Vite dev server proxies requests starting with `/api` to `http://localhost:${SERVER_PORT || PORT || 5000}`.
- Set `PORT=5000` in your server `.env` to match the proxy default.

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |

### Loans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/loans/my` | Get user's loans |
| GET | `/api/loans/my-loans` | Get user's loans (legacy) |
| GET | `/api/loans/dashboard-stats` | Get dashboard statistics |
| GET | `/api/loans/:id` | Get specific loan (authorization enforced) |
| POST | `/api/loans/apply` | Apply for a loan (supports document upload) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/loans` | Get all loans |
| GET | `/api/admin/stats` | Get admin statistics |
| PUT | `/api/admin/loans/:id` | Update loan status |

## 🔐 Security Features

- JWT authentication
- Password hashing
- Protected routes with role/permission checks
- File upload validation and size limits
- Input validation and basic sanitization

## 🗂️ Project Structure

```
LoanFlow/
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── api/            # Axios configuration
│   │   ├── components/     # Reusable components
│   │   ├── context/        # Auth context (session & logout)
│   │   ├── store/          # Redux Toolkit slices & store
│   │   ├── utils/          # Error handling, EMI calculator, permissions
│   │   ├── pages/          # Application pages (User/Admin dashboards, Login, Register, Apply)
│   │   └── pages/         # Application pages
│   └── vite.config.js     # Vite configuration
└── server/                # Backend Node.js application
    ├── config/           # Database configuration
    ├── middleware/       # Auth & upload middleware
    ├── models/          # MongoDB models
    ├── routes/          # API routes
    └── uploads/         # User uploaded files

## 🧭 How It Works
- Authentication: Users register/login; server issues a JWT; client saves the token in `localStorage` and attaches it to requests via an Axios interceptor (`client/src/api/axios.js`).
- Authorization: Middleware checks roles/permissions; protected pages use `ProtectedRoute` on the client.
- State Management: Redux Toolkit manages slices for notifications, loans, payments, users, and settings.
- Notifications: Server/API errors are surfaced through a central notification system; toast popups are suppressed for authentication/authorization errors in the user portal.
- Analytics: Dashboard aggregates loan counts and amounts via MongoDB aggregations and renders charts with Recharts.
```

## 🔧 Environment Setup

### Server (.env)
```env
PORT=5004
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
FRONTEND_URL=https://your-frontend.onrender.com  # Optional: for CORS in production
```

### Client (.env)
```env
VITE_API_URL=http://localhost:5004/api
```

## 🚀 Deployment on Render

### Backend Deployment
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the following environment variables:
   - `PORT` - Auto-set by Render (or set manually)
   - `MONGODB_URI` - Your MongoDB Atlas connection string
   - `JWT_SECRET` - A secure random string for JWT signing
   - `FRONTEND_URL` - Your frontend URL (e.g., `https://loan-p6fo.onrender.com`)
   - `NODE_ENV` - Set to `production`
4. Build Command: `cd server && npm install`
5. Start Command: `cd server && npm start`
6. Root Directory: `server`

**Backend URL**: `https://loanflowfinal.onrender.com`

### Frontend Deployment
1. Create a new Static Site on Render
2. Connect your GitHub repository
3. Set the following environment variable:
   - `VITE_API_URL` - Your backend API URL (e.g., `https://loanflowfinal.onrender.com/api`)
4. Build Command: `cd client && npm install && npm run build`
5. Publish Directory: `client/dist`
6. Root Directory: `client`

**Important Notes**:
- The frontend will automatically use the backend URL from `VITE_API_URL` in production. If not set, it will use relative paths which won't work for cross-origin requests.
- The `_redirects` file in `client/public/` ensures all routes are handled by React Router (SPA routing). This file is automatically included in the build.
- Make sure to set `VITE_API_URL=https://loanflowfinal.onrender.com/api` in your Render environment variables.

## 👥 Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## 🙏 Acknowledgments
- TailwindCSS for the beautiful UI components
- MongoDB Atlas for database hosting
- React community for excellent tools and libraries
