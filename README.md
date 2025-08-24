# ESG Portal - Comprehensive Sustainability Management Application

## Overview

ESG Portal is a comprehensive Environmental, Social, and Governance (ESG) data collection and reporting application designed specifically for Small and Medium Enterprises (SMEs) in the UAE. The application streamlines ESG compliance by providing an intelligent onboarding system, automated framework assignment, integrated data collection workflows, and professional reporting capabilities with a modern, user-friendly interface.

## Key Features

### 🔐 Authentication & User Management
- **User Registration & Login**: Secure account creation with email/password authentication
- **Session-based Security**: Robust session management with CSRF protection
- **Multi-tenant Support**: User-specific data isolation with company-based access control
- **Protected Routes**: Client-side route protection with automatic redirects
- **Professional UI**: Modern login/signup forms with validation and user feedback

### 🏢 Company Onboarding
- **Basic Information Collection**: Emirates, sector, and business activities
- **Dynamic Activity Selection**: Pre-defined hospitality activities with custom addition capability
- **Select All/Deselect All**: Bulk selection functionality for activities
- **User-Company Association**: Each company is linked to the authenticated user

### 📋 Framework Management
- **Automatic Framework Assignment**: 
  - Core ESG framework (mandatory for all)
  - Dubai Sustainable Tourism (DST) framework for Dubai hospitality entities
  - Dubai Energy Regulations for all Dubai establishments
  - Geographic and sector-specific conditional frameworks
- **Voluntary Framework Selection**: Green Key certification and other optional standards
- **Framework Hierarchy**: Primary mandatory, secondary mandatory, and voluntary frameworks
- **User-Specific Frameworks**: Framework assignments linked to user accounts

### 🔍 Profiling Wizard & Data Checklist
- **Intelligent Questionnaire**: Dynamic yes/no questions based on selected frameworks
- **Smart Data Element Generation**: Personalized checklist combining mandatory and conditional requirements
- **De-duplication Logic**: Eliminates duplicate data elements across multiple frameworks
- **Frequency Consolidation**: Adopts most frequent collection cadence when frameworks conflict
- **Progress Tracking**: Visual progress indicators for profiling completion

### 📊 Meter Management
- **Auto-meter Creation**: Automatic generation of "Main" meters for all metered data elements
- **Full CRUD Operations**: Create, read, update, delete functionality with modal interfaces
- **Meter Attributes**: Type, name, account number, location, and status tracking
- **Smart Type Mapping**: Automatic mapping between frontend and backend meter types
- **Data Protection**: Cannot delete meters with associated data (deactivation only)
- **Professional Modals**: All meter operations use modal windows instead of browser alerts
- **Auto Badge Detection**: Visual indicators for auto-generated vs manually created meters
- **Active/Inactive Status**: Toggle meter status with confirmation modals

### 📈 Data Collection & Tracking
- **Month-Centric Interface**: Year and month selection with current year logic
- **Unified Data Entry**: Single view for all collection tasks including metered and non-metered items
- **Evidence Upload**: Support for uploading supporting documentation
- **Dynamic Task Generation**: Automatic creation of data tasks when new meters are added
- **Real-time Integration**: Seamless meter-to-data-entry workflow
- **Progress Tracking**: 
  - Separate counting of data entry and evidence uploads (tasks = submissions × 2)
  - Monthly completion rates with visual progress bars
  - Annual progress tracking with trend analysis
  - Exclusion of inactive meters from progress calculations
- **Status Indicators**: Missing, Partial, Complete status for each data entry
- **Navigation-based Refresh**: Automatic data refresh when navigating to Data page

### 📊 Dashboard & Analytics
- **Key Metrics Display**: Active frameworks, data elements, registered meters
- **Data Visualization**: Interactive charts showing collected data trends and patterns
- **Progress Overview**: Comprehensive view of completion status with monthly breakdown
- **Export Functionality**: 
  - Format Selection Modal: Choose between Excel/CSV and PDF formats
  - Data Completeness Warnings: Modal notifications for incomplete data
  - Professional Export Reports: Time-range specific reports with comprehensive data
- **Quick Actions**: Direct navigation to key application sections
- **Deadline Management**: Track and manage ESG reporting deadlines
- **Professional Notifications**: Modal-based alerts instead of browser popups

