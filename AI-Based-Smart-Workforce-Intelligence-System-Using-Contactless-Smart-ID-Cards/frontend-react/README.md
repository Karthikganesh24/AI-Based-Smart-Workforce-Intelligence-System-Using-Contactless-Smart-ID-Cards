# SmartWorkforce Admin Dashboard - React

Modern React-based admin dashboard for the Smart Workforce Intelligence System with smooth animations, 3D effects, and real-time data visualization.

## Features

- ✨ **Modern UI/UX** - Smooth animations, micro-interactions, and 3D card effects
- 🎨 **Glassmorphism & Neon Effects** - Beautiful visual design with dynamic gradients
- 📊 **Real-time Data** - Live updates for room occupancy and employee tracking
- 🌙 **Dark Mode** - Fully functional dark/light theme toggle
- 📱 **Responsive Design** - Works seamlessly on all devices
- ⚡ **Fast & Optimized** - Built with Vite for lightning-fast HMR
- 🎯 **TypeScript** - Full type safety throughout the application

## Tech Stack

- **React 18** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **React Router v6** - Client-side routing
- **Zustand** - Lightweight state management
- **TanStack Query** - Server state management with caching
- **React Transition Group** - Smooth enter/exit animations
- **Recharts** - Animated data visualizations
- **React Hot Toast** - Beautiful toast notifications

## Getting Started

### Prerequisites

- Node.js >= 22.5.0
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Backend Connection

The frontend expects the backend API to be running on `http://localhost:3000`. Make sure to start the backend server:

```bash
cd ..
npm start
```

## Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
frontend-react/
├── src/
│   ├── components/        # Reusable components
│   │   ├── Layout/       # Navigation, header, layout
│   │   ├── RoomOccupancy/# Room occupancy components
│   │   ├── UI/           # Base UI components
│   │   └── Animations/   # Animation wrappers
│   ├── pages/            # Route pages
│   ├── hooks/            # Custom React hooks
│   ├── store/            # Zustand stores
│   ├── services/         # API clients
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   └── styles/           # Global styles & themes
├── public/               # Static assets
└── index.html           # HTML entry point
```

## Key Features

### Room Occupancy Monitoring

- Real-time room occupancy tracking with 5-second polling
- Animated progress bars with gradient fills
- 3D card tilt effects on hover
- Critical capacity alerts with sound feedback
- Staggered grid animations

### Dashboard Overview

- Animated KPI cards with number counters
- Department-wise attendance breakdown
- Live activity stream
- Smooth micro-interactions

### Visual Enhancements

- **3D Effects**: Card elevation, parallax, tilt on hover
- **Glassmorphism**: Frosted glass effect with backdrop blur
- **Neon Glows**: Dynamic glow effects for critical alerts
- **Gradient Animations**: Smooth color transitions
- **Smooth Transitions**: 300ms cubic-bezier animations

## API Integration

The app communicates with the backend via REST API. All API calls are proxied through Vite's dev server.

## Performance

- **Code Splitting**: Routes are lazy-loaded
- **Memoization**: React.memo and useMemo for expensive operations
- **Optimized Animations**: CSS transforms for 60fps animations
- **Efficient Polling**: React Query handles data fetching with caching

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

ISC
