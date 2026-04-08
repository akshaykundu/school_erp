# Backend Setup

## MongoDB

This backend uses:

`mongodb://127.0.0.1:27017/school_erp`

Make sure your local MongoDB server is running before starting the backend.

## Install

```bash
cd backend
npm install
```

## Create the First Admin

Run this once to create the default admin account:

```bash
npm run seed:admin
```

Default first admin credentials:

- Name: `Akshay kundu`
- Email: `Akgame99977@gmail.com`
- Password: `Akshay@1234`

If the admin already exists, the script will skip creating another one.

## Start the Server

```bash
npm start
```

The backend will run on:

`http://localhost:5000`

## Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

## Login Flow

- Only the seeded first admin can log in initially.
- Admins can add other admins.
- Admin can add teachers.
- Only added teachers can log in.
- Teachers can add students.
- Only added students can log in.