### 🎨 User Interface & Experience
- **Modern Design**: Clean, professional interface using Tailwind CSS
- **Responsive Layout**: Mobile-friendly design that works across all devices
- **Modal-based Interactions**: Professional modal windows for all user interactions
- **Context Menu Systems**: Intuitive dropdown menus and action buttons
- **Visual Feedback**: Loading states, progress indicators, and status badges
- **Consistent Theming**: Cohesive color scheme and typography throughout
- **Accessibility**: Keyboard navigation and screen reader support

## Technology Stack

### Backend
- **Framework**: Django 4.2.7 with Django REST Framework 3.14.0
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: Django's built-in session-based authentication with CSRF protection
- **CORS**: Configured for multiple frontend ports (development and production)
- **Static Files**: WhiteNoise 6.9.0 for static file serving
- **Production Server**: Gunicorn 21.2.0 WSGI server
- **Environment Management**: python-dotenv for configuration management

### Frontend
- **Framework**: React 18.2.0 with modern JavaScript (ES6+)
- **Routing**: React Router DOM 6.3.0 with protected routes
- **Styling**: Tailwind CSS 3.1.0 with responsive design
- **HTTP Client**: Custom authenticated request wrapper with CSRF token handling
- **Context Management**: React Context API for global state (authentication)
- **Build Tool**: Create React App 5.0.1 with production optimizations
- **Icons**: Font Awesome for consistent iconography

### Development & Deployment
- **Platform**: Render.com ready with automated deployments
- **Build Process**: Automated React build with Django collectstatic
- **Environment**: Production-ready configuration with environment variables
- **Development Tools**: Hot reloading, ESLint, and modern development experience
- **Port Configuration**: Multi-port support for development (3000-3003, 7701, 7702)

## Database Schema

### Core Entities
- **User**: Django's built-in User model for authentication
- **Companies**: Company information with user foreign key relationship
- **Activities**: Business activities with user-specific many-to-many relationship
- **Frameworks**: ESG frameworks (mandatory, voluntary, conditional)
- **DataElements**: Master list of all possible data collection points
- **ProfilingQuestions**: Dynamic questionnaire for personalized data requirements

### Data Collection
- **Meters**: Company-specific measurement devices with user association and auto-creation flags
- **CompanyDataSubmissions**: Actual data values with evidence file support and user relationship
- **CompanyProfileAnswers**: Stored responses to profiling questions with user context
- **CompanyChecklist**: Personalized data collection requirements with user-specific generation
- **CompanyFramework**: User-specific framework assignments with auto-assignment tracking

### Relationships
- All core entities include user foreign keys for multi-tenant data isolation
- Cascade deletion policies ensure data consistency
- Unique constraints prevent data duplication per user
- Migration history tracks schema evolution

## API Endpoints

### Authentication
- `POST /api/auth/login/` - User login with session creation
- `POST /api/auth/logout/` - User logout with session cleanup
- `POST /api/auth/register/` - User registration
- `GET /api/auth/user/` - Get current authenticated user

### Company Management (User-Scoped)
- `GET /api/companies/` - List user's companies
- `POST /api/companies/` - Create company for authenticated user
- `GET /api/companies/{id}/` - Get company details (user-owned only)
- `PUT /api/companies/{id}/` - Update company (user-owned only)

### Framework & Data Elements
- `GET /api/companies/{id}/frameworks/` - List company's assigned frameworks
- `GET /api/data-elements/` - List data elements
- `GET /api/profiling-questions/` - Get profiling questions for company
- `POST /api/profiling-questions/save_answers/` - Save profiling responses

### Meter Management (User-Scoped)
- `GET /api/meters/?company_id={id}` - List company meters (user-owned)
- `POST /api/meters/?company_id={id}` - Create meter for company
- `PATCH /api/meters/{id}/?company_id={id}` - Update meter
- `DELETE /api/meters/{id}/?company_id={id}` - Delete meter (with data protection)

