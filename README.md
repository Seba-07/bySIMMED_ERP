# bySIMMED_ERP

Enterprise Resource Planning (ERP) application for inventory management with clean architecture.

## Features

- **Inventory Management**: Organize inventory by Models, Components, and Materials
- **Real-time Synchronization**: Changes reflect across all connected devices
- **Clean Architecture**: Separation of concerns with domain-driven design
- **Web-based**: Accessible from any browser

## Project Structure

```
bySIMMED_ERP/
├── backend/           # Node.js API server
│   ├── src/
│   │   ├── domain/    # Business entities and rules
│   │   ├── application/ # Use cases and services
│   │   ├── infrastructure/ # Database, external services
│   │   └── presentation/ # Controllers, routes
├── frontend/          # React application
└── README.md
```

## Tech Stack

**Backend:**
- Node.js with TypeScript
- Express.js
- MongoDB (online database)
- Socket.io (real-time updates)

**Frontend:**
- React with TypeScript
- Material-UI
- Socket.io client

## Getting Started

1. Backend setup:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. Frontend setup:
   ```bash
   cd frontend
   npm install
   npm start
   ```