BLISS ACADEMY

Digital Education, Admissions & Student Management Platform

Project: BLISS Academy
Repository: "gcvdesignsecure/bliss-academy"
Live Website: https://bliss-academy.netlify.app/
Backend: Supabase
Frontend Framework: React + TypeScript + Vite
Hosting: Netlify
Official Contact Email: contactblissacademy@gmail.com
Project Status: Active Development

---

1. Project Overview

BLISS Academy is a web-based educational management platform designed to manage student applications, admissions, identity verification, academic administration, student records, and communication between students and administrators.

The platform aims to provide a central digital environment where applicants can register, submit admission applications, verify their contact information, and eventually access their academic services.

Administrators will have a dedicated dashboard for reviewing applications, managing verification requests, overseeing students, and controlling institutional activities.

BLISS Academy is designed to be scalable, secure, responsive, and accessible across mobile phones, tablets, and desktop computers.

2. Main Objectives

The objectives of BLISS Academy include:

1. Digitize the admission and application process.
2. Provide secure student and administrator authentication.
3. Maintain organized student records.
4. Support email and WhatsApp contact verification.
5. Provide administrators with admission-management tools.
6. Create a central communication system.
7. Support future academic management features.
8. Maintain proper authorization and accountability for administrative actions.

3. Technology Stack

Component| Technology
Frontend| React
Programming language| TypeScript
Build tool| Vite
Routing| React Router
Backend| Supabase
Database| PostgreSQL
Authentication| Supabase Auth and custom login functions
Server-side logic| Supabase Edge Functions
Hosting| Netlify
Source control| GitHub
Email delivery| Gmail SMTP
Email account| contactblissacademy@gmail.com
Styling| CSS

Architecture

The application uses a frontend/backend architecture.

- React provides the user interface.
- Supabase handles authentication, database operations, and server-side functions.
- PostgreSQL stores application and academic records.
- Edge Functions handle sensitive operations.
- Gmail is intended to deliver automated verification codes.
- Netlify hosts the production website.
- GitHub stores the source code and project history.

4. User Roles and Access Control

BLISS Academy is designed around different user categories.

Applicant

An applicant can:

- Create an account.
- Provide their full legal name.
- Register an email address.
- Provide a WhatsApp number.
- Select their country.
- Log in.
- Submit an admission application.
- Request email verification.
- Request WhatsApp verification.
- View application status.
- Receive admission-related notifications.

Student

A student will eventually be able to:

- Access a student dashboard.
- View their profile.
- Access enrolled courses.
- View academic information.
- Check payment records.
- Receive institutional announcements.
- Access learning resources.

Teacher

A teacher will eventually be able to:

- Access assigned courses.
- View enrolled students.
- Manage learning materials.
- Record student performance.
- Submit academic reports.
- Communicate with authorized students and administrators.

Administrator

Administrators will manage authorized institutional operations, including:

- Reviewing admission applications.
- Processing contact-verification requests.
- Managing student records.
- Managing teacher records.
- Sending institutional notifications.
- Reviewing administrative messages.
- Monitoring application activities.

Superadministrator

The Superadministrator has the highest administrative privileges.

Responsibilities include:

- Managing administrator accounts.
- Assigning administrative permissions.
- Overseeing institutional settings.
- Managing authorized integrations.
- Reviewing audit logs.
- Supervising administrative activities.

All privileged operations must be protected by server-side authorization.

5. Account Registration and Authentication

Applicants must provide the following information during registration:

- Full legal name.
- Email address.
- WhatsApp number.
- Country.
- Password.

Important registration policy:

Email and WhatsApp are compulsory registration fields, but neither contact method must be verified during initial registration.

Applicants should be able to create their accounts without completing OTP verification first.

Contact verification becomes available after account registration and login.

The application must distinguish between an account being registered and a contact method being verified.

Administrator Login

The planned initial administrator accounts are:

Administrator number| Registered name
100| BLISS
101| VIX
102| MKS