### Data Collection (User-Scoped)
- `GET /api/companies/{id}/profile_answers/` - Get saved answers
- `POST /api/companies/{id}/save_profile_answer/` - Save individual answers
- `GET /api/companies/{id}/data-submissions/` - Get submitted data with filtering
- `POST /api/companies/{id}/data-submissions/` - Submit data with evidence
- `GET /api/companies/{id}/dashboard-data/` - Get dashboard statistics and charts

## Installation & Setup

### Development Environment

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ESG-Portal
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py populate_initial_data
   python manage.py createsuperuser  # Optional: Create admin user
   python manage.py runserver 0.0.0.0:8000
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start  # Starts development server on port 3000
   ```

### Production Deployment

#### Build Commands
```bash
# Collect Django static files
cd backend && python3 manage.py collectstatic --noinput

# Build React production bundle
cd frontend && npm run build
```

#### Render.com Deployment
1. **Build Command**: `./render-build.sh`
2. **Start Command**: `cd backend && gunicorn esg_backend.wsgi:application --bind 0.0.0.0:$PORT`
3. **Environment Variables**: Configure database and security settings

#### Alternative Static Serving
```bash
# Serve built React app
python3 frontend/build-good/server.py  # Custom server with React Router support
```

## User Journey

### New User Registration & Onboarding
1. **Account Creation**: Register with email/password on signup page
2. **Login**: Secure authentication with session management
3. **Company Registration**: Create company profile with emirate/sector selection
4. **Activity Selection**: Choose relevant business activities
5. **Framework Assignment**: Automatic assignment based on company profile

### ESG Data Management
6. **Profiling Wizard**: Answer questions to personalize data requirements
7. **Meter Configuration**: Review auto-created meters and add custom ones
8. **Data Collection**: Monthly data entry with evidence upload
9. **Progress Monitoring**: Track completion via dashboard analytics
10. **Export & Reporting**: Generate Excel/CSV reports (PDF coming soon)

### Ongoing Management
- **Dashboard Monitoring**: Regular progress review and trend analysis
- **Meter Management**: Add/edit/deactivate meters as operations change
- **Data Maintenance**: Update historical data and upload new evidence
- **User Settings**: Logout and account management

## ESG Framework Coverage

### Dubai Sustainable Tourism (DST)
- **19+ Sustainability Requirements** covering energy, water, waste, community engagement
- **Monthly/Annual Cadence** for different data elements
- **Mandatory for Dubai hospitality entities**
- **Integrated with Dubai Energy Regulations**

### Dubai Energy Regulations
- **Mandatory for all Dubai establishments**
- **Supreme Council of Energy compliance requirements**
- **Energy efficiency and consumption monitoring**

### Core ESG Standards
- **Universal ESG coverage** for all entities
- **Environmental metrics**: Carbon footprint, resource consumption
- **Social metrics**: Employee welfare, community engagement
- **Governance metrics**: Policies, training, risk management

### Green Key Certification (Voluntary)
- **13+ Criteria Areas** including water efficiency, waste management, energy conservation
- **Voluntary eco-label** with comprehensive sustainability metrics
- **Focus on operational improvements** and guest engagement

## Data Element Categories

### Must-Have Elements (All Entities)
- Electricity and water consumption with meter integration
- Waste to landfill tracking with disposal documentation
- Sustainability policies and personnel assignments
- Employee training records and community initiatives
- Government compliance documentation and risk assessments

### Conditional Elements (Based on Operations)
- Generator and vehicle fuel consumption monitoring
- LPG usage for kitchen operations
- Green meeting/event services tracking
- Renewable energy utilization reporting
- Food sourcing and waste reduction programs

## Security & Compliance

### Authentication Security
- **Session-based Authentication**: Secure session management with Django
- **CSRF Protection**: Cross-Site Request Forgery prevention
- **Password Security**: Django's built-in password validation and hashing
- **User Isolation**: Complete data separation between user accounts

### Data Protection
- **Multi-tenant Architecture**: User-specific data access controls
- **Input Validation**: Comprehensive server-side validation
- **File Upload Security**: Secure evidence file handling with proper storage
- **API Security**: User-scoped endpoints with permission checking

### Production Security
- **Environment Variables**: Sensitive configuration via environment
- **CORS Configuration**: Controlled cross-origin resource sharing
- **Static File Security**: WhiteNoise configuration for secure static serving
- **Database Security**: Proper connection handling and query protection

## Performance & Optimization

### Frontend Optimization
- **Code Splitting**: Optimized React build with lazy loading potential
- **Bundle Size**: ~88KB gzipped JavaScript, ~8KB CSS
- **Caching**: Static asset caching and browser optimization
- **Responsive Images**: Optimized asset delivery

### Backend Optimization
- **Database Queries**: Optimized ORM queries with select_related and prefetch_related
- **Static Files**: WhiteNoise for efficient static file serving
- **Session Management**: Efficient session handling and cleanup
- **API Response**: Optimized JSON serialization

## File Structure
```
ESG-Portal/
├── backend/                    # Django backend application
│   ├── core/                  # Main application logic
│   │   ├── models.py         # Database models with user relationships
│   │   ├── views.py          # API endpoints with authentication
│   │   ├── services.py       # Business logic services
│   │   ├── auth_views.py     # Authentication endpoints
│   │   └── migrations/       # Database migration files
│   ├── esg_backend/          # Project configuration
│   │   ├── settings.py       # Django settings with CORS/security
│   │   └── urls.py          # URL routing configuration
│   ├── media/                # Uploaded evidence files
│   ├── staticfiles/          # Collected static files for production
│   └── requirements.txt      # Python dependencies
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Dashboard.js  # Main dashboard with analytics
│   │   │   ├── Data.js       # Data collection interface
│   │   │   ├── Meter.js      # Meter management with modals
│   │   │   ├── Login.js      # Authentication forms
│   │   │   └── ...           # Other components
│   │   ├── context/          # React context providers
│   │   │   └── AuthContext.js # Authentication state management
│   │   └── utils/            # Utility functions
│   ├── build/                # Production build output
│   ├── public/              # Static assets
│   └── package.json         # Node.js dependencies
├── render-build.sh          # Production build script
└── README.md               # This documentation
```

## Recent Improvements & Features

### Modal Interface System
- **Professional Modals**: Replaced all browser alerts with custom modal windows
- **Context-Aware Actions**: Different modal types for confirmations, notifications, and errors
- **Consistent UX**: Unified modal design across all application features
- **User Feedback**: Clear success/error messages with appropriate styling

### Enhanced Export System
- **Format Selection**: Modal-driven choice between Excel/CSV and PDF formats
- **Data Completeness Warnings**: Intelligent warnings for incomplete data exports
- **Professional Reports**: Comprehensive export with metadata and statistics
- **Future-Ready**: Infrastructure prepared for PDF template implementation

### Authentication Integration
- **Complete User System**: Full registration, login, logout workflow
- **Data Security**: User-scoped data access throughout the application
- **Session Management**: Robust session handling with proper cleanup
- **Route Protection**: Client-side route guards with automatic redirects

### Meter Management Enhancement
- **Auto-Generation Detection**: Visual badges for system-generated vs manual meters
- **Data Protection**: Smart deletion prevention for meters with associated data
- **Status Management**: Professional activate/deactivate workflow with confirmations
- **Type Integration**: Seamless integration between meter types and data collection

## Contributing & Development

### Code Standards
- **Django Best Practices**: RESTful API design with proper serialization
- **React Patterns**: Modern React with hooks, context, and functional components
- **Responsive Design**: Mobile-first design with Tailwind CSS utilities
- **Error Handling**: Comprehensive error handling with user-friendly messages

### Development Workflow
1. **Backend Changes**: Update models, views, services in Django
2. **Database Migrations**: Create and apply migrations for schema changes
3. **Frontend Updates**: Implement React components with proper state management
4. **Testing**: Test authentication flows and user interactions
5. **Build & Deploy**: Run collectstatic and npm build for production deployment

### Future Roadmap
- **PDF Report Generation**: Professional PDF templates with charts and branding
- **Advanced Analytics**: Enhanced dashboard with trend analysis and predictions
- **Mobile App**: React Native mobile application for field data collection
- **Integration APIs**: Third-party integrations with accounting and ERP systems
- **Bulk Import**: CSV/Excel import functionality for historical data

---

*ESG Portal v2.0 - Complete sustainability management solution with modern authentication, professional UI, and comprehensive ESG compliance tools for UAE businesses*