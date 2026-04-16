# LinkPass ⚡

> **10 Seconds from Phone to Projector.** > A zero-friction, open-source web tool designed to eliminate "login fatigue" during public presentations.

## 🎯 The Problem

Whether you are at a university lecture hall or a corporate meeting, getting your slides onto the podium computer is a painful process. You usually have to:
1. Log into your personal Gmail or WhatsApp on a public, untrusted computer.
2. Wait for 2FA (Two-Factor Authentication) on your phone.
3. Open the link, present, and pray you remember to log out.

## 💡 The Solution

**LinkPass** is a disposable, real-time portal. No accounts, no passwords, no traces left behind.

1. **Open** LinkPass on the podium computer and get a random 4-digit code.
2. **Enter** the code on your phone.
3. **Paste** your Canva, Google Slides, or PDF link.
4. **Present.** The link instantly launches on the big screen.

## ✨ Features

- **Zero Friction:** No user registration or login required.
- **Real-Time Sync:** Powered by WebSockets/Realtime DB for instantaneous link sharing.
- **Privacy First (Self-Destruct):** Rooms expire automatically after 60 minutes, or you can manually click "Destroy" to wipe the session immediately.
- **Cross-Platform:** Works purely in the browser. No app installation needed.
- **Smart Link Recognition:** Automatically detects URLs and provides a massive "One-Click Launch" button.

## 🛠 Tech Stack

Built with a modern, lightweight, and fast stack:
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)
- **Database & Realtime:** [Supabase](https://supabase.com/)
- **Deployment:** [Vercel](https://vercel.com/)

## 🚀 Quick Start (Local Development)

To run this project locally, you will need Node.js and a Supabase project.

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Bobu-is-now-afk/Linkpass.git](https://github.com/Bobu-is-now-afk/Linkpass.git)
   cd Linkpass

2. **Install dependencies:**
(Note: Use --legacy-peer-deps if you encounter React 19 / Framer Motion version conflicts)
   ```bash
   npm install

3. **Set up Environment Variables:**
Create a .env.local file in the root directory and add your Supabase credentials:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

4. **Run the development server:**
   ```bashnpm run dev
   Open http://localhost:3000 with your browser to see the result.

## 🤝 Philosophy & Contributing

LinkPass was built to solve a genuine, everyday annoyance in academic and professional environments. It is proudly non-profit and open-source.

Feel free to open issues or submit pull requests. Whether it is optimizing the UI, adding file support, or improving the auto-destruct logic, all contributions are welcome!

## 📜 License

MIT License - Free to use, modify, and distribute.