Administrator names must be matched without case sensitivity or accidental surrounding whitespace.

For example, "VIX", "Vix", and "vix" should be treated as the same registered name.

Initial administrator enrollment must be protected by a secure one-time setup mechanism.

Additional administrator accounts should be created only by an authorized Superadministrator.

6. Contact Verification System

The contact verification system is a major feature of BLISS Academy.

It supports two verification channels:

1. Email verification.
2. WhatsApp verification.

Verification must happen after registration, when an applicant is logged in and requests it.

6.1 Email Verification

Official sending account:

contactblissacademy@gmail.com

Expected workflow:

1. Applicant logs into BLISS Academy.
2. Applicant opens the contact verification section.
3. Applicant selects email verification.
4. The backend generates a secure one-time verification code.
5. The backend stores a hashed version of the code.
6. Gmail automatically sends the code to the applicant's registered email address.
7. Applicant enters the code into the website.
8. The backend validates the code.
9. The system marks the email as verified.

The system must enforce:

- OTP expiration.
- One-time code usage.
- Maximum verification attempts.
- Request rate limits.
- Secure code storage.
- Resending restrictions.
- Audit logging.

The frontend must never generate or validate OTPs independently.

6.2 WhatsApp Verification

WhatsApp verification will initially use administrator-assisted delivery.

Expected workflow:

1. Applicant logs in.
2. Applicant selects WhatsApp verification.
3. Applicant requests verification of their registered WhatsApp number.
4. The request appears in the administrator dashboard under Messages or Contact Verification Requests.
5. An authorized administrator reviews the request.
6. The administrator generates or authorizes a verification code through the secure system.
7. The administrator sends the code to the applicant through WhatsApp.
8. The applicant enters the code in BLISS Academy.
9. The backend validates the code.
10. The system marks the WhatsApp number as verified.

WhatsApp delivery is not automatically integrated at this stage.

A future WhatsApp Business API integration may be considered.

6.3 Verification Security

The verification system must:

- Associate each request with its authenticated user.
- Verify only the contact information registered to that account.
- Prevent users from verifying another person's contact information.
- Store OTP hashes rather than plaintext codes.
- Expire codes after a defined period.
- Prevent reuse of previously successful codes.
- Restrict repeated requests and incorrect attempts.
- Record important verification events.
- Restrict administrative actions to authorized administrators.

7. Admission Management

The admission system allows applicants to submit applications and administrators to process them.

Applicant Workflow

1. Create an account.
2. Log in.
3. Complete the required admission information.
4. Submit the application.
5. View the application status.
6. Receive notifications about admission decisions.

Admission Statuses

Status| Meaning
Submitted| Application has been received.
KYC Pending| Identity verification is pending.
Under Review| Application is being reviewed.
Approved| Application has been approved.
Rejected| Application has been rejected.

Administrators must be able to review applications and record decisions.

Admission decisions should include the responsible administrator and relevant timestamps.

8. Administrator Dashboard

The administrator dashboard is intended to provide a central control panel.

Planned sections include:

Overview

- Total applicants.
- Total students.
- Pending admissions.
- Approved admissions.
- Rejected admissions.
- Pending verification requests.

Admissions

- View applications.
- Review applicant information.
- Approve applications.
- Reject applications.
- Update admission status.

Messages

- View contact-verification requests.
- Review email and WhatsApp requests.
- Process WhatsApp verification.
- Manage applicant communication.
- Review request status.

Students

- View student records.
- Search students.
- Review student profiles.
- Manage student information.

Teachers

- View teacher accounts.
- Manage teaching assignments.
- Monitor assigned courses.

Administrators

- Manage authorized administrator accounts.
- Assign administrative privileges.
- Manage Superadministrator-controlled access.

Settings

- Manage institutional settings.
- Configure authorized integrations.
- Manage notification settings.

Audit Logs

- Review important administrative actions.
- Monitor changes to admission records.
- Track verification activity.
- Support accountability and security investigations.

9. Database Structure

