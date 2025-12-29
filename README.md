# Trippings - Travel Planning Application

<div align="center">
<img width="1200" height="475" alt="Trippings Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

A modern, feature-rich travel planning application built with React, TypeScript, and Tailwind CSS. Plan your trips, manage itineraries, track expenses, and collaborate with friends and family.

## 🌟 Features

### 🗺️ Trip Management
- **Create & Edit Trips**: Plan multiple trips with detailed information
- **Trip Dashboard**: Overview of all your trips with status tracking
- **Destination Management**: Add locations, dates, and trip details
- **Trip Status Tracking**: Monitor planning progress (Not Started, In Progress, Completed)

### 📅 Itinerary Planning
- **Activity Scheduling**: Add and organize activities by date and time
- **Status Management**: Track activity completion status
- **Real-time Updates**: Instant synchronization across devices
- **Activity Categories**: Organize activities by type and priority

### 💰 Expense Tracking
- **Budget Management**: Set and monitor trip budgets
- **Expense Categories**: Categorize expenses (Food, Transport, Accommodation, etc.)
- **Real-time Calculations**: Automatic budget vs expense tracking
- **Visual Progress**: Visual indicators for budget utilization

### 👥 Collaboration
- **Share Trips**: Invite friends and family to collaborate
- **Role-based Access**: Editor and Viewer permissions
- **Real-time Sync**: Instant updates across all collaborators
- **Activity Feed**: Track all changes and activities

### 🤖 AI Insights
- **Smart Recommendations**: Get personalized travel tips
- **Budget Analysis**: AI-powered budget optimization suggestions
- **Trip Completion**: Automatic progress tracking and insights
- **Travel Tips**: Context-aware recommendations based on your trip data

### 🎨 Modern UI/UX
- **Responsive Design**: Works perfectly on all devices
- **Dark Mode**: Toggle between light and dark themes
- **Beautiful Animations**: Smooth transitions and micro-interactions
- **Professional Alerts**: SweetAlert2 integration for notifications

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icon library
- **SweetAlert2**: Professional alert and notification system

### Backend & Database
- **Supabase**: Authentication, database, and real-time subscriptions
- **PostgreSQL**: Robust relational database
- **RLS (Row Level Security)**: Secure data access patterns

### State Management
- **React Hooks**: Local state management
- **IndexedDB (Dexie.js)**: Offline data persistence
- **Real-time Subscriptions**: Live data synchronization

### Development Tools
- **Vite**: Fast development server and build tool
- **ESLint**: Code quality and consistency
- **TypeScript**: Static type checking

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/loii08/trippings.git
   cd trippings
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your environment variables in `.env.local`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEMINI_API_KEY=your_gemini_api_key (optional)
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
trippings/
├── components/          # Reusable UI components
│   ├── ConfirmModal.tsx
│   ├── Layout.tsx
│   ├── Logo.tsx
│   ├── Loading.tsx
│   └── SplashScreen.tsx
├── features/            # Feature-specific components
│   ├── Auth.tsx
│   └── TripDetail.tsx
├── lib/                 # Utility libraries
│   ├── assets.ts
│   └── supabase.ts
├── utils/               # Helper functions
│   └── timeUtils.ts
├── db/                  # Database configuration
│   └── db.ts
├── types.ts             # TypeScript type definitions
├── toast-system.ts      # Notification system
└── App.tsx              # Main application component
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Gemini API Key for AI features
VITE_GEMINI_API_KEY=your_gemini_api_key
```

## 🎯 Usage

### Creating a Trip
1. Click "Add Trip" on the dashboard
2. Fill in trip details (title, destination, dates, budget)
3. Save to create your trip

### Managing Itinerary
1. Open a trip from the dashboard
2. Navigate to the "Itinerary" tab
3. Add activities with date, time, and location
4. Update activity status as you complete them

### Tracking Expenses
1. Go to the "Expenses" tab in your trip
2. Add expenses with amount and category
3. Monitor budget progress in real-time

### Collaborating
1. Open trip settings
2. Add collaborator email addresses
3. Set permissions (Editor/Viewer)
4. Collaborators receive invitation notifications

### AI Insights
1. Navigate to the "Summary" tab
2. Click "Generate Personalized Tips"
3. Receive AI-powered recommendations

## 🔒 Security Features

- **Authentication**: Secure user authentication via Supabase Auth
- **Row Level Security**: Database-level access control
- **Input Validation**: Client-side and server-side validation
- **Secure API Keys**: Environment variable protection
- **HTTPS Ready**: Production-ready security configuration

## 📱 Responsive Design

The application is fully responsive and works on:
- **Desktop**: Full-featured experience
- **Tablet**: Optimized touch interactions
- **Mobile**: Compact, mobile-first design

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase** for the amazing backend-as-a-service platform
- **Tailwind CSS** for the utility-first CSS framework
- **SweetAlert2** for beautiful alert notifications
- **Lucide** for the beautiful icon set
- **React** for the powerful UI library

## 📞 Support

If you have any questions or need support, please:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

**Happy Travels with Trippings! ✈️🌍**