# WorkLink Admin Portal - React Application

A modern, themeable admin portal built with React, featuring dark/light mode and customizable color themes.

## Features

✨ **Dual Theme System**
- 🌓 Dark/Light mode toggle
- 🎨 12 customizable color themes (Sky Blue, Ocean Blue, Purple, Pink, Red, Orange, Yellow, Green, Teal, Indigo, Rose, Slate)
- 💾 Theme preferences saved to localStorage

🔄 **Real-time Updates**
- WebSocket integration for live data updates
- Real-time notifications
- Instant UI updates across all admin sessions

📱 **Responsive Design**
- Mobile-friendly interface
- Collapsible sidebar
- Adaptive layouts

🔐 **Authentication**
- Protected routes
- Session management
- Secure admin access

## Tech Stack

- **React 19** - UI framework
- **React Router 7** - Client-side routing
- **Tailwind CSS 4** - Utility-first styling
- **Vite 7** - Build tool and dev server
- **Context API** - State management

## Development

### Prerequisites

- Node.js 16+ installed
- Main server running on port 3000

### Install Dependencies

```bash
cd admin
npm install
```

### Run Development Server

```bash
npm run dev
```

The admin portal will be available at `http://localhost:3001`

### Build for Production

```bash
npm run build
```

This creates an optimized build in the `admin/dist` directory.

## Project Structure

```
admin/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AdminLayout.jsx  # Main layout with nav & sidebar
│   │   ├── ThemeToggle.jsx  # Theme switcher component
│   │   └── NotificationDropdown.jsx
│   ├── contexts/            # React Context providers
│   │   ├── ThemeContext.jsx      # Theme management
│   │   ├── AuthContext.jsx       # Authentication
│   │   ├── WebSocketContext.jsx  # Real-time updates
│   │   └── DataContext.jsx       # Data management
│   ├── pages/               # Page components
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Workers.jsx
│   │   ├── Jobs.jsx
│   │   ├── Training.jsx
│   │   ├── Payments.jsx
│   │   ├── Transactions.jsx
│   │   └── Chat.jsx
│   ├── config/              # Configuration files
│   │   └── themes.js        # Theme color definitions
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── index.html               # HTML template
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
└── package.json             # Dependencies
```

## Theme System

### Color Themes

The admin portal includes 12 pre-defined color themes:

1. **Sky Blue** ☁️ - Calm and professional (default)
2. **Ocean Blue** 🌊 - Classic and trustworthy
3. **Royal Purple** 👑 - Creative and bold
4. **Sunset Pink** 🌸 - Warm and friendly
5. **Energy Red** 🔥 - Dynamic and powerful
6. **Vibrant Orange** 🍊 - Energetic and fun
7. **Sunshine Yellow** ☀️ - Bright and cheerful
8. **Nature Green** 🌿 - Fresh and balanced
9. **Teal Wave** 🌊 - Modern and cool
10. **Deep Indigo** 🌌 - Sophisticated and deep
11. **Rose Garden** 🌹 - Elegant and refined
12. **Slate Gray** 🗿 - Professional and neutral

### Dark/Light Mode

Toggle between dark and light modes using the moon/sun icon in the navigation bar. The theme preference is automatically saved and persists across sessions.

### Customizing Themes

To add or modify themes, edit `src/config/themes.js`:

```javascript
export const availableThemes = [
  {
    id: 'custom',
    name: 'Custom Theme',
    emoji: '🎨',
    description: 'Your custom theme',
    colors: {
      50: '240 249 255',
      100: '224 242 254',
      // ... define all shades from 50-900
    }
  }
];
```

## API Integration

The admin portal connects to the main server's API endpoints:

- `GET /api/data` - Fetch all data
- `GET /api/workers` - Get workers list
- `GET /api/jobs` - Get jobs list
- `GET /api/payments` - Get payments
- `PUT /api/workers/:id` - Update worker
- `POST /api/admin/reset-to-sample` - Reset data

WebSocket connection is established automatically for real-time updates.

## Authentication

Default admin credentials:
- **Password**: `admin123`

To change the password, edit `src/contexts/AuthContext.jsx`.

## Deployment

### Railway Deployment

The admin portal is automatically built and served by the main server when deployed to Railway.

1. Build the admin portal:
   ```bash
   npm run build:admin
   ```

2. The built files in `admin/dist` will be served at `/admin/*` routes

3. Access the admin portal at: `https://your-app.railway.app/admin`

### Environment Variables

No additional environment variables are required. The admin portal uses the same backend API as the worker portal.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

When adding new features:

1. Follow the existing component structure
2. Use Tailwind CSS for styling
3. Ensure dark mode compatibility
4. Test with multiple color themes
5. Maintain responsive design

## License

MIT License - See main project LICENSE file
