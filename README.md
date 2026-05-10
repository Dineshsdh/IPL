# IPL Auction Platform

A real-time, full-stack web application designed to simulate the Indian Premier League (IPL) player auction experience. This platform allows multiple users to participate in live, synchronized player auctions through independent virtual pools. Built with the MERN stack and Socket.io, it provides a seamless and interactive bidding environment for both administrators (auctioneers) and participating teams.

## 🌟 Key Features

- **Real-Time Bidding Engine:** Instantaneous bid updates, timer synchronization, and auction state management powered by Socket.io.
- **Virtual Auction Pools:** Create and join isolated, multi-user auction sessions, allowing multiple separate auctions to run concurrently.
- **Role-Based Access Control:** 
  - **Admin:** Manages the auction, controls the player queue, starts/stops bidding, and resolves disputes.
  - **Team:** Participates in the auction, views real-time updates, and places bids for players.
- **Player Data Integration:** Automated player data ingestion through HTML parsing of season archives, complete with images, roles, and base prices.
- **Progressive Web App (PWA):** Fully installable cross-platform application with offline capabilities and optimized assets.
- **Advanced Bidding Controls:** Features include Autobid functionality, quick start tools, and simulation capabilities for testing.
- **Export & Reporting:** Generate comprehensive PDF reports for auction results and team squads using `jsPDF`.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 (Vite)
- **Routing:** React Router v6
- **Real-Time:** Socket.io-client
- **PDF Generation:** jsPDF & jsPDF-autotable
- **PWA:** vite-plugin-pwa

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Real-Time Engine:** Socket.io
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or Atlas URI)

## 🚀 Installation & Setup

1. **Install Server Dependencies:**
   Navigate to the `server` directory and install the necessary packages.
   ```bash
   cd server
   npm install
   ```

2. **Install Client Dependencies:**
   Navigate to the `client` directory and install the necessary packages.
   ```bash
   cd client
   npm install
   ```

3. **Environment Configuration:**
   In the `server` directory, create a `.env` file (or update the existing one) with the following variables:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/ipl-auction
   JWT_SECRET=your_jwt_secret_key
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start the Backend Server:**
   ```bash
   cd server
   npm run dev
   ```

5. **Start the Frontend Development Server:**
   ```bash
   cd client
   npm run dev
   ```

## 🔐 Default Credentials

When the backend server starts for the first time, it automatically creates a default administrator account if one doesn't exist:
- **Email:** `admin@iplauction.com`
- **Password:** `adminpassword`

## 📁 Project Structure

```text
📦 IPL Auction
 ┣ 📂 client               # React Frontend (Vite)
 ┃ ┣ 📂 public             # Static assets and PWA icons
 ┃ ┣ 📂 src                # React components, contexts, and pages
 ┃ ┣ 📜 package.json       # Frontend dependencies
 ┃ ┗ 📜 vite.config.js     # Vite & PWA configuration
 ┗ 📂 server               # Node.js/Express Backend
   ┣ 📂 middleware         # Express middlewares (Auth, etc.)
   ┣ 📂 models             # Mongoose schemas (User, Player, Team, VirtualPool)
   ┣ 📂 routes             # API route handlers
   ┣ 📂 socket             # Socket.io event controllers and engine
   ┣ 📜 server.js          # Entry point for the backend
   ┗ 📜 package.json       # Backend dependencies
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
