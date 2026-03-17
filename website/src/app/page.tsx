import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { Download } from "@/components/download";
import { Footer } from "@/components/footer";
import { getLatestRelease } from "@/lib/github";

export default async function Home() {
  const downloadInfo = await getLatestRelease();

  return (
    <main className="relative">
      <Navbar />
      <Hero downloadInfo={downloadInfo} />
      <section id="features">
        <Features />
      </section>
      <section id="download">
        <Download downloadInfo={downloadInfo} />
      </section>
      <Footer />
    </main>
  );
}
