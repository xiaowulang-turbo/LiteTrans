import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { Download } from "@/components/download";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <section id="features">
        <Features />
      </section>
      <section id="download">
        <Download />
      </section>
      <Footer />
    </main>
  );
}
