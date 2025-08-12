# VAQ+ Admin Dashboard

A comprehensive Firebase database management interface for the VAQ+ mobile app, built with Svelte and TypeScript.

## 🎯 Overview

The VAQ+ Admin Dashboard is a professional, beautiful, and highly functional interface for managing all aspects of the VAQ+ vaccination and pediatric care mobile app. It provides administrators with complete control over the Firebase backend, including products, appointments, users, pediatricians, articles, and locations.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Svelte + SvelteKit
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Language**: TypeScript
- **Styling**: CSS with modern design system
- **State Management**: Svelte stores

### Project Structure
```
src/routes/
├── +layout.svelte          # Main layout with navigation
├── +page.svelte           # Dashboard overview
├── login/
│   └── +page.svelte       # Authentication page
├── products/
│   └── +page.svelte       # Products management
├── appointments/
│   └── +page.svelte       # Appointments management
├── users/
│   └── +page.svelte       # Users management
├── pediatricians/
│   └── +page.svelte       # Pediatricians management
├── articles/
│   └── +page.svelte       # Articles management
├── locations/
│   └── +page.svelte       # Locations management
├── analytics/
│   └── +page.svelte       # Analytics dashboard
├── components/
│   ├── DataTable.svelte   # Reusable data table
│   └── ...                # Other components
├── stores/
│   └── auth.ts           # Authentication store
├── types/
│   └── index.ts          # TypeScript type definitions
└── README.md             # This file
```

## 🔐 Authentication & Security

### Admin-Only Access
- Only users with `isAdmin: true` can access the interface
- Firebase Authentication with custom claims
- Role-based access control
- Secure session management

### Security Features
- Protected routes
- Admin validation on every request
- Secure Firebase configuration
- Input validation and sanitization

## 📊 Database Collections

### 1. Products Collection
Stores all medical products (vaccines, bundles, packages)

**Fields:**
- `id`: Unique identifier
- `type`: 'vaccine' | 'bundle' | 'package'
- `name`: Product name
- `commonName`: Common name
- `description`: Product description
- `price`: Base price
- `priceAvacunar`, `priceVita`, `priceColsanitas`: Partner prices
- `imageUrl`: Product image
- `applicableDoctors`: Array of doctor IDs
- `minAge`, `maxAge`: Age range
- `specialIndications`: Special medical notes
- `manufacturer`: Product manufacturer
- `dosageInfo`: Dosage information
- `targetDiseases`: Diseases this product targets
- `dosesAndBoosters`: Dose schedule
- `includedProductIds`: Products included in bundles
- `includedDoseBundles`: Dose bundles included
- `targetMilestone`: Target milestone
- `createdAt`: Creation timestamp

### 2. Articles Collection
Educational and promotional content

**Fields:**
- `id`: Unique identifier
- `title`: Article title
- `excerpt`: Article excerpt
- `body`: Article content
- `heroImageUrl`: Hero image
- `publishedAt`: Publication date
- `category`: 'education' | 'promotion' | 'announcement'
- `tags`: Array of tags
- `author`: Author name
- `createdAt`: Creation timestamp

### 3. Locations Collection
Clinic locations and addresses

**Fields:**
- `id`: Unique identifier
- `name`: Location name
- `address`: Full address
- `createdAt`: Creation timestamp

### 4. Pediatricians Collection
Doctor profiles and information

**Fields:**
- `id`: Unique identifier
- `email`: Email address
- `displayName`: Display name
- `photoUrl`: Profile photo
- `phoneNumber`: Phone number
- `isAdmin`: Admin privileges
- `userType`: 'pediatrician'
- `specialty`: Medical specialty
- `licenseNumber`: Medical license
- `clinicLocationIds`: Associated locations
- `bio`: Professional bio
- `yearsExperience`: Years of experience
- `createdAt`: Creation timestamp
- `lastLoginAt`: Last login timestamp

### 5. Users Collection
Regular user accounts

