# E-commerce Application (Work in Progress)

## Description
This is a full-stack e-commerce application featuring a React frontend and a Node.js/Express backend connected to a PostgreSQL database. It includes basic product display and user authentication using JWT (JSON Web Tokens).

---

## Current Features

### Backend (Node.js/Express/PostgreSQL):
- **API Endpoints**:
  - Fetch all products: `GET /api/products`
  - Fetch a single product by ID: `GET /api/products/:id`
  - User registration with password hashing (bcrypt): `POST /api/auth/register`
  - User login with password verification and JWT generation: `POST /api/auth/login`
  - Protected endpoint to fetch logged-in user's profile: `GET /api/auth/me`
- **Middleware**:
  - JWT authentication middleware to protect specific routes.
- **Database**:
  - Uses `pg` (node-postgres) for database interaction.
- **Environment Management**:
  - Uses `dotenv` for environment variable management.

### Frontend (React/Vite):
- **Routing**:
  - Client-side routing using `react-router-dom`.
- **Components**:
  - Pages: `Home`, `Login`, `Products`, `Profile`, `NotFound`.
  - Utility Components: `NavBar`, `ProtectedRoute`.
- **Features**:
  - Displays a list of products fetched from the backend.
  - Login page authenticates against the backend API.
  - Stores JWT in `localStorage` upon successful login.
  - Profile page fetches and displays user data from a protected backend route.
  - `ProtectedRoute` component guards routes requiring authentication.
  - Navigation bar with conditional links (`Login/Logout`, `Profile`) based on auth state.
  - Logout functionality clears token and updates UI.
- **Development**:
  - Vite development server with proxy configured to forward `/api` requests to the backend.

---

## Tech Stack
- **Frontend**: React, Vite, `react-router-dom`
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (`pg` library)
- **Authentication**: JSON Web Tokens (JWT), bcrypt
- **Styling**: Basic inline styles (can be replaced with CSS/UI library)

---

## Project Structure
```bash
ecommerce-app/
├── client/         # React Frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── NavBar.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── NotFoundPage.jsx
│   │   │   ├── ProductsPage.jsx
│   │   │   └── ProfilePage.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .eslintrc.cjs
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── yarn.lock
│
└── server/         # Node.js Backend (Express)
    ├── middleware/
    │   └── authenticateToken.js
    ├── .env        # Environment variables
    ├── db.js       # Database connection pool setup
    ├── package.json
    ├── server.js   # Main Express server file
    └── yarn.lock
```

---

## Setup and Running

### Prerequisites:
- Node.js and Yarn (or npm) installed.
- PostgreSQL database server running.

### Backend Setup:
1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies
 ```bash
 yarn install
   ```
3. Create a ```.env``` file in the server directory.
4. Add your PostgreSQL connection string and a JWT secret to ```.env```:
```
DATABASE_URL=Your_DB_user
DB_PASSWORD=Your_DB_Password
DB_HOST=Your_DB_Host
DB_PORT:Your_DB_Port (5432 default)
DB_DATABASE:Yout_DB_name
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
PORT=5001 # Or your desired backend port
```
Ensure your PostgreSQL database has the necessary users and products tables set up according to the queries in server.js.
This can be found in server>database>schema.sql.

Start the backend server: ```yarn dev``` (if configured) or ```node server.js```

### Frontend Setup:

Navigate to the client directory: cd ../client (from server) or cd client (from root)

Install dependencies:
```bash
yarn install
```

Verify the proxy target port in ```client/vite.config.js``` matches the backend ```PORT```.

Start the frontend development server: 
```bash
yarn dev
```

### Running the App:

Ensure both the backend and frontend servers are running concurrently in separate terminals.

Access the application in your browser, usually at http://localhost:5173 (check Vite terminal output).

## API Endpoints (Current)

```GET /api/products```: Get all products.

```GET /api/products/:id```: Get a single product by ID.

```POST /api/auth/register```: Register a new user.

```POST /api/auth/login```: Log in a user, returns JWT.

```GET /api/auth/me```: (Protected) Get the logged-in user's profile information.

# Next Steps / TODOs
Implement the Registration page UI (/register).

Add a link to the Registration page in the NavBar.

Implement redirect after login to the originally intended page (using state from ProtectedRoute).

Refine styling using CSS or a UI library.

Implement Shopping Cart functionality (state, API routes, UI).

Add Product Detail page.

Improve error handling and user feedback.

Consider using React Context or Zustand for global state management (e.g., auth state).

Remove detailed debugging console logs.

   
