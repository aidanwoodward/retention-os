import { redirect } from "next/navigation";

export default function Home() {
  // Local dev lands on the command centre; production shows the starter until login flows run.
  if (process.env.NODE_ENV === "development") {
    redirect("/dashboard");
  }
  
  return (
    <main className="min-h-screen grid place-items-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-emerald-600 mb-4">
          Retention OS
        </h1>
        <p className="text-gray-600 text-lg">
          Tailwind is working 🎉
        </p>
        <button className="mt-6 rounded-xl bg-black px-5 py-3 text-white hover:opacity-90">
          Continue
        </button>
      </div>
    </main>
  );
}