**Fields:**
- `id`: Unique identifier
- `email`: Email address
- `displayName`: Display name
- `photoUrl`: Profile photo
- `phoneNumber`: Phone number
- `isAdmin`: Admin privileges
- `userType`: 'normal'
- `patientProfileIds`: Associated patient profiles
- `preferredLocationId`: Preferred clinic location
- `createdAt`: Creation timestamp
- `lastLoginAt`: Last login timestamp

### 6. Appointments Collection
Patient appointments and scheduling

**Fields:**
- `id`: Unique identifier
- `patientId`: Patient ID
- `patientName`: Patient name
- `doctorId`: Doctor ID
- `doctorName`: Doctor name
- `doctorSpecialty`: Doctor specialty
- `dateTime`: Appointment date/time
- `durationMinutes`: Appointment duration
- `locationId`: Location ID
- `locationName`: Location name
- `locationAddress`: Location address
- `type`: Appointment type
- `productIds`: Associated products
- `status`: Appointment status
- `notes`: Additional notes
- `createdAt`: Creation timestamp
- `createdByUserId`: Creator user ID
- `lastUpdatedAt`: Last update timestamp

### 7. Medical History Collection
Patient medical records (user-specific)

**Complex structure including:**
- Allergies
- Chronic conditions
- Past medical history
- Mental health conditions
- Current medications
- Past medications
- Surgical history
- Hospitalizations
- Immunization history
- Family history
- Lifestyle information
- OB/GYN history
- Blood type
- Organ donor status

## 🎨 Features

### Dashboard
- **Key Metrics**: Total users, pediatricians, products, appointments
- **Today's Stats**: Today's appointments, weekly trends
- **Recent Activity**: Latest appointments, new users, system activities
- **Quick Actions**: Quick access to common tasks

### CRUD Operations
- **Create**: Add new records with validation
- **Read**: View and search records
- **Update**: Edit existing records
- **Delete**: Remove records with confirmation
- **Bulk Operations**: Select multiple records for bulk actions

### Advanced Features
- **Real-time Updates**: Live data synchronization
- **Search & Filtering**: Advanced search capabilities
- **Sorting**: Multi-column sorting
- **Pagination**: Efficient data loading
- **Export**: CSV and JSON export
- **Image Upload**: Product and article images
- **Rich Text Editor**: Article content editing

### Data Visualization
- **Charts**: Appointment trends, user growth
- **Analytics**: Revenue tracking, usage statistics
- **Reports**: Custom report generation
- **Metrics**: Key performance indicators

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Firebase project with Firestore enabled
- Firebase Authentication configured
- Admin user account created

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DesVallees
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project
   - Enable Firestore, Authentication, and Storage
   - Get your Firebase configuration
   - Update the Firebase config in the layout files

4. **Set up Firebase Security Rules**
   ```javascript
   // Firestore security rules
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Public read access for products, articles, locations, pediatricians
       match /{document=**} {
         allow read: if true;
         allow write: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
       }
       
       // User-specific access for appointments, users, medical_history
       match /appointments/{appointmentId} {
         allow read, write: if request.auth != null && 
           (resource.data.patientId == request.auth.uid || 
            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
       }
       
       match /users/{userId} {
         allow read, write: if request.auth != null && 
           (request.auth.uid == userId || 
            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
       }
       
       match /medical_history/{patientId} {
         allow read, write: if request.auth != null && 
           (request.auth.uid == patientId || 
            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
       }
     }
   }
   ```

5. **Create Admin User**
   - Create a user in Firebase Authentication
   - Add a document to the `users` collection with `isAdmin: true`

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Access the admin interface**
   - Navigate to `/vaqmas`
   - Login with admin credentials

## 📱 Usage

### Navigation
The interface uses a sidebar navigation with the following sections:
- **Dashboard**: Overview and metrics
- **Productos**: Product management
- **Citas**: Appointment management
- **Usuarios**: User management
- **Pediatras**: Pediatrician management
- **Artículos**: Article management
- **Ubicaciones**: Location management
- **Analytics**: Data visualization

### Common Operations

