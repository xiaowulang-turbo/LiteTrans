import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { Download } from "@/components/download";
import { Footer } from "@/components/footer";
import { getLatestRelease } from "@/lib/github";
import { getLocale, getTranslations } from "@/lib/locale";

export default async function Home() {
  const downloadInfo = await getLatestRelease();
  const locale = getLocale();
  const t = getTranslations(locale);

  return (
    <main className="relative">
      <Navbar t={t} />
      <Hero downloadInfo={downloadInfo} t={t} />
      <section id="features">
        <Features t={t} />
      </section>
      <section id="download">
        <Download downloadInfo={downloadInfo} t={t} />
      </section>
      <Footer t={t} />
    </main>
  );
}