The project uses Supabase PostgreSQL.

The existing database includes the following tables:

Table| Purpose
profiles| User profiles and account roles
students| Student-specific records
admins| Administrator accounts
admissions| Admission applications
identity_verifications| Identity verification records
contact_verification_requests| Email and WhatsApp verification requests
courses| Course information
course_teachers| Teacher-course assignments
enrolments| Student course enrolments
payments| Payment records
audit_logs| Administrative activity records
login_attempts| Login attempt tracking
integrations| External service configurations

Important Database Rules

- Every authenticated user must have an appropriate profile.
- User-owned records must be protected by Row Level Security.
- Applicants must only access their own private records.
- Administrators must only access operations authorized by their role.
- Superadministrator privileges must be enforced server-side.
- Sensitive verification information must not be exposed through public queries.

Database migrations must be version-controlled in the repository.

10. Security Architecture

Security is a fundamental requirement.

The following controls are expected:

Authentication

- Secure password handling.
- Authenticated sessions.
- Session expiration and refresh.
- Protection against unauthorized access.

Authorization

- Role-based access control.
- Row Level Security.
- Server-side permission checks.
- Restricted administrative operations.

Data Protection

- Never expose service-role keys in frontend code.
- Never commit passwords, API keys, SMTP credentials, or private tokens to GitHub.
- Store secrets in Supabase Edge Function secrets.
- Use HTTPS for production.
- Avoid storing unnecessary sensitive personal information.

Auditability

- Log important administrative actions.
- Record admission decisions.
- Record verification outcomes.
- Monitor repeated failed login attempts.

Identity Verification

Any future NIN, BVN, government-issued ID, or liveness verification integration must use a legitimate authorized provider.

Sensitive identity data must be collected only when necessary, protected appropriately, and retained only for the legally required period.

11. Email Configuration

The official BLISS Academy email is:

contactblissacademy@gmail.com

The planned email delivery mechanism is Gmail SMTP using a Google App Password.

Required configuration:

- Gmail account.
- Google 2-Step Verification.
- Gmail App Password.
- SMTP configuration.
- Supabase Edge Function secrets.

The App Password must never be committed to GitHub or embedded in React source code.

Suggested server-side secret names:

Secret| Purpose
SMTP_HOST| Gmail SMTP hostname
SMTP_PORT| SMTP connection port
SMTP_USER| Official Gmail address
SMTP_APP_PASSWORD| Google-generated App Password
MAIL_FROM_NAME| BLISS Academy

The email system should support:

- Verification codes.
- Admission notifications.
- Account alerts.
- Important institutional messages.

Gmail SMTP configuration and delivery must be tested before enabling production verification.

12. Frontend Project Structure

The frontend is organized into feature-based directories.

Expected major areas:

bliss-academy/
│
├── public/
│
├── src/
│   ├── app/
│   │   └── App.tsx
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── admission/
│   │   ├── admin/
│   │   ├── student/
│   │   └── verification/
│   │
│   ├── lib/
│   │   ├── auth.tsx
│   │   └── supabase.ts
│   │
│   ├── styles/
│   │
│   └── main.tsx
│
├── supabase/
│   ├── functions/
│   └── migrations/
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── netlify.toml
└── README.md

This is the intended organizational structure. Actual files should be checked against the repository before adding or moving directories.

13. Deployment

The application is hosted on Netlify.

Production website:

https://bliss-academy.netlify.app/

GitHub repository:

https://github.com/gcvdesignsecure/bliss-academy

Build Configuration

The Netlify build configuration is expected to use:

