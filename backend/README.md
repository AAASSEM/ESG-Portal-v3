# ESG Portal Backend

A comprehensive Django REST API backend for the ESG (Environmental, Social, and Governance) onboarding and data collection application for UAE hospitality SMEs.

## Features

- **Module 1: Company Onboarding** - Company registration with business activities
- **Module 2: Framework Selection** - Automatic and voluntary ESG framework assignment
- **Module 3: Profiling Wizard & Checklist** - Personalized data requirements generation
- **Module 4: Meter Management** - CRUD operations for measurement devices
- **Module 5: Data Collection & Tracking** - Month-by-month data entry with progress tracking
- **Module 6: Dashboard** - Comprehensive analytics and visualization data

## Technology Stack

- **Backend**: Django 4.2, Django REST Framework
- **Database**: SQLite (development), PostgreSQL (production ready)
- **Authentication**: Django Session Authentication
- **File Storage**: Local filesystem with media handling

## Quick Start

### Prerequisites

- Python 3.8+
- pip (Python package manager)

### Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   
   # Activate virtual environment
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run database migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Populate initial data:**
   ```bash
   python manage.py populate_initial_data
   ```

6. **Create superuser (optional):**
   ```bash
   python manage.py createsuperuser
   ```

7. **Start development server:**
   ```bash
   python manage.py runserver
   ```

The API will be available at: `http://127.0.0.1:8000/api/`

## API Documentation

### Base URL
`http://127.0.0.1:8000/api/`

### Authentication
Currently configured for development with `AllowAny` permissions. In production, implement proper authentication.

### API Endpoints

#### Companies
- `GET /api/companies/` - List all companies
- `POST /api/companies/` - Create new company
- `GET /api/companies/{id}/` - Get company details
- `GET /api/companies/{id}/progress/` - Get company's module completion progress

#### Activities  
- `GET /api/activities/` - List all business activities
- `POST /api/activities/add_custom/` - Add custom activity

#### Frameworks
- `GET /api/frameworks/` - List all frameworks
- `GET /api/frameworks/voluntary/` - List voluntary frameworks
- `POST /api/frameworks/assign_voluntary/` - Assign voluntary framework to company

#### Profiling Questions
- `GET /api/profiling-questions/` - List all profiling questions
- `GET /api/profiling-questions/for_company/?company_id={id}` - Get questions for specific company
- `POST /api/profiling-questions/save_answers/` - Save profiling wizard answers

#### Checklist
- `GET /api/checklist/?company_id={id}` - Get company's personalized checklist
- `POST /api/checklist/generate/` - Generate checklist for company

#### Meters
- `GET /api/meters/?company_id={id}` - List company's meters
- `POST /api/meters/` - Create new meter
- `PUT /api/meters/{id}/` - Update meter
- `DELETE /api/meters/{id}/` - Delete meter (if no associated data)
- `POST /api/meters/auto_create/` - Auto-create default meters

#### Data Collection
- `GET /api/data-collection/?company_id={id}&year={year}&month={month}` - Get submissions
- `POST /api/data-collection/` - Create/update data submission
- `GET /api/data-collection/available_months/?year={year}` - Get available months
- `GET /api/data-collection/tasks/?company_id={id}&year={year}&month={month}` - Get collection tasks
- `GET /api/data-collection/progress/?company_id={id}&year={year}&month={month}` - Get progress

#### Dashboard
- `GET /api/dashboard/?company_id={id}` - Get dashboard statistics

### Request/Response Examples

#### Create Company
```bash
POST /api/companies/
{
  "name": "Emirates Hotels Group",
  "emirate": "dubai",
  "sector": "hospitality",
  "activities": ["Hotel Operations", "Food & Beverage", "Spa & Wellness"]
}
```

#### Save Profiling Answers
```bash
POST /api/profiling-questions/save_answers/
{
  "company_id": 1,
  "answers": [
    {"question_id": "has_backup_generators", "answer": true},
    {"question_id": "has_company_vehicles", "answer": false}
  ]
}
```

#### Create Data Submission
```bash
POST /api/data-collection/
{
  "company": 1,
  "element": "electricity_consumption",
  "meter": 1,
  "reporting_year": 2024,
  "reporting_period": "Jan",
  "value": "2450",
  "evidence_file": [file upload]
}
```

## Data Flow

### Module 1: Company Onboarding
1. Create company with basic info and activities
2. System auto-assigns mandatory frameworks based on emirate/sector

### Module 2: Framework Selection  
1. Display mandatory frameworks (auto-assigned)
2. Allow selection of voluntary frameworks
3. Update company's framework assignments

### Module 3: Profiling Wizard & Checklist
1. Generate profiling questions based on company's frameworks
2. Save user answers to determine conditional data requirements
3. Generate personalized checklist with de-duplication and frequency consolidation

### Module 4: Meter Management
1. Auto-create default "Main" meters for all metered data elements
2. Allow CRUD operations on meters
3. Prevent deletion of meters with associated data

### Module 5: Data Collection & Tracking
1. Navigate by reporting year and month
2. Display unified data entry tasks (metered + non-metered)
3. Track submission status (missing/partial/complete)
4. Calculate progress percentages

### Module 6: Dashboard
1. Display key statistics and KPIs
2. Provide data for visualization charts
3. Show framework compliance status

## Business Logic

### Framework Assignment
- **ESG**: Mandatory for all companies
- **DST**: Auto-assigned if emirate="dubai" AND sector="hospitality"
- **Others**: Available as voluntary selections

### Checklist Generation
- Combines "must-have" elements with activated "conditional" elements
- De-duplicates elements required by multiple frameworks
- Adopts most frequent cadence (monthly > quarterly > annually)

### Data Collection Rules
- Current year: Show months from January to current month
- Past years: Show all 12 months
- Future years: No months available

### Progress Calculation
- **Data Progress**: Percentage of submissions with values
- **Evidence Progress**: Percentage of submissions with uploaded files
- **Overall Progress**: Module completion tracking

## Database Schema

The application implements the complete database schema from the functional specification:
- Companies and their activities
- ESG frameworks and assignments  
- Data elements with framework mappings
- Profiling questions and answers
- Meters and data submissions
- Generated checklists

## File Storage

Evidence files are stored in `media/evidence/` directory. In production, configure cloud storage (AWS S3, etc.).

## Development

### Running Tests
```bash
python manage.py test
```

### Admin Interface
Access Django admin at: `http://127.0.0.1:8000/admin/`

### Database Management
```bash
# Create new migration
python manage.py makemigrations

# Apply migrations  
python manage.py migrate

# Reset database (development only)
python manage.py flush
python manage.py populate_initial_data
```

## Production Deployment

1. **Environment Variables:**
   - Set `DEBUG=False`
   - Configure `SECRET_KEY`
   - Set `ALLOWED_HOSTS`

2. **Database:**
   - Switch to PostgreSQL
   - Configure connection settings

3. **Static/Media Files:**
   - Configure cloud storage
   - Set up CDN

4. **Security:**
   - Implement proper authentication
   - Enable HTTPS
   - Configure CORS properly

## API Integration

The backend is designed to work with any frontend framework. CORS is configured to allow requests from `localhost:3000` (React development server).

### Frontend Integration Points:
1. **User Journey**: Linear progression through 6 modules
2. **State Management**: Track completion status for each module
3. **Form Handling**: Dynamic forms based on API responses
4. **File Uploads**: Handle evidence file submissions
5. **Data Visualization**: Dashboard statistics for charts/graphs

## Support

For issues and questions:
1. Check the Django logs
2. Use Django admin interface for data inspection
3. Review API responses for error details

## License

This project is developed for UAE hospitality sector ESG compliance.