#### Managing Products
1. Navigate to **Productos**
2. Use search to find specific products
3. Click **Crear Producto** to add new products
4. Use edit/delete buttons for existing products
5. View product statistics in the cards below

#### Managing Appointments
1. Navigate to **Citas**
2. View all appointments with filtering options
3. Create new appointments
4. Update appointment status
5. View appointment analytics

#### User Management
1. Navigate to **Usuarios**
2. View all registered users
3. Manage user permissions
4. View user activity and profiles

## 🎨 Design System

### Color Palette
- **Primary**: Blue gradient (#667eea to #764ba2)
- **Success**: Green (#43e97b to #38f9d7)
- **Warning**: Orange (#f59e0b)
- **Error**: Red (#ef4444)
- **Neutral**: Gray scale (#f8fafc to #1f2937)

### Typography
- **Headings**: Inter, bold weights
- **Body**: Inter, regular weights
- **Monospace**: For code and data

### Components
- **Cards**: Rounded corners, subtle shadows
- **Buttons**: Gradient backgrounds, hover effects
- **Tables**: Clean, sortable, responsive
- **Forms**: Validation, error states
- **Modals**: Overlay dialogs for actions

## 📊 Performance

### Optimization Features
- **Lazy Loading**: Components load on demand
- **Pagination**: Efficient data loading
- **Caching**: Firebase offline persistence
- **Image Optimization**: Compressed images
- **Code Splitting**: Route-based splitting

### Monitoring
- **Error Tracking**: Console logging
- **Performance Metrics**: Load times
- **User Analytics**: Usage patterns
- **Database Monitoring**: Query performance

## 🔒 Security Best Practices

### Authentication
- Admin-only access control
- Session management
- Secure token handling
- Logout functionality

### Data Protection
- Input validation
- SQL injection prevention
- XSS protection
- CSRF protection

### Firebase Security
- Proper security rules
- Admin validation
- Data access control
- Audit logging

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Deployment Options
1. **Vercel**: Automatic deployment from Git
2. **Netlify**: Drag and drop deployment
3. **Firebase Hosting**: Integrated with Firebase
4. **Custom Server**: Any Node.js server

### Environment Setup
1. Set production Firebase config
2. Configure environment variables
3. Set up custom domain (optional)
4. Enable HTTPS
5. Configure CDN (optional)

## 🧪 Testing

### Test Structure
```
tests/
├── unit/
│   ├── components/
│   ├── stores/
│   └── utils/
├── integration/
│   ├── auth/
│   ├── crud/
│   └── navigation/
└── e2e/
    ├── admin-flow/
    └── user-flow/
```

### Running Tests
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm test
```

## 📈 Analytics & Monitoring

### Key Metrics
- **User Engagement**: Daily active users
- **System Performance**: Response times
- **Error Rates**: Error tracking
- **Feature Usage**: Most used features

### Monitoring Tools
- **Firebase Analytics**: User behavior
- **Firebase Performance**: App performance
- **Error Reporting**: Crash tracking
- **Custom Dashboards**: Business metrics

## 🔄 Updates & Maintenance

### Regular Maintenance
- **Security Updates**: Keep dependencies updated
- **Performance Optimization**: Monitor and optimize
- **Feature Updates**: Add new functionality
- **Bug Fixes**: Address reported issues

### Version Control
- **Git Flow**: Feature branch workflow
- **Semantic Versioning**: Version numbering
- **Changelog**: Track changes
- **Release Notes**: Document updates

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Standards
- **TypeScript**: Strict type checking
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Conventional Commits**: Commit messages

## 📞 Support

### Documentation
- **API Documentation**: Firebase API reference
- **User Guide**: Step-by-step instructions
- **Developer Guide**: Technical documentation
- **FAQ**: Common questions

### Contact
- **Email**: support@vaqplus.com
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Community support

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Firebase Team**: For the excellent platform
- **Svelte Team**: For the amazing framework
- **Design Community**: For inspiration and best practices
- **Open Source Contributors**: For the tools and libraries

---

**Built with ❤️ for the VAQ+ team and the healthcare community**