[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

Deployment Process

1. Make changes in the GitHub repository.
2. Review the changes.
3. Commit and push updates.
4. Allow Netlify to build the project.
5. Confirm that the build succeeds.
6. Test the deployed website.
7. Check browser console errors.
8. Confirm that backend integrations work.

The production site must serve the built Vite output rather than raw source files.

14. Environment Variables

Frontend environment variables:

VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY

These values must be configured in Netlify.

Never put the Supabase service-role key in frontend environment variables.

Email credentials belong exclusively in secure backend configuration.

15. Current Development Priorities

The development roadmap is divided into phases.

Phase 1 — Core Platform

- [x] React and Vite project foundation.
- [x] Supabase project connection.
- [x] Basic authentication implementation.
- [x] Initial applicant registration interface.
- [x] Initial admission submission workflow.
- [x] Database tables and initial security policies.
- [x] Netlify build configuration.
- [ ] Confirm production deployment serves the restored application.

Phase 2 — Contact Verification

- [ ] Connect contactblissacademy@gmail.com.
- [ ] Configure Gmail SMTP.
- [ ] Add secure email OTP generation.
- [ ] Add email OTP delivery.
- [ ] Add email OTP validation.
- [ ] Implement WhatsApp verification requests.
- [ ] Build administrator verification controls.
- [ ] Add verification rate limits and audit logs.

Phase 3 — Administrator System

- [ ] Complete initial administrator enrollment.
- [ ] Finalize administrator authentication.
- [ ] Build administrator dashboard.
- [ ] Complete admissions management.
- [ ] Build Messages and verification management.
- [ ] Add administrator management.
- [ ] Add audit-log interface.

Phase 4 — Student Management

- [ ] Complete student dashboard.
- [ ] Implement student records.
- [ ] Implement course enrolment.
- [ ] Add academic notifications.
- [ ] Add student profile management.

Phase 5 — Academic Management

- [ ] Teacher dashboard.
- [ ] Course management.
- [ ] Student performance management.
- [ ] Monthly performance reports.
- [ ] Learning resources.
- [ ] Academic announcements.

Phase 6 — Payments and Integrations

- [ ] Payment integration.
- [ ] Payment history.
- [ ] Institutional financial reports.
- [ ] Authorized identity verification integration.
- [ ] Optional WhatsApp Business API integration.

Phase 7 — Production Readiness

- [ ] Full security review.
- [ ] Database policy review.
- [ ] Mobile responsiveness testing.
- [ ] Accessibility testing.
- [ ] Error handling.
- [ ] Backup and recovery planning.
- [ ] Performance optimization.
- [ ] Production acceptance testing.

16. Development Rules

All contributors must follow these rules:

1. Do not expose private credentials.
2. Do not disable Row Level Security to make a feature work.
3. Do not bypass authentication or authorization.
4. Do not generate verification codes in frontend JavaScript.
5. Do not allow applicants to modify another applicant's information.
6. Do not approve admissions without authorized administrative access.
7. Do not overwrite existing database migrations.
8. Do not remove existing features without approval.
9. Keep frontend and backend responsibilities separate.
10. Test changes before production deployment.
11. Preserve existing working application functionality.
12. Document new database migrations and Edge Functions.

17. Development Environment

The project can be developed using:

- GitHub.
- SPCK Editor on Android.
- Termux where command-line tools are needed.
- Supabase Dashboard.
- Netlify Dashboard.

The project should remain compatible with standard Node.js development environments.

Install dependencies:

npm install

Run the development server:

npm run dev

Build for production:

npm run build

Preview the production build:

npm run preview

18. Project Ownership and Maintenance

Project name: BLISS Academy

Repository owner: gcvdesignsecure

The repository is the central source of truth for frontend and backend code.

All database changes, deployment changes, and external service configurations should be documented.

Production secrets must be stored separately from source code.

19. Final Project Vision

BLISS Academy is intended to become a complete digital education management platform.

The long-term vision is to bring admissions, contact verification, student records, academic management, teacher administration, payments, and institutional communication into one secure and accessible system.

The platform should be reliable enough for daily institutional use and flexible enough to support future expansion.

---

BLISS Academy
Building a smarter, more connected learning environment.

Official Email: contactblissacademy@gmail.com
Website: https://bliss-academy.netlify.app/
GitHub: https://github.com/gcvdesignsecure/bliss-academy