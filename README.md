# Artificial Artistic Thinking Training Platform

A state-of-the-art Nuxt 3 application for capturing artists' creative DNA through secure, multi-modal training modules. This platform facilitates AI model training through portfolio sharing, monologue recording, peer training sessions, and observational learning.

## 🚀 Features

### Core Training Modules

- **Portfolio Training**: Upload PDFs and share portfolio links
- **Monologue Training**: Record audio responses to creative prompts
- **Peer Training**: Collaborative video sessions (coming soon)
- **Observation Training**: Environmental learning patterns (coming soon)

### Technical Stack

- **Frontend**: Nuxt 3, Vue 3, TypeScript
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: Supabase Storage for file uploads
- **Styling**: Tailwind CSS with custom minimalist design
- **State Management**: Pinia
- **Deployment**: Vercel/Netlify compatible

### Security & Performance

- Row Level Security (RLS) policies
- Server-side file validation
- Type-safe API routes
- Optimized build with code splitting
- SSR for better performance and SEO

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Git

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd nuxt3-ai-training-platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp env.example .env
```

Fill in your environment variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Configuration (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:[password]@[host]:5432/[database]?schema=public&pgbouncer=true"
DIRECT_URL="postgresql://postgres:[password]@[host]:5432/[database]?schema=public"
```

### 4. Set up Supabase

#### Create Storage Buckets

In your Supabase dashboard, create these storage buckets:

- `portfolio-assets`
- `monologue-recordings`
- `peer-training-recordings`

#### Configure RLS Policies

Apply the RLS policies as defined in the technical brief:

```sql
-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- User can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- Similar policies for portfolio_shares, monologue_recordings, etc.
```

### 5. Set up database with Prisma

```bash
# Generate Prisma client
npx prisma generate

# Push database schema to Supabase
npx prisma db push

# Optional: Open Prisma Studio
npx prisma studio
```

### 6. Run development server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
├── assets/
│   └── css/
│       └── main.css              # Tailwind CSS and custom styles
├── components/                   # Reusable Vue components
├── composables/
│   ├── useAuth.ts               # Authentication logic
│   ├── useFileUpload.ts         # File upload utilities
│   └── useMediaRecorder.ts      # Audio/video recording
├── layouts/
│   └── default.vue              # Main layout with navigation
├── middleware/
│   └── auth.global.ts           # Global authentication middleware
├── pages/
│   ├── index.vue                # Landing page
│   ├── login.vue                # Authentication pages
│   ├── register.vue
│   └── training/
│       ├── portfolio.vue        # Training modules
│       ├── monologue.vue
│       ├── peer-training.vue
│       └── observation.vue
├── prisma/
│   └── schema.prisma            # Database schema
├── server/
│   ├── api/                     # API routes
│   │   ├── auth/
│   │   ├── portfolio/
│   │   └── monologue/
│   └── utils/
│       └── prisma.ts            # Prisma client singleton
├── stores/                      # Pinia stores
├── nuxt.config.ts              # Nuxt configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── package.json
```

## 🚀 Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Environment Variables for Production

Ensure these are set in your deployment environment:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run type-check   # TypeScript type checking
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
```

### Code Quality

The project includes:

- ESLint for code linting
- TypeScript for type safety
- Prettier for code formatting
- Pre-commit hooks (recommended)

## 🏛️ Architecture Decisions

### Lean SOTA Approach

This platform follows a "Lean State-of-the-Art" philosophy:

- **Minimalist UI**: Sharp corners, clean typography, no unnecessary elements
- **Type Safety**: Full TypeScript implementation with strict mode
- **Performance**: SSR, code splitting, optimized assets
- **Security**: RLS policies, server-side validation, secure file uploads
- **Scalability**: Prisma ORM, Supabase backend, modular architecture

### Database Design

- **User Profiles**: Linked to Supabase Auth users
- **Portfolio Shares**: Links and PDF paths with user association
- **Monologue Recordings**: Audio files with metadata
- **Peer Training**: Video sessions with participant tracking
- **RLS Security**: Row-level security for all user data

## 🛡️ Security Considerations

- All file uploads processed server-side
- RLS policies prevent unauthorized data access
- Input validation with Zod schemas
- Secure authentication with Supabase
- Environment variables for sensitive data

## 🔮 Future Enhancements

- **WebRTC Integration**: Real-time peer training sessions
- **Advanced Analytics**: Training progress tracking
- **Mobile App**: React Native companion app
- **AI Integration**: Direct model training capabilities
- **Advanced Observation Module**: Environmental pattern recognition

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the existing code style
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is proprietary. All rights reserved.

## 🆘 Support

For technical support or questions about the platform:

1. Check the documentation
2. Review existing issues
3. Create a new issue with detailed information

---

**Built with ❤️ for artists and AI researchers** 