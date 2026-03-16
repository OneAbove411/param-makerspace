# Param Makerspace Portal

A modern, high-performance web application serving as the digital hub for the Param Makerspace. 

![Param Makerspace](/src/assets/hero.png)

### 🚀 Live Demo
**[param-ms.netlify.app](https://param-ms.netlify.app/)**

---

## 🛠 Tech Stack

This project is built with a modern frontend stack emphasizing performance, type safety, and a "brutalist" aesthetic:

- **Framework:** [React 18](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Routing:** [React Router v6](https://reactrouter.com/)
- **Animations:** [GSAP (GreenSock)](https://gsap.com/)
- **Backend/Auth/DB:** [Supabase](https://supabase.com/)
- **Deployment:** [Netlify](https://www.netlify.com/)

---

## 💻 Local Development

Follow these instructions to set up the project on your local machine.

### 1. Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` (comes with Node.js)
- Git

### 2. Clone the repository

```bash
git clone https://github.com/OneAbove411/param-makerspace.git
cd param-makerspace
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Environment Variables setup

This project uses Supabase for the backend Database and Authentication. You will need to link your own Supabase project.

1. **Copy the example file**
   ```bash
   cp .env.example .env
   ```

2. **Add your Supabase details**
   Open the newly created `.env` file and replace the placeholder values with your actual Supabase Project URL and Anon Key (found in your Supabase dashboard under Project Settings > API):

   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
   *Note: Never commit your `.env` file to version control. It is already included in the `.gitignore`.*

### 5. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`. Open this URL in your browser to view the app!

---

## 📦 Building for Production

To create a production-ready build:

```bash
npm run build
```

The built files will be located in the `dist` directory. You can preview the production build locally using:

```bash
npm run preview
```
