# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Teacher-only signup and unregister actions
- Teacher accounts stored locally as password hashes

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc
   - Activities page: http://localhost:8000/

4. Create a teacher account in another terminal:

   ```
   cd src
   python create_teacher.py
   ```

   The command prompts for a username and password and writes a PBKDF2 password
   hash to `src/teachers.json`. This file is ignored by Git and should be
   provisioned separately on each deployment.

5. For deployments, set a stable `SESSION_SECRET` (for example, generate one
   with `python -c "import secrets; print(secrets.token_urlsafe(32))"`) and set
   `COOKIE_SECURE=true` when serving the app over HTTPS. Sessions expire after
   eight hours. Without `SESSION_SECRET`, sessions use a random key and will be
   invalidated whenever the app restarts.

## API Endpoints

| Method | Endpoint                                                             | Description                                                         |
| ------ | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/activities`                                                        | Get all activities with their details and current participant count |
| GET    | `/auth/me`                                                           | Check whether a teacher is logged in                                |
| POST   | `/auth/login`                                                        | Log in with a teacher username and password                          |
| POST   | `/auth/logout`                                                       | Log out the current teacher                                          |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu`    | Sign up a student (teacher login required)                           |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Unregister a student (teacher login required)                     |

Activities and participant lists remain publicly viewable. Signup and
unregister are protected by the API, not only hidden in the page for guests.

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

All data is stored in memory, which means data will be reset when the server restarts.